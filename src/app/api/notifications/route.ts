import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const unread = notifications.filter((n) => !n.read).length;

  return NextResponse.json({ notifications, unread });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = z
    .object({
      id: z.string().optional(),
      all: z.boolean().optional(),
    })
    .parse(await req.json());

  if (body.all) {
    await prisma.notification.updateMany({
      where: { userId: session.user.id, read: false },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  }

  if (!body.id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  const existing = await prisma.notification.findFirst({
    where: { id: body.id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  await prisma.notification.update({
    where: { id: body.id },
    data: { read: true },
  });

  return NextResponse.json({ ok: true });
}
