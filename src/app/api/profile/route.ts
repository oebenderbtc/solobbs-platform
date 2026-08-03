import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const AVATAR_MAX = 4 * 1024 * 1024;

function avatarUrlFor(userId: string) {
  return `/api/media/avatar/${userId}`;
}

function isImageFile(file: File) {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return (
    type.startsWith("image/") ||
    /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(name)
  );
}

function mimeForAvatar(file: File) {
  const type = (file.type || "").toLowerCase();
  if (type.startsWith("image/")) return type;
  const name = (file.name || "").toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      whatsapp: true,
      whatsappNotify: true,
      city: true,
      bio: true,
      referralCode: true,
      isVerified: true,
      rating: true,
      role: true,
      galleryPublic: true,
      rateFrom: true,
      avatarUrl: true,
      avatarMime: true,
      updatedAt: true,
    },
  });

  const avatarUrl = user.avatarMime
    ? `${avatarUrlFor(user.id)}?v=${user.updatedAt.getTime()}`
    : user.avatarUrl || null;

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      whatsapp: user.whatsapp,
      whatsappNotify: user.whatsappNotify,
      city: user.city,
      bio: user.bio,
      referralCode: user.referralCode,
      isVerified: user.isVerified,
      rating: user.rating,
      role: user.role,
      galleryPublic: user.galleryPublic,
      rateFrom: user.rateFrom,
      avatarUrl,
    },
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Formulario requerido" }, { status: 400 });
  }

  const form = await req.formData();
  const action = String(form.get("action") || "upload");

  if (action === "remove") {
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        avatarData: null,
        avatarMime: null,
        avatarUrl: null,
      },
      select: { id: true, avatarUrl: true },
    });
    return NextResponse.json({ user: { ...user, avatarUrl: null } });
  }

  const file = form.get("avatar");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Foto requerida" }, { status: 400 });
  }
  if (!isImageFile(file)) {
    return NextResponse.json(
      { error: "Solo se permiten imágenes" },
      { status: 400 },
    );
  }
  if (file.size > AVATAR_MAX) {
    return NextResponse.json(
      { error: "La foto no puede superar 4MB" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0) {
    return NextResponse.json({ error: "Archivo vacío" }, { status: 400 });
  }

  const avatarUrl = avatarUrlFor(session.user.id);
  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      avatarData: new Uint8Array(buffer),
      avatarMime: mimeForAvatar(file),
      avatarUrl,
    },
    select: { id: true, avatarUrl: true, updatedAt: true },
  });

  return NextResponse.json({
    user: {
      id: user.id,
      avatarUrl: `${user.avatarUrl}?v=${user.updatedAt.getTime()}`,
    },
  });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = z
      .object({
        phone: z.string().max(40).optional(),
        whatsapp: z.string().max(40).optional(),
        whatsappNotify: z.boolean().optional(),
        city: z.string().max(80).optional(),
        bio: z.string().max(800).optional(),
        name: z.string().min(2).max(80).optional(),
      })
      .parse(await req.json());

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(body.phone !== undefined ? { phone: body.phone.trim() || null } : {}),
        ...(body.whatsapp !== undefined
          ? { whatsapp: body.whatsapp.trim() || null }
          : {}),
        ...(body.whatsappNotify !== undefined
          ? { whatsappNotify: body.whatsappNotify }
          : {}),
        ...(body.city !== undefined ? { city: body.city.trim() || null } : {}),
        ...(body.bio !== undefined ? { bio: body.bio.trim() || null } : {}),
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        whatsapp: true,
        whatsappNotify: true,
        city: true,
        bio: true,
        avatarUrl: true,
      },
    });

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
}
