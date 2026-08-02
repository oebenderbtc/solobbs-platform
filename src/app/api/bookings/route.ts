import { requireKycApproved } from "@/lib/kyc";
import { isKycEnforced } from "@/lib/sumsub";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyModelWhatsApp } from "@/lib/whatsapp";

const schema = z.object({
  modelCode: z.string().min(2),
  title: z.string().min(3).max(80),
  amount: z.number().positive(),
  city: z.string().optional(),
  paymentMethod: z.enum(["CARD", "CRYPTO"]),
  notes: z.string().max(300).optional(),
  scheduledAt: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.user.role !== "CLIENT") {
    return NextResponse.json(
      { error: "Solo clientes pueden solicitar una cita" },
      { status: 403 },
    );
  }

  const kycBlock = await requireKycApproved(session.user.id);
  if (kycBlock) return kycBlock;

  try {
    const body = schema.parse(await req.json());
    const model = await prisma.user.findFirst({
      where: {
        referralCode: body.modelCode.toUpperCase(),
        role: "MODEL",
        isActive: true,
        galleryPublic: true,
      },
    });

    if (!model) {
      return NextResponse.json({ error: "Modelo no disponible" }, { status: 404 });
    }

    if (
      isKycEnforced() &&
      model.kycStatus !== "APPROVED" &&
      !model.isVerified
    ) {
      return NextResponse.json(
        {
          error: "Esta modelo aún no ha completado la verificación de identidad",
          code: "MODEL_KYC_REQUIRED",
        },
        { status: 403 },
      );
    }

    const settings = await prisma.platformSettings.findUnique({
      where: { id: "default" },
    });
    const minAmount = settings?.minEscrowAmount ?? 50;
    if (body.amount < minAmount) {
      return NextResponse.json(
        { error: `Monto mínimo ${minAmount} USDT` },
        { status: 400 },
      );
    }

    const job = await prisma.job.create({
      data: {
        title: body.title,
        description: body.notes,
        amount: body.amount,
        city: body.city || model.city || undefined,
        status: "SCHEDULED",
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        modelId: model.id,
        clientId: session.user.id,
      },
    });

    const escrow = await prisma.escrow.create({
      data: {
        amount: body.amount,
        status: "PENDING",
        paymentMethod: body.paymentMethod,
        jobId: job.id,
        modelId: model.id,
        clientId: session.user.id,
        notes: body.notes || "Solicitud desde galería pública",
      },
      include: { job: true, model: { select: { name: true, referralCode: true } } },
    });

    await prisma.notification.create({
      data: {
        userId: model.id,
        title: "Nueva solicitud de cita",
        body: `${session.user.name} propone “${body.title}” por ${body.amount.toLocaleString("es-CO")} COP.`,
        link: "/dashboard/messages",
      },
    });

    // Ensure inquiry thread exists
    let inquiry = await prisma.inquiry.findUnique({
      where: {
        modelId_clientId: { modelId: model.id, clientId: session.user.id },
      },
    });
    if (!inquiry) {
      inquiry = await prisma.inquiry.create({
        data: {
          modelId: model.id,
          clientId: session.user.id,
          subject: `Cita: ${body.title}`,
        },
      });
    }
    await prisma.inquiryMessage.create({
      data: {
        inquiryId: inquiry.id,
        senderId: session.user.id,
        body: `Quiero reservar “${body.title}” por ${body.amount.toLocaleString("es-CO")} COP (${body.paymentMethod}).`,
      },
    });

    // Also notify about the chat message created with the booking
    await prisma.notification.create({
      data: {
        userId: model.id,
        title: "Nuevo mensaje",
        body: `${session.user.name} envió detalles de la reserva propuesta.`,
        link: "/dashboard/messages",
      },
    });

    void notifyModelWhatsApp({
      modelWhatsapp: model.whatsapp || model.phone,
      enabled: model.whatsappNotify,
      clientName: session.user.name || "Cliente",
      preview: `Quiere reservar “${body.title}”`,
    });

    return NextResponse.json({ escrow, inquiryId: inquiry.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "No se pudo crear la solicitud" }, { status: 500 });
  }
}
