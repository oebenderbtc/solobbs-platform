import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyModelWhatsApp } from "@/lib/whatsapp";
import {
  classifyChatFile,
  deleteChatUpload,
  saveChatUpload,
} from "@/lib/chat-media";

function redactMessage(
  message: {
    id: string;
    body: string;
    type: string;
    mediaUrl: string | null;
    mediaName: string | null;
    mediaMime: string | null;
    viewOnce: boolean;
    viewedAt: Date | null;
    readAt: Date | null;
    senderId: string;
    createdAt: Date;
    sender?: { id: string; name: string; role: string };
    escrow?: unknown;
  },
  viewerId: string,
) {
  const isSender = message.senderId === viewerId;
  const viewOnceSpent = Boolean(message.viewOnce && message.viewedAt);

  if (message.viewOnce && viewOnceSpent) {
    return {
      ...message,
      mediaUrl: null,
      body: isSender ? "Foto de una vista · abierta" : "Abierto",
      mediaConsumed: true,
    };
  }

  if (message.viewOnce && !isSender && !viewOnceSpent) {
    // Recipient sees locked preview until they open it
    return {
      ...message,
      mediaUrl: null,
      lockedViewOnce: true,
      body: message.body || "Foto de una vista",
    };
  }

  return {
    ...message,
    mediaConsumed: false,
    lockedViewOnce: false,
  };
}

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
        model: {
          select: { id: true, name: true, referralCode: true, avatarUrl: true },
        },
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

    // Mark peer messages as read when opening the thread
    await prisma.inquiryMessage.updateMany({
      where: {
        inquiryId: inquiry.id,
        senderId: { not: session.user.id },
        readAt: null,
        type: { not: "P2P" },
      },
      data: { readAt: new Date() },
    });

    const refreshed = await prisma.inquiryMessage.findMany({
      where: { inquiryId: inquiry.id },
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
    });

    return NextResponse.json({
      inquiry: {
        ...inquiry,
        messages: refreshed.map((m) => redactMessage(m, session.user.id)),
      },
    });
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
      model: {
        select: { id: true, name: true, referralCode: true, avatarUrl: true },
      },
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

