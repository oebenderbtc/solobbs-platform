import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ path: string[] }> };

function mimeFromName(name: string | null | undefined, fallback?: string | null) {
  if (fallback) return fallback;
  const ext = (name || "").split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    heic: "image/heic",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    ogg: "audio/ogg",
    wav: "audio/wav",
    pdf: "application/pdf",
  };
  return map[ext] || "application/octet-stream";
}

export async function GET(_req: Request, ctx: Ctx) {
  const parts = (await ctx.params).path || [];

  // Public profile photos: /api/media/avatar/:userId
  if (parts.length === 2 && parts[0] === "avatar") {
    const userId = parts[1];
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        avatarData: true,
        avatarMime: true,
        avatarUrl: true,
        isActive: true,
      },
    });
    if (!user || !user.isActive) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    if (user.avatarData && user.avatarData.length > 0) {
      const bytes = Buffer.from(user.avatarData);
      return new NextResponse(bytes, {
        status: 200,
        headers: {
          "Content-Type": user.avatarMime || "image/jpeg",
          "Cache-Control": "public, max-age=300",
          "Content-Length": String(bytes.length),
        },
      });
    }

    // Legacy disk / gallery URL fallback
    if (
      user.avatarUrl?.startsWith("/uploads/") ||
      user.avatarUrl?.startsWith("/api/media/chat/")
    ) {
      try {
        const disk = path.join(
          process.cwd(),
          "public",
          user.avatarUrl.replace(/^\//, ""),
        );
        const buffer = await readFile(disk);
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": mimeFromName(user.avatarUrl, "image/jpeg"),
            "Cache-Control": "public, max-age=300",
          },
        });
      } catch {
        /* fallthrough */
      }
    }

    return NextResponse.json({ error: "Sin foto" }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // DB-backed chat media: /api/media/msg/:messageId
  if (parts.length === 2 && parts[0] === "msg") {
    const messageId = parts[1];
    const message = await prisma.inquiryMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        mediaData: true,
        mediaMime: true,
        mediaName: true,
        mediaUrl: true,
        viewOnce: true,
        viewedAt: true,
        senderId: true,
        inquiry: { select: { modelId: true, clientId: true } },
      },
    });
    if (!message) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    const allowed =
      session.user.role === "ADMIN" ||
      message.inquiry.modelId === session.user.id ||
      message.inquiry.clientId === session.user.id;
    if (!allowed) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    if (message.viewOnce && message.viewedAt && message.senderId !== session.user.id) {
      return NextResponse.json({ error: "Ya no disponible" }, { status: 410 });
    }

    if (message.mediaData && message.mediaData.length > 0) {
      const bytes = Buffer.from(message.mediaData);
      return new NextResponse(bytes, {
        status: 200,
        headers: {
          "Content-Type": mimeFromName(message.mediaName, message.mediaMime),
          "Cache-Control": "private, max-age=60",
          "Content-Length": String(bytes.length),
        },
      });
    }

    if (
      message.mediaUrl?.startsWith("/uploads/") ||
      message.mediaUrl?.startsWith("/api/media/chat/")
    ) {
      try {
        const rel = message.mediaUrl.replace(/^\/api\/media\/chat\//, "chat/");
        const disk = message.mediaUrl.startsWith("/uploads/")
          ? path.join(process.cwd(), "public", message.mediaUrl.replace(/^\//, ""))
          : path.join(
              process.env.UPLOAD_ROOT || path.join(process.cwd(), "data", "uploads"),
              ...rel.split("/"),
            );
        const buffer = await readFile(disk);
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": mimeFromName(message.mediaName, message.mediaMime),
            "Cache-Control": "private, max-age=60",
          },
        });
      } catch {
        /* fallthrough */
      }
    }

    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ error: "Ruta inválida" }, { status: 400 });
}
