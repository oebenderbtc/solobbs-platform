import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { releaseEscrow } from "@/lib/escrow";
import { requireKycApproved } from "@/lib/kyc";

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  amount: z.number().positive(),
  city: z.string().optional(),
  paymentMethod: z.enum(["CARD", "CRYPTO"]),
  scheduledAt: z.string().optional(),
  clientEmail: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim().toLowerCase() : undefined),
    z.string().email().optional(),
  ),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const where =
    session.user.role === "ADMIN"
      ? {}
      : session.user.role === "MODEL"
        ? { modelId: session.user.id }
        : { clientId: session.user.id };

  const escrows = await prisma.escrow.findMany({
    where,
    include: {
      job: true,
      model: { select: { id: true, name: true, email: true } },
      client: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ escrows });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = createSchema.parse(await req.json());
    const modelId =
      session.user.role === "MODEL" ? session.user.id : undefined;

    if (!modelId && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo modelos pueden crear depósitos" },
        { status: 403 },
      );
    }

    const client =
      body.clientEmail
        ? await prisma.user.findFirst({
            where: {
              email: body.clientEmail.toLowerCase(),
              role: "CLIENT",
            },
          })
        : null;

    const job = await prisma.job.create({
      data: {
        title: body.title,
        description: body.description,
        amount: body.amount,
        city: body.city,
        status: "SCHEDULED",
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        modelId: modelId || session.user.id,
        clientId: client?.id,
      },
    });

    const escrow = await prisma.escrow.create({
      data: {
        amount: body.amount,
        status: "PENDING",
        paymentMethod: body.paymentMethod,
        jobId: job.id,
        modelId: modelId || session.user.id,
        clientId: client?.id,
        notes:
          body.paymentMethod === "CRYPTO"
            ? "Esperando confirmación USDT/BTC"
            : "Esperando pago con tarjeta",
      },
      include: { job: true },
    });

    return NextResponse.json({ escrow });
  } catch {
    return NextResponse.json({ error: "No se pudo crear el escrow" }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = z
    .object({
      id: z.string(),
      action: z.enum(["fund", "release", "refund", "dispute"]),
      cardLast4: z.string().optional(),
      cryptoTxHash: z.string().optional(),
    })
    .parse(await req.json());

  const escrow = await prisma.escrow.findUnique({ where: { id: body.id } });
  if (!escrow) {
    return NextResponse.json({ error: "Escrow no encontrado" }, { status: 404 });
  }

  const canManage =
    session.user.role === "ADMIN" ||
    escrow.modelId === session.user.id ||
    escrow.clientId === session.user.id;

  if (!canManage) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  if (body.action === "fund") {
    // Client must be age/KYC verified before funding a service
    if (session.user.role === "CLIENT") {
      const kycBlock = await requireKycApproved(session.user.id);
      if (kycBlock) return kycBlock;
    }
    const updated = await prisma.$transaction(async (tx) => {
      let clientId = escrow.clientId;
      if (!clientId) {
        const demoClient = await tx.user.findFirst({
          where: { role: "CLIENT", email: "cliente@solobbs.com" },
        });
        clientId = demoClient?.id ?? null;
      }

      const e = await tx.escrow.update({
        where: { id: body.id },
        data: {
          status: "FUNDED",
          fundedAt: new Date(),
          cardLast4: body.cardLast4,
          cryptoTxHash: body.cryptoTxHash,
          ...(clientId ? { clientId } : {}),
        },
      });
      await tx.user.update({
        where: { id: e.modelId },
        data: { escrowHeld: { increment: e.amount } },
      });
      if (e.jobId) {
        await tx.job.update({
          where: { id: e.jobId },
          data: {
            status: "ACTIVE",
            ...(clientId ? { clientId } : {}),
          },
        });
      }
      await tx.payment.create({
        data: {
          amount: e.amount,
          method: e.paymentMethod,
          status: "COMPLETED",
          cardLast4: body.cardLast4,
          externalId: body.cryptoTxHash,
          cryptoNetwork: e.paymentMethod === "CRYPTO" ? "TRC20" : undefined,
          userId: clientId || session.user.id,
          escrowId: e.id,
        },
      });
      return e;
    });
    return NextResponse.json({ escrow: updated });
  }

  if (body.action === "release") {
    if (session.user.role !== "ADMIN" && escrow.modelId !== session.user.id) {
      return NextResponse.json({ error: "Sin permiso para liberar" }, { status: 403 });
    }
    if (session.user.role !== "ADMIN" && !escrow.clientArrivedAt) {
      return NextResponse.json(
        {
          error:
            "No puedes liberar hasta que el cliente confirme que llegaste a la cita",
          code: "ARRIVAL_REQUIRED",
        },
        { status: 400 },
      );
    }
    try {
      const result = await releaseEscrow(body.id, {
        skipArrivalCheck: session.user.role === "ADMIN",
      });
      return NextResponse.json({ ok: true, ...result });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "No se pudo liberar" },
        { status: 400 },
      );
    }
  }

  if (body.action === "refund") {
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Solo admin puede reembolsar" }, { status: 403 });
    }
    const previousStatus = escrow.status;
    const updated = await prisma.$transaction(async (tx) => {
      const e = await tx.escrow.update({
        where: { id: body.id },
        data: { status: "REFUNDED" },
      });
      if (previousStatus === "FUNDED" || previousStatus === "IN_PROGRESS" || previousStatus === "DISPUTED") {
        await tx.user.update({
          where: { id: e.modelId },
          data: { escrowHeld: { decrement: e.amount } },
        });
        if (e.paymentMethod === "WALLET" && e.clientId) {
          await tx.user.update({
            where: { id: e.clientId },
            data: { walletBalance: { increment: e.amount } },
          });
        }
      }
      if (e.jobId) {
        await tx.job.update({
          where: { id: e.jobId },
          data: { status: "CANCELLED" },
        });
      }
      return e;
    });
    return NextResponse.json({ escrow: updated });
  }

  const disputed = await prisma.escrow.update({
    where: { id: body.id },
    data: { status: "DISPUTED" },
  });
  return NextResponse.json({ escrow: disputed });
}
