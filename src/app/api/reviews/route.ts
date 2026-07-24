import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recalculateUserRating } from "@/lib/reviews";

const createSchema = z.object({
  jobId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(800).optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  const targetId = searchParams.get("targetId");
  const mine = searchParams.get("mine") === "1";

  const where = jobId
    ? { jobId }
    : targetId
      ? { targetId }
      : mine
        ? {
            OR: [{ authorId: session.user.id }, { targetId: session.user.id }],
          }
        : session.user.role === "ADMIN"
          ? {}
          : {
              OR: [{ authorId: session.user.id }, { targetId: session.user.id }],
            };

  const reviews = await prisma.review.findMany({
    where,
    include: {
      author: { select: { id: true, name: true, role: true, avatarUrl: true } },
      target: { select: { id: true, name: true, role: true, avatarUrl: true } },
      job: { select: { id: true, title: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ reviews });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = createSchema.parse(await req.json());
    const job = await prisma.job.findUnique({
      where: { id: body.jobId },
      include: {
        reviews: { where: { authorId: session.user.id } },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Trabajo no encontrado" }, { status: 404 });
    }

    if (job.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Solo se puede calificar un servicio completado" },
        { status: 400 },
      );
    }

    if (!job.clientId) {
      return NextResponse.json(
        { error: "Este trabajo no tiene cliente asignado" },
        { status: 400 },
      );
    }

    const isModel = job.modelId === session.user.id;
    const isClient = job.clientId === session.user.id;

    if (!isModel && !isClient && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    if (job.reviews.length > 0) {
      return NextResponse.json(
        { error: "Ya dejaste una reseña para este servicio" },
        { status: 400 },
      );
    }

    const targetId = isModel ? job.clientId : job.modelId;
    if (!targetId || targetId === session.user.id) {
      return NextResponse.json({ error: "Destino inválido" }, { status: 400 });
    }

    const review = await prisma.review.create({
      data: {
        jobId: job.id,
        authorId: session.user.id,
        targetId,
        rating: body.rating,
        comment: body.comment?.trim() || null,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
        target: { select: { id: true, name: true, role: true } },
        job: { select: { id: true, title: true } },
      },
    });

    await recalculateUserRating(targetId);

    await prisma.notification.create({
      data: {
        userId: targetId,
        title: "Nueva reseña",
        body: `${session.user.name || "Alguien"} te calificó con ${body.rating}/5 en “${job.title}”.`,
        link: "/dashboard/reviews",
      },
    });

    return NextResponse.json({ review });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "No se pudo guardar la reseña" }, { status: 400 });
  }
}
