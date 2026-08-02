import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { releaseEscrow } from "@/lib/escrow";
import { formatUSDT } from "@/lib/crypto";
import { smartEscrowLock } from "@/lib/smart-escrow";
import {
  TRON_USDT_CONTRACT,
  tronEscrowDemoMode,
  verifyTronUsdtLock,
} from "@/lib/tron-escrow";
import { verifyTronSignature } from "@/lib/tron-verify";

function p2pCardBody(amount: number, title: string) {
  return `P2P · ${title} · ${formatUSDT(amount)} · TRON/TronLink`;
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

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const escrowId = new URL(req.url).searchParams.get("escrowId");
  if (!escrowId) {
    return NextResponse.json({ error: "escrowId requerido" }, { status: 400 });
  }
  const escrow = await prisma.escrow.findUnique({ where: { id: escrowId } });
  if (!escrow) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  const isParty =
    escrow.modelId === session.user.id ||
    escrow.clientId === session.user.id ||
    session.user.role === "ADMIN";
  if (!isParty) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }
  const settings = await prisma.platformSettings.findUnique({
    where: { id: "default" },
  });
  return NextResponse.json({
    escrow: {
      id: escrow.id,
      amount: escrow.amount,
      status: escrow.status,
      chain: escrow.chain || "TRON",
    },
    payment: {
      chain: "TRON",
      asset: "USDT-TRC20",
      usdtContract: TRON_USDT_CONTRACT,
      treasuryAddress:
        settings?.cryptoWalletUsdt ||
        "TSoloBBsDemoUSDT000000000000000000",
      amountUsdt: escrow.amount,
      amountSun: Math.round(escrow.amount * 1_000_000),
      demoMode: tronEscrowDemoMode(),
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
          description: "Orden P2P — escrow USDT-TRC20 con TronLink",
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
          chain: "TRON",
          status: "PENDING",
          paymentMethod: "CRYPTO",
          jobId: job.id,
          modelId: inquiry.modelId,
          clientId: inquiry.clientId,
          inquiryId: inquiry.id,
          notes: "Esperando lock USDT-TRC20 vía TronLink → treasury SoloBBs",
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
      "Nueva orden TronLink",
      `${session.user.name} creó una orden por ${formatUSDT(body.amount)} (TRON).`,
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
      action: z.enum([
        "pay_with_tron",
        "pay_from_wallet",
        "confirm_arrival",
        "release",
        "dispute",
      ]),
      txId: z.string().optional(),
      fromAddress: z.string().optional(),
      releaseSignature: z.string().optional(),
      releaseMessage: z.string().optional(),
      releaseAddress: z.string().optional(),
    })
    .parse(await req.json());

  const escrow = await prisma.escrow.findUnique({
    where: { id: body.escrowId },
    include: {
      sellerPaymentMethod: true,
      inquiry: true,
      job: true,
      model: { select: { id: true, tronAddress: true, usdtPayoutAddress: true } },
    },
  });

  if (
    !escrow ||
    !["WALLET", "P2P", "CRYPTO"].includes(escrow.paymentMethod || "")
  ) {
    return NextResponse.json({ error: "Orden P2P no encontrada" }, { status: 404 });
  }

  const isModel = escrow.modelId === session.user.id;
  const isClient = escrow.clientId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isModel && !isClient && !isAdmin) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  if (body.action === "pay_with_tron") {
    if (!isClient && !isAdmin) {
      return NextResponse.json(
        { error: "Solo el cliente paga con TronLink" },
        { status: 403 },
      );
    }
    if (escrow.status !== "PENDING") {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }
    if (!body.txId) {
      return NextResponse.json(
        { error: "Falta el hash de la transferencia TRON" },
        { status: 400 },
      );
    }

    const settings = await prisma.platformSettings.findUnique({
      where: { id: "default" },
    });
    const treasury =
      settings?.cryptoWalletUsdt || "TSoloBBsDemoUSDT000000000000000000";

    let verifiedAmount = escrow.amount;
    if (!tronEscrowDemoMode()) {
      const verified = await verifyTronUsdtLock({
        txId: body.txId,
        treasuryAddress: treasury,
        amountUsdt: escrow.amount,
        fromAddress: body.fromAddress,
      });
      if (!verified.ok) {
        return NextResponse.json({ error: verified.error }, { status: 400 });
      }
      verifiedAmount = verified.amount;
    } else if (!/^[a-fA-F0-9]{64}$/.test(body.txId)) {
      // demo: also accept tron-looking ids from TronLink
      if (body.txId.length < 16) {
        return NextResponse.json({ error: "txId inválido" }, { status: 400 });
      }
    }

    const lock = await smartEscrowLock({
      escrowId: escrow.id,
      amountUsdt: verifiedAmount,
      modelId: escrow.modelId,
      clientId: escrow.clientId || session.user.id,
      contractAddress: settings?.escrowContractAddress || TRON_USDT_CONTRACT,
      chain: "TRON",
      lockTxHash: body.txId,
    });

    const updated = await prisma.$transaction(async (tx) => {
      const e = await tx.escrow.update({
        where: { id: escrow.id },
        data: {
          status: "FUNDED",
          paymentMethod: "CRYPTO",
          asset: "USDT",
          chain: "TRON",
          fundedAt: new Date(),
          buyerMarkedPaidAt: new Date(),
          lockTxHash: lock.lockTxHash,
          contractEscrowId: lock.contractEscrowId,
          cryptoTxHash: lock.lockTxHash,
          notes: `USDT-TRC20 locked vía TronLink · ${lock.lockTxHash}`,
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

      if (escrow.clientId) {
        await tx.payment.create({
          data: {
            amount: e.amount,
            method: "CRYPTO",
            status: "COMPLETED",
            externalId: lock.lockTxHash,
            cryptoNetwork: "TRON",
            cryptoAddress: treasury,
            userId: escrow.clientId,
            escrowId: e.id,
          },
        });
      }

      if (escrow.inquiryId) {
        await tx.inquiryMessage.create({
          data: {
            inquiryId: escrow.inquiryId,
            senderId: session.user.id,
            type: "P2P",
            body: `TronLink lock · ${formatUSDT(e.amount)} · ${lock.lockTxHash.slice(0, 14)}…`,
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
      "Escrow fondeado (TronLink)",
      `${session.user.name} bloqueó ${formatUSDT(escrow.amount)} USDT-TRC20.`,
    );

    return NextResponse.json({ escrow: updated, lock });
  }

  // Legacy SoloBBs balance path (optional)
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
          error: `Saldo interno insuficiente. Usa TronLink o recarga la billetera.`,
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
      contractAddress: settings?.escrowContractAddress || TRON_USDT_CONTRACT,
      chain: "TRON",
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
          chain: "TRON",
          fundedAt: new Date(),
          buyerMarkedPaidAt: new Date(),
          lockTxHash: lock.lockTxHash,
          contractEscrowId: lock.contractEscrowId,
          cryptoTxHash: lock.lockTxHash,
          notes: `USDT locked (saldo SoloBBs) · ${lock.message}`,
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

      return e;
    });

    await notify(
      escrow.modelId,
      "Escrow fondeado",
      `${session.user.name} bloqueó ${formatUSDT(escrow.amount)} (saldo SoloBBs).`,
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
          notes: "Cliente confirmó llegada — modelo puede liberar con TronLink",
        },
        include: { sellerPaymentMethod: true, job: true },
      });
      if (escrow.inquiryId) {
        await tx.inquiryMessage.create({
          data: {
            inquiryId: escrow.inquiryId,
            senderId: session.user.id,
            type: "P2P",
            body: `Cliente confirmó llegada · ${formatUSDT(escrow.amount)}`,
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
      `${session.user.name} confirmó la cita. Libera con TronLink.`,
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

    // Require TronLink signature from model (unless admin)
    if (!isAdmin) {
      if (!body.releaseSignature || !body.releaseMessage || !body.releaseAddress) {
        return NextResponse.json(
          {
            error: "Firma TronLink requerida para liberar",
            code: "TRON_SIGNATURE_REQUIRED",
          },
          { status: 400 },
        );
      }
      const modelAddr =
        escrow.model.tronAddress || escrow.model.usdtPayoutAddress || "";
      if (
        modelAddr &&
        body.releaseAddress.toLowerCase() !== modelAddr.toLowerCase()
      ) {
        return NextResponse.json(
          {
            error:
              "La wallet TronLink no coincide con la dirección TRON de tu perfil",
          },
          { status: 400 },
        );
      }
      if (!body.releaseMessage.includes(escrow.id)) {
        return NextResponse.json(
          { error: "Mensaje de release inválido" },
          { status: 400 },
        );
      }
      const ok = await verifyTronSignature(
        body.releaseMessage,
        body.releaseSignature,
        body.releaseAddress,
      );
      if (!ok) {
        return NextResponse.json({ error: "Firma TRON inválida" }, { status: 401 });
      }
    }

    let result;
    try {
      result = await releaseEscrow(escrow.id, {
        skipArrivalCheck: isAdmin,
        releaseTxHash: body.txId,
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
          body: `TronLink release · modelo ${formatUSDT(result.net)} · fee ${formatUSDT(result.fee)} · ${result.releaseTxHash?.slice(0, 14)}…`,
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
        "Orden liberada (TRON)",
        `Fondos liberados vía TronLink. Fee de plataforma descontado.`,
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
