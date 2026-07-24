import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { releaseEscrow } from "@/lib/escrow";
import { formatUSDT } from "@/lib/crypto";
import { smartEscrowLock } from "@/lib/smart-escrow";

function p2pCardBody(amount: number, title: string) {
  return `P2P · ${title} · ${formatUSDT(amount)}`;
}

async function notify(userId: string, title: string, body: string) {
  await prisma.notification.create({
    data: {
      userId,
      title,
      body,
      link: "/dashboard/messages",
    },
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = z
      .object({
        inquiryId: z.string(),
        title: z.string().min(3).max(120),
        amount: z.number().positive(),
      })
      .parse(await req.json());

    const inquiry = await prisma.inquiry.findUnique({
      where: { id: body.inquiryId },
    });
    if (!inquiry) {
      return NextResponse.json({ error: "Chat no encontrado" }, { status: 404 });
    }

    const isParty =
      inquiry.modelId === session.user.id || inquiry.clientId === session.user.id;
    if (!isParty) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }

    const settings = await prisma.platformSettings.findUnique({
      where: { id: "default" },
    });
    const min = settings?.minEscrowAmount ?? 50;
    if (body.amount < min) {
      return NextResponse.json(
        { error: `Monto mínimo ${formatUSDT(min)}` },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const job = await tx.job.create({
        data: {
          title: body.title,
          description: "Orden P2P cripto — escrow USDT con smart contract",
          amount: body.amount,
          status: "SCHEDULED",
          modelId: inquiry.modelId,
          clientId: inquiry.clientId,
        },
      });

      const escrow = await tx.escrow.create({
        data: {
          amount: body.amount,
          asset: "USDT",
          chain: settings?.escrowChain || "POLYGON",
          status: "PENDING",
          paymentMethod: "WALLET",
          jobId: job.id,
          modelId: inquiry.modelId,
          clientId: inquiry.clientId,
          inquiryId: inquiry.id,
          notes: "Esperando pago USDT desde billetera SoloBBs → lock en contrato",
        },
        include: {
          sellerPaymentMethod: true,
          job: true,
        },
      });

      const message = await tx.inquiryMessage.create({
        data: {
          inquiryId: inquiry.id,
          senderId: session.user.id,
          type: "P2P",
          body: p2pCardBody(body.amount, body.title),
          escrowId: escrow.id,
        },
      });

      await tx.inquiry.update({
        where: { id: inquiry.id },
        data: { updatedAt: new Date(), status: "OPEN" },
      });

      return { escrow, message, job };
    });

    const peerId =
      session.user.id === inquiry.modelId ? inquiry.clientId : inquiry.modelId;
    await notify(
      peerId,
      "Nueva orden cripto",
      `${session.user.name} creó una orden por ${formatUSDT(body.amount)}.`,
    );

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "No se pudo crear la orden" }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = z
    .object({
      escrowId: z.string(),
      action: z.enum(["pay_from_wallet", "confirm_arrival", "release", "dispute"]),
    })
    .parse(await req.json());

  const escrow = await prisma.escrow.findUnique({
    where: { id: body.escrowId },
    include: {
      sellerPaymentMethod: true,
      inquiry: true,
      job: true,
    },
  });

  if (!escrow || (escrow.paymentMethod !== "WALLET" && escrow.paymentMethod !== "P2P")) {
    return NextResponse.json({ error: "Orden P2P no encontrada" }, { status: 404 });
  }

  const isModel = escrow.modelId === session.user.id;
  const isClient = escrow.clientId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isModel && !isClient && !isAdmin) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  if (body.action === "pay_from_wallet") {
    if (!isClient && !isAdmin) {
      return NextResponse.json(
        { error: "Solo el cliente paga con su saldo USDT" },
        { status: 403 },
      );
    }
    if (escrow.status !== "PENDING") {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }
    if (!escrow.clientId) {
      return NextResponse.json({ error: "Orden sin cliente" }, { status: 400 });
    }

    const client = await prisma.user.findUniqueOrThrow({
      where: { id: escrow.clientId },
    });

    if (client.walletBalance < escrow.amount) {
      return NextResponse.json(
        {
          error: `Saldo USDT insuficiente. Tienes ${formatUSDT(client.walletBalance)}; necesitas ${formatUSDT(escrow.amount)}. Deposita USDT/BTC/LTC.`,
          code: "INSUFFICIENT_BALANCE",
          walletBalance: client.walletBalance,
        },
        { status: 400 },
      );
    }

    const settings = await prisma.platformSettings.findUnique({
      where: { id: "default" },
    });

    const lock = await smartEscrowLock({
      escrowId: escrow.id,
      amountUsdt: escrow.amount,
      modelId: escrow.modelId,
      clientId: escrow.clientId,
      contractAddress: settings?.escrowContractAddress || "",
      chain: escrow.chain || settings?.escrowChain || "POLYGON",
    });

    const updated = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: client.id },
        data: { walletBalance: { decrement: escrow.amount } },
      });

      const e = await tx.escrow.update({
        where: { id: escrow.id },
        data: {
          status: "FUNDED",
          paymentMethod: "WALLET",
          asset: "USDT",
          fundedAt: new Date(),
          buyerMarkedPaidAt: new Date(),
          lockTxHash: lock.lockTxHash,
          contractEscrowId: lock.contractEscrowId,
          cryptoTxHash: lock.lockTxHash,
          notes: `USDT locked on-chain · ${lock.message}`,
        },
        include: { sellerPaymentMethod: true, job: true },
      });

      await tx.user.update({
        where: { id: e.modelId },
        data: { escrowHeld: { increment: e.amount } },
      });

      if (e.jobId) {
        await tx.job.update({
          where: { id: e.jobId },
          data: { status: "ACTIVE" },
        });
      }

      await tx.payment.create({
        data: {
          amount: e.amount,
          method: "CRYPTO",
          status: "COMPLETED",
          externalId: lock.lockTxHash,
          cryptoNetwork: e.chain,
          userId: client.id,
          escrowId: e.id,
        },
      });

      if (escrow.inquiryId) {
        await tx.inquiryMessage.create({
          data: {
            inquiryId: escrow.inquiryId,
            senderId: session.user.id,
            type: "P2P",
            body: `USDT locked en SC · ${formatUSDT(e.amount)} · ${lock.lockTxHash.slice(0, 14)}…`,
            escrowId: escrow.id,
          },
        });
        await tx.inquiry.update({
          where: { id: escrow.inquiryId },
          data: { updatedAt: new Date() },
        });
      }

      return e;
    });

    await notify(
      escrow.modelId,
      "Escrow fondeado on-chain",
      `${session.user.name} bloqueó ${formatUSDT(escrow.amount)} en el smart contract.`,
    );

    return NextResponse.json({ escrow: updated, lock });
  }

  if (body.action === "confirm_arrival") {
    if (!isClient && !isAdmin) {
      return NextResponse.json(
        { error: "Solo el cliente confirma la llegada a la cita" },
        { status: 403 },
      );
    }
    if (escrow.status !== "FUNDED" && escrow.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "La orden aún no está en garantía" },
        { status: 400 },
      );
    }
    if (escrow.clientArrivedAt) {
      return NextResponse.json({ error: "La llegada ya fue confirmada" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const e = await tx.escrow.update({
        where: { id: escrow.id },
        data: {
          clientArrivedAt: new Date(),
          status: "IN_PROGRESS",
          notes: "Cliente confirmó llegada a la cita — modelo puede liberar",
        },
        include: { sellerPaymentMethod: true, job: true },
      });
      if (escrow.inquiryId) {
        await tx.inquiryMessage.create({
          data: {
            inquiryId: escrow.inquiryId,
            senderId: session.user.id,
            type: "P2P",
            body: `Cliente confirmó: la modelo llegó a la cita · ${formatUSDT(escrow.amount)}`,
            escrowId: escrow.id,
          },
        });
        await tx.inquiry.update({
          where: { id: escrow.inquiryId },
          data: { updatedAt: new Date() },
        });
      }
      return e;
    });

    await notify(
      escrow.modelId,
      "Llegada confirmada",
      `${session.user.name} confirmó que llegaste a la cita. Ya puedes liberar los fondos.`,
    );

    return NextResponse.json({ escrow: updated });
  }

  if (body.action === "release") {
    if (!isModel && !isAdmin) {
      return NextResponse.json({ error: "Sin permiso para liberar" }, { status: 403 });
    }
    if (escrow.status !== "FUNDED" && escrow.status !== "IN_PROGRESS") {
      return NextResponse.json({ error: "Nada que liberar" }, { status: 400 });
    }
    if (!escrow.clientArrivedAt && !isAdmin) {
      return NextResponse.json(
        {
          error:
            "No puedes liberar hasta que el cliente confirme que llegaste a la cita",
          code: "ARRIVAL_REQUIRED",
        },
        { status: 400 },
      );
    }

    let result;
    try {
      result = await releaseEscrow(escrow.id, {
        skipArrivalCheck: isAdmin,
      });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "No se pudo liberar" },
        { status: 400 },
      );
    }

    if (escrow.inquiryId) {
      await prisma.inquiryMessage.create({
        data: {
          inquiryId: escrow.inquiryId,
          senderId: session.user.id,
          type: "P2P",
          body: `SC release · modelo ${formatUSDT(result.net)} · fee ${formatUSDT(result.fee)} · ${result.releaseTxHash?.slice(0, 14)}…`,
          escrowId: escrow.id,
        },
      });
      await prisma.inquiry.update({
        where: { id: escrow.inquiryId },
        data: { updatedAt: new Date() },
      });
    }

    if (escrow.clientId) {
      await notify(
        escrow.clientId,
        "Orden liberada on-chain",
        `El contrato liberó fondos. Fee de plataforma descontado automáticamente.`,
      );
    }

    return NextResponse.json({ ok: true, ...result });
  }

  if (escrow.status === "RELEASED" || escrow.status === "REFUNDED") {
    return NextResponse.json({ error: "Orden cerrada" }, { status: 400 });
  }

  const disputed = await prisma.$transaction(async (tx) => {
    const e = await tx.escrow.update({
      where: { id: escrow.id },
      data: {
        status: "DISPUTED",
        notes: `Disputa abierta por ${session.user.name}`,
      },
      include: { sellerPaymentMethod: true, job: true },
    });
    if (escrow.inquiryId) {
      await tx.inquiryMessage.create({
        data: {
          inquiryId: escrow.inquiryId,
          senderId: session.user.id,
          type: "P2P",
          body: `Disputa abierta · ${formatUSDT(escrow.amount)}`,
          escrowId: escrow.id,
        },
      });
      await tx.inquiry.update({
        where: { id: escrow.inquiryId },
        data: { updatedAt: new Date() },
      });
    }
    return e;
  });

  const other =
    session.user.id === escrow.modelId ? escrow.clientId : escrow.modelId;
  if (other) {
    await notify(other, "Disputa P2P", `${session.user.name} abrió una disputa.`);
  }

  return NextResponse.json({ escrow: disputed });
}
