import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyModelWhatsApp } from "@/lib/whatsapp";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const inquiry = await prisma.inquiry.findUnique({
      where: { id },
      include: {
        model: { select: { id: true, name: true, referralCode: true, avatarUrl: true } },
        client: { select: { id: true, name: true, avatarUrl: true } },
        messages: {
          include: {
            sender: { select: { id: true, name: true, role: true } },
            escrow: {
              include: {
                sellerPaymentMethod: true,
                job: { select: { id: true, title: true } },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!inquiry) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    const allowed =
      session.user.role === "ADMIN" ||
      inquiry.modelId === session.user.id ||
      inquiry.clientId === session.user.id;

    if (!allowed) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    return NextResponse.json({ inquiry });
  }

  const where =
    session.user.role === "ADMIN"
      ? {}
      : session.user.role === "MODEL"
        ? { modelId: session.user.id }
        : { clientId: session.user.id };

  const inquiries = await prisma.inquiry.findMany({
    where,
    include: {
      model: { select: { id: true, name: true, referralCode: true, avatarUrl: true } },
      client: { select: { id: true, name: true, avatarUrl: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ inquiries });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = z
    .object({
      modelCode: z.string().min(2).optional(),
      modelId: z.string().optional(),
      inquiryId: z.string().optional(),
      body: z.string().min(1).max(1000),
      subject: z.string().max(120).optional(),
    })
    .parse(await req.json());

  // Reply to existing thread
  if (body.inquiryId) {
    const inquiry = await prisma.inquiry.findUnique({ where: { id: body.inquiryId } });
    if (!inquiry) {
      return NextResponse.json({ error: "Chat no encontrado" }, { status: 404 });
    }
    const allowed =
      inquiry.modelId === session.user.id || inquiry.clientId === session.user.id;
    if (!allowed) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const message = await prisma.inquiryMessage.create({
      data: {
        inquiryId: inquiry.id,
        senderId: session.user.id,
        body: body.body.trim(),
      },
    });

    await prisma.inquiry.update({
      where: { id: inquiry.id },
      data: { updatedAt: new Date(), status: "OPEN" },
    });

    const recipientId =
      session.user.id === inquiry.modelId ? inquiry.clientId : inquiry.modelId;

    await prisma.notification.create({
      data: {
        userId: recipientId,
        title: "Nuevo mensaje",
        body: `${session.user.name}: ${body.body.trim().slice(0, 80)}`,
        link: "/dashboard/messages",
      },
    });

    // Cliente → modelo: aviso WhatsApp
    if (session.user.id === inquiry.clientId) {
      const model = await prisma.user.findUnique({
        where: { id: inquiry.modelId },
        select: { whatsapp: true, phone: true, whatsappNotify: true },
      });
      void notifyModelWhatsApp({
        modelWhatsapp: model?.whatsapp || model?.phone,
        enabled: model?.whatsappNotify,
        clientName: session.user.name || "Cliente",
        preview: body.body.trim(),
      });
    }

    return NextResponse.json({ message, inquiryId: inquiry.id });
  }

  // Start new inquiry (client → model)
  if (session.user.role !== "CLIENT" && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Solo clientes pueden iniciar el contacto" },
      { status: 403 },
    );
  }

  const model = body.modelId
    ? await prisma.user.findFirst({
        where: { id: body.modelId, role: "MODEL", isActive: true },
      })
    : await prisma.user.findFirst({
        where: {
          referralCode: (body.modelCode || "").toUpperCase(),
          role: "MODEL",
          isActive: true,
        },
      });

  if (!model) {
    return NextResponse.json({ error: "Modelo no encontrada" }, { status: 404 });
  }

  if (!model.galleryPublic) {
    return NextResponse.json({ error: "Esta galería no está pública" }, { status: 403 });
  }

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
        subject: body.subject || `Consulta con ${model.name}`,
      },
    });
  }

  const message = await prisma.inquiryMessage.create({
    data: {
      inquiryId: inquiry.id,
      senderId: session.user.id,
      body: body.body.trim(),
    },
  });

  await prisma.inquiry.update({
    where: { id: inquiry.id },
    data: { updatedAt: new Date() },
  });

  await prisma.notification.create({
    data: {
      userId: model.id,
      title: "Nuevo cliente interesado",
      body: `${session.user.name} te escribió desde tu galería.`,
      link: "/dashboard/messages",
    },
  });

  void notifyModelWhatsApp({
    modelWhatsapp: model.whatsapp || model.phone,
    enabled: model.whatsappNotify,
    clientName: session.user.name || "Cliente",
    preview: body.body.trim(),
  });

  return NextResponse.json({ inquiryId: inquiry.id, message });
}
