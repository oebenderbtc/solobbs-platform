import { NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function mediaFromFile(file: File) {
  if (file.type.startsWith("image/")) {
    const ext = file.type.includes("png")
      ? "png"
      : file.type.includes("webp")
        ? "webp"
        : file.type.includes("gif")
          ? "gif"
          : "jpg";
    return { mediaType: "IMAGE" as const, ext, maxBytes: 6 * 1024 * 1024 };
  }
  if (
    file.type === "video/mp4" ||
    file.type === "video/webm" ||
    file.type === "video/quicktime"
  ) {
    const ext = file.type.includes("webm")
      ? "webm"
      : file.type.includes("quicktime")
        ? "mov"
        : "mp4";
    return { mediaType: "VIDEO" as const, ext, maxBytes: 40 * 1024 * 1024 };
  }
  return null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  // Public profile by referral code
  if (code) {
    const model = await prisma.user.findFirst({
      where: {
        referralCode: code.toUpperCase(),
        role: "MODEL",
        isActive: true,
        galleryPublic: true,
      },
      select: {
        id: true,
        name: true,
        referralCode: true,
        bio: true,
        rateFrom: true,
        avatarUrl: true,
        city: true,
        galleryImages: {
          orderBy: [
            { isCover: "desc" },
            { sortOrder: "asc" },
            { createdAt: "desc" },
          ],
        },
      },
    });

    if (!model) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }

    const { galleryImages, ...rest } = model;
    return NextResponse.json({
      model: {
        ...rest,
        gallery: galleryImages.map((img) => ({
          id: img.id,
          url: img.url,
          mediaType: img.mediaType,
          caption: img.caption,
          isCover: img.isCover,
        })),
      },
    });
  }

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
    select: {
      galleryPublic: true,
      rateFrom: true,
      bio: true,
      city: true,
      referralCode: true,
    },
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

  const media = mediaFromFile(file);
  if (!media) {
    return NextResponse.json(
      { error: "Solo imágenes (jpg/png/webp) o videos (mp4/webm)" },
      { status: 400 },
    );
  }

  if (file.size > media.maxBytes) {
    return NextResponse.json(
      {
        error:
          media.mediaType === "VIDEO"
            ? "Video máximo 40MB"
            : "Imagen máximo 6MB",
      },
      { status: 400 },
    );
  }

  const count = await prisma.galleryImage.count({
    where: { modelId: session.user.id },
  });
  if (count >= 16) {
    return NextResponse.json({ error: "Máximo 16 archivos en galería" }, { status: 400 });
  }

  const dir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "gallery",
    session.user.id,
  );
  await mkdir(dir, { recursive: true });
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${media.ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  const url = `/uploads/gallery/${session.user.id}/${filename}`;
  const imageCount = await prisma.galleryImage.count({
    where: { modelId: session.user.id, mediaType: "IMAGE" },
  });
  const canCover = media.mediaType === "IMAGE" && imageCount === 0;

  const image = await prisma.galleryImage.create({
    data: {
      modelId: session.user.id,
      url,
      mediaType: media.mediaType,
      caption: caption || null,
      sortOrder: count,
      isCover: canCover,
    },
  });

  if (canCover) {
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

  if (
    body.galleryPublic !== undefined ||
    body.rateFrom !== undefined ||
    body.bio !== undefined
  ) {
    const profile = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(body.galleryPublic !== undefined
          ? { galleryPublic: body.galleryPublic }
          : {}),
        ...(body.rateFrom !== undefined ? { rateFrom: body.rateFrom } : {}),
        ...(body.bio !== undefined ? { bio: body.bio } : {}),
      },
      select: {
        galleryPublic: true,
        rateFrom: true,
        bio: true,
        referralCode: true,
      },
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
    if (existing.mediaType === "VIDEO") {
      return NextResponse.json(
        { error: "La portada debe ser una foto" },
        { status: 400 },
      );
    }
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
    const filePath = path.join(
      process.cwd(),
      "public",
      existing.url.replace(/^\//, ""),
    );
    await unlink(filePath).catch(() => undefined);
  }

  if (existing.isCover) {
    const next = await prisma.galleryImage.findFirst({
      where: { modelId: session.user.id, mediaType: "IMAGE" },
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
