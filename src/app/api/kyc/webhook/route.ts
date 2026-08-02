import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  mapSumsubReviewToStatus,
  verifySumsubWebhookSignature,
} from "@/lib/sumsub";

/**
 * Sumsub webhook receiver.
 * Configure in Sumsub Dashboard → Dev space → Webhooks:
 *   URL: https://YOUR_DOMAIN/api/kyc/webhook
 *   Events: applicantCreated, applicantPending, applicantReviewed, applicantOnHold
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const digest = req.headers.get("x-payload-digest");
  const alg = req.headers.get("x-payload-digest-alg");

  if (!verifySumsubWebhookSignature(rawBody, digest, alg)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  let payload: {
    type?: string;
    applicantId?: string;
    externalUserId?: string;
    reviewStatus?: string;
    reviewResult?: {
      reviewAnswer?: string;
      reviewRejectType?: string;
      rejectLabels?: string[];
    };
    levelName?: string;
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const externalUserId = payload.externalUserId?.trim();
  if (!externalUserId) {
    return NextResponse.json({ ok: true, skipped: "no externalUserId" });
  }

  const user = await prisma.user.findUnique({
    where: { id: externalUserId },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ ok: true, skipped: "user not found" });
  }

  const status = mapSumsubReviewToStatus(payload);
  const labels = payload.reviewResult?.rejectLabels?.join(",") || "";

  await prisma.user.update({
    where: { id: user.id },
    data: {
      kycStatus: status,
      kycApplicantId: payload.applicantId || undefined,
      kycLevel: payload.levelName || undefined,
      kycReviewedAt: status === "APPROVED" || status === "REJECTED" ? new Date() : undefined,
      kycRejectLabels: labels,
      isVerified: status === "APPROVED",
    },
  });

  if (status === "APPROVED") {
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: "Identidad verificada",
        body: "Tu verificación KYC fue aprobada. Ya puedes usar pagos y servicios.",
        link: "/dashboard/kyc",
      },
    });
  } else if (status === "REJECTED" || status === "RESUBMISSION") {
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: "Verificación pendiente",
        body:
          status === "RESUBMISSION"
            ? "Sumsub pide que vuelvas a enviar documentos. Abre Verificación KYC."
            : "Tu verificación fue rechazada. Revisa el detalle en Verificación KYC.",
        link: "/dashboard/kyc",
      },
    });
  }

  return NextResponse.json({ ok: true, status });
}
