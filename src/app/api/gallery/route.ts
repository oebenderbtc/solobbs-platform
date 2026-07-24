import { NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const images = await prisma.galleryImage.findMany({
    where: { modelId: session.user.id },
    orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { galleryPublic: true, rateFrom: true, bio: true, city: true, referralCode: true },
  });

  return NextResponse.json({ images, profile: user });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MODEL") {
    return NextResponse.json({ error: "Solo modelos" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const caption = String(form.get("caption") || "").slice(0, 120);

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Solo imágenes" }, { status: 400 });
  }

  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: "Máximo 4MB" }, { status: 400 });
  }

  const count = await prisma.galleryImage.count({ where: { modelId: session.user.id } });
  if (count >= 12) {
    return NextResponse.json({ error: "Máximo 12 fotos" }, { status: 400 });
  }

  const ext = file.type.includes("png")
    ? "png"
    : file.type.includes("webp")
      ? "webp"
      : "jpg";
  const dir = path.join(process.cwd(), "public", "uploads", "gallery", session.user.id);
  await mkdir(dir, { recursive: true });
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  const url = `/uploads/gallery/${session.user.id}/${filename}`;
  const image = await prisma.galleryImage.create({
    data: {
      modelId: session.user.id,
      url,
      caption: caption || null,
      sortOrder: count,
      isCover: count === 0,
    },
  });

  if (count === 0) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl: url },
    });
  }

  return NextResponse.json({ image });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MODEL") {
    return NextResponse.json({ error: "Solo modelos" }, { status: 403 });
  }

  const body = z
    .object({
      id: z.string().optional(),
      caption: z.string().max(120).optional(),
      isCover: z.boolean().optional(),
      galleryPublic: z.boolean().optional(),
      rateFrom: z.number().positive().nullable().optional(),
      bio: z.string().max(500).optional(),
    })
    .parse(await req.json());

  if (body.galleryPublic !== undefined || body.rateFrom !== undefined || body.bio !== undefined) {
    const profile = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(body.galleryPublic !== undefined ? { galleryPublic: body.galleryPublic } : {}),
        ...(body.rateFrom !== undefined ? { rateFrom: body.rateFrom } : {}),
        ...(body.bio !== undefined ? { bio: body.bio } : {}),
      },
      select: { galleryPublic: true, rateFrom: true, bio: true, referralCode: true },
    });
    return NextResponse.json({ profile });
  }

  if (!body.id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  const existing = await prisma.galleryImage.findFirst({
    where: { id: body.id, modelId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  if (body.isCover) {
    await prisma.galleryImage.updateMany({
      where: { modelId: session.user.id },
      data: { isCover: false },
    });
  }

  const image = await prisma.galleryImage.update({
    where: { id: body.id },
    data: {
      ...(body.caption !== undefined ? { caption: body.caption || null } : {}),
      ...(body.isCover ? { isCover: true } : {}),
    },
  });

  if (body.isCover) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl: image.url },
    });
  }

  return NextResponse.json({ image });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MODEL") {
    return NextResponse.json({ error: "Solo modelos" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

  const existing = await prisma.galleryImage.findFirst({
    where: { id, modelId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  await prisma.galleryImage.delete({ where: { id } });

  if (existing.url.startsWith("/uploads/")) {
    const filePath = path.join(process.cwd(), "public", existing.url.replace(/^\//, ""));
    await unlink(filePath).catch(() => undefined);
  }

  if (existing.isCover) {
    const next = await prisma.galleryImage.findFirst({
      where: { modelId: session.user.id },
      orderBy: { createdAt: "asc" },
    });
    if (next) {
      await prisma.galleryImage.update({
        where: { id: next.id },
        data: { isCover: true },
      });
      await prisma.user.update({
        where: { id: session.user.id },
        data: { avatarUrl: next.url },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
