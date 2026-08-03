import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatFileDiskPath, mimeFromExt } from "@/lib/chat-media";

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(_req: Request, ctx: Ctx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const parts = (await ctx.params).path || [];
  // Expected: chat / userId / inquiryId / filename
  if (parts.length !== 4 || parts[0] !== "chat") {
    return NextResponse.json({ error: "Ruta inválida" }, { status: 400 });
  }

  const [, userId, inquiryId, filename] = parts;
  if (
    !userId ||
    !inquiryId ||
    !filename ||
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    return NextResponse.json({ error: "Ruta inválida" }, { status: 400 });
  }

  const inquiry = await prisma.inquiry.findUnique({
    where: { id: inquiryId },
    select: { modelId: true, clientId: true },
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

  try {
    const buffer = await readFile(chatFileDiskPath(userId, inquiryId, filename));
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeFromExt(filename),
        "Cache-Control": "private, max-age=3600",
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  }
}
