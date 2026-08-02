import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    },
  });

  return NextResponse.json({ user });
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
      },
    });

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
}
