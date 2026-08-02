import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isKycEnforced, isSumsubConfigured, sumsubApplicantDashboardUrl } from "@/lib/sumsub";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: {
      kycStatus: true,
      kycApplicantId: true,
      kycLevel: true,
      kycReviewedAt: true,
      kycRejectLabels: true,
      isVerified: true,
      role: true,
    },
  });

  return NextResponse.json({
    configured: isSumsubConfigured(),
    enforced: isKycEnforced(),
    kyc: {
      ...user,
      dashboardUrl:
        session.user.role === "ADMIN" && user.kycApplicantId
          ? sumsubApplicantDashboardUrl(user.kycApplicantId)
          : null,
    },
  });
}