async function createChatMessage(opts: {
  inquiryId: string;
  senderId: string;
  senderName: string;
  body: string;
  type?: string;
  mediaUrl?: string | null;
  mediaName?: string | null;
  mediaMime?: string | null;
  viewOnce?: boolean;
}) {
  const inquiry = await prisma.inquiry.findUnique({
    where: { id: opts.inquiryId },
  });
  if (!inquiry) return { error: "Chat no encontrado", status: 404 as const };
  const allowed =
    inquiry.modelId === opts.senderId || inquiry.clientId === opts.senderId;
  if (!allowed) return { error: "Sin permiso", status: 403 as const };

  const message = await prisma.inquiryMessage.create({
    data: {
      inquiryId: inquiry.id,
      senderId: opts.senderId,
      body: opts.body,
      type: opts.type || "TEXT",
      mediaUrl: opts.mediaUrl || null,
      mediaName: opts.mediaName || null,
      mediaMime: opts.mediaMime || null,
      viewOnce: Boolean(opts.viewOnce),
    },
  });

  await prisma.inquiry.update({
    where: { id: inquiry.id },
    data: { updatedAt: new Date(), status: "OPEN" },
  });

  const recipientId =
    opts.senderId === inquiry.modelId ? inquiry.clientId : inquiry.modelId;

  const preview =
    opts.type === "IMAGE"
      ? "📷 Foto"
      : opts.type === "AUDIO"
        ? "🎤 Audio"
        : opts.type === "VIDEO"
          ? "🎬 Video"
          : opts.type === "FILE"
            ? `📎 ${opts.mediaName || "Archivo"}`
            : opts.body.slice(0, 80);

  await prisma.notification.create({
    data: {
      userId: recipientId,
      title: "Nuevo mensaje",
      body: `${opts.senderName}: ${preview}`,
      link: "/dashboard/messages",
    },
  });

  if (opts.senderId === inquiry.clientId) {
    const model = await prisma.user.findUnique({
      where: { id: inquiry.modelId },
      select: { whatsapp: true, phone: true, whatsappNotify: true },
    });
    void notifyModelWhatsApp({
      modelWhatsapp: model?.whatsapp || model?.phone,
      enabled: model?.whatsappNotify,
      clientName: opts.senderName || "Cliente",
      preview,
    });
  }

  return { message, inquiryId: inquiry.id };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") || "";

  // Multipart media message
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const inquiryId = String(form.get("inquiryId") || "");
    const caption = String(form.get("body") || "").trim().slice(0, 1000);
    const viewOnce = String(form.get("viewOnce") || "") === "1";
    const file = form.get("file");

    if (!inquiryId) {
      return NextResponse.json({ error: "Chat requerido" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }

    const classified = classifyChatFile(file);
    if (!classified) {
      return NextResponse.json({ error: "Archivo no soportado" }, { status: 400 });
    }
    if (file.size > classified.maxBytes) {
      return NextResponse.json(
        { error: `Archivo demasiado grande (máx ${Math.round(classified.maxBytes / 1024 / 1024)}MB)` },
        { status: 400 },
      );
    }
    if (viewOnce && classified.kind !== "IMAGE") {
      return NextResponse.json(
        { error: "Solo fotos pueden ser de una vista" },
        { status: 400 },
      );
    }

    let mediaUrl: string;
    try {
      mediaUrl = await saveChatUpload(
        session.user.id,
        inquiryId,
        file,
        classified.kind,
        classified.ext,
      );
    } catch (err) {
      console.error("chat upload", err);
      return NextResponse.json(
        { error: "No se pudo guardar el archivo" },
        { status: 500 },
      );
    }

    const defaultBody =
      classified.kind === "IMAGE"
        ? viewOnce
          ? "Foto de una vista"
          : "Foto"
        : classified.kind === "AUDIO"
          ? "Audio"
          : classified.kind === "VIDEO"
            ? "Video"
            : file.name || "Archivo";

    const result = await createChatMessage({
      inquiryId,
      senderId: session.user.id,
      senderName: session.user.name || "Usuario",
      body: caption || defaultBody,
      type: classified.kind,
      mediaUrl,
      mediaName: file.name || defaultBody,
      mediaMime: file.type || null,
      viewOnce,
    });

    if ("error" in result) {
      await deleteChatUpload(mediaUrl);
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result);
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
    const result = await createChatMessage({
      inquiryId: body.inquiryId,
      senderId: session.user.id,
      senderName: session.user.name || "Usuario",
      body: body.body.trim(),
      type: "TEXT",
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result);
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
    return NextResponse.json(
      { error: "Esta galería no está pública" },
      { status: 403 },
    );
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

  const result = await createChatMessage({
    inquiryId: inquiry.id,
    senderId: session.user.id,
    senderName: session.user.name || "Cliente",
    body: body.body.trim(),
    type: "TEXT",
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = z
    .object({
      action: z.enum(["read", "viewOnce"]),
      inquiryId: z.string().optional(),
      messageId: z.string().optional(),
    })
    .parse(await req.json());

  if (body.action === "read") {
    if (!body.inquiryId) {
      return NextResponse.json({ error: "Chat requerido" }, { status: 400 });
    }
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: body.inquiryId },
    });
    if (!inquiry) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    const allowed =
      inquiry.modelId === session.user.id ||
      inquiry.clientId === session.user.id;
    if (!allowed) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const result = await prisma.inquiryMessage.updateMany({
      where: {
        inquiryId: inquiry.id,
        senderId: { not: session.user.id },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ updated: result.count });
  }

  // Consume view-once photo
  if (!body.messageId) {
    return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 });
  }

  const message = await prisma.inquiryMessage.findUnique({
    where: { id: body.messageId },
    include: { inquiry: true },
  });
  if (!message) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const allowed =
    message.inquiry.modelId === session.user.id ||
    message.inquiry.clientId === session.user.id;
  if (!allowed) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  // Only the recipient can open a view-once
  if (message.senderId === session.user.id) {
    return NextResponse.json(
      { error: "Solo el destinatario puede abrirla" },
      { status: 403 },
    );
  }
  if (!message.viewOnce || message.type !== "IMAGE") {
    return NextResponse.json({ error: "No es foto de una vista" }, { status: 400 });
  }
  if (message.viewedAt) {
    return NextResponse.json({ error: "Ya fue abierta" }, { status: 400 });
  }

  const url = message.mediaUrl;
  const updated = await prisma.inquiryMessage.update({
    where: { id: message.id },
    data: {
      viewedAt: new Date(),
      mediaUrl: null,
      body: "Abierto",
    },
  });

  await deleteChatUpload(url);

  return NextResponse.json({
    message: {
      ...updated,
      mediaUrl: url, // one-time reveal payload for the opener
      revealOnce: true,
    },
  });
}
