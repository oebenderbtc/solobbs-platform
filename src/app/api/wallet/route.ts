import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  type CryptoAsset,
  formatCrypto,
  formatUSDT,
  getTreasury,
  mockTxHash,
  toUsdt,
} from "@/lib/crypto";

function depositRef(userId: string, asset: string) {
  return `SB-${asset}-${userId.slice(-4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
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
      role: true,
      walletBalance: true,
      btcBalance: true,
      ltcBalance: true,
      escrowHeld: true,
      totalEarned: true,
      usdtPayoutAddress: true,
      btcPayoutAddress: true,
      ltcPayoutAddress: true,
    },
  });

  const settings = await prisma.platformSettings.findUnique({
    where: { id: "default" },
  });

  const deposits = await prisma.walletDeposit.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const payments = await prisma.payment.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    user,
    deposits,
    payments,
    platform: {
      usdt: settings?.cryptoWalletUsdt,
      btc: settings?.cryptoWalletBtc,
      ltc: settings?.cryptoWalletLtc,
      escrowContract: settings?.escrowContractAddress,
      escrowChain: settings?.escrowChain,
      btcPriceUsdt: settings?.btcPriceUsdt ?? 95000,
      ltcPriceUsdt: settings?.ltcPriceUsdt ?? 85,
      feePercent: settings?.platformFeePercent ?? 8,
      minEscrowAmount: settings?.minEscrowAmount ?? 50,
    },
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (session.user.role !== "CLIENT" && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Solo clientes depositan cripto para pagar" },
      { status: 403 },
    );
  }

  try {
    const body = z
      .object({
        amount: z.number().positive(),
        asset: z.enum(["USDT", "BTC", "LTC"]),
      })
      .parse(await req.json());

    const asset = body.asset as CryptoAsset;
    const minNative = asset === "USDT" ? 20 : asset === "BTC" ? 0.0002 : 0.1;
    if (body.amount < minNative) {
      return NextResponse.json(
        { error: `Mínimo ${formatCrypto(minNative, asset)}` },
        { status: 400 },
      );
    }

    const treasury = await getTreasury(asset);
    const reference = depositRef(session.user.id, asset);
    const creditedUsdt = await toUsdt(body.amount, asset);

    const deposit = await prisma.walletDeposit.create({
      data: {
        amount: body.amount,
        asset,
        chain: treasury.chain,
        rail: asset,
        status: "PENDING",
        reference,
        depositAddress: treasury.address,
        creditedUsdt,
        userId: session.user.id,
        notes: `Envía ${formatCrypto(body.amount, asset)} a la treasury. Memo/ref: ${reference}. Se acredita ~${formatUSDT(creditedUsdt)} al confirmar.`,
      },
    });

    return NextResponse.json({
      deposit,
      instructions: {
        asset,
        amount: body.amount,
        address: treasury.address,
        chain: treasury.chain,
        reference,
        creditedUsdt,
      },
    });
  } catch {
    return NextResponse.json({ error: "No se pudo crear el depósito" }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = z
    .object({
      depositId: z.string().optional(),
      action: z.enum(["confirm_demo", "confirm", "save_payout"]),
      usdtPayoutAddress: z.string().optional(),
      btcPayoutAddress: z.string().optional(),
      ltcPayoutAddress: z.string().optional(),
    })
    .parse(await req.json());

  if (body.action === "save_payout") {
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(body.usdtPayoutAddress !== undefined
          ? { usdtPayoutAddress: body.usdtPayoutAddress || null }
          : {}),
        ...(body.btcPayoutAddress !== undefined
          ? { btcPayoutAddress: body.btcPayoutAddress || null }
          : {}),
        ...(body.ltcPayoutAddress !== undefined
          ? { ltcPayoutAddress: body.ltcPayoutAddress || null }
          : {}),
      },
      select: {
        usdtPayoutAddress: true,
        btcPayoutAddress: true,
        ltcPayoutAddress: true,
      },
    });
    return NextResponse.json({ user });
  }

  if (!body.depositId) {
    return NextResponse.json({ error: "depositId requerido" }, { status: 400 });
  }

  const deposit = await prisma.walletDeposit.findUnique({
    where: { id: body.depositId },
  });
  if (!deposit) {
    return NextResponse.json({ error: "Depósito no encontrado" }, { status: 404 });
  }

  const canConfirm =
    session.user.role === "ADMIN" ||
    (deposit.userId === session.user.id && body.action === "confirm_demo");

  if (!canConfirm) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  if (deposit.status !== "PENDING") {
    return NextResponse.json({ error: "Depósito ya procesado" }, { status: 400 });
  }

  const asset = (deposit.asset || "USDT") as CryptoAsset;
  const creditedUsdt = deposit.creditedUsdt ?? (await toUsdt(deposit.amount, asset));
  const txHash = mockTxHash(asset === "BTC" || asset === "LTC" ? "" : "0x");

  const updated = await prisma.$transaction(async (tx) => {
    const d = await tx.walletDeposit.update({
      where: { id: deposit.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        txHash,
        confirmations: asset === "BTC" ? 3 : asset === "LTC" ? 6 : 20,
        creditedUsdt,
        notes: "Depósito on-chain confirmado automáticamente (watcher demo)",
      },
    });

    // Settlement unificado en USDT (BTC/LTC se convierten al confirmar)
    await tx.user.update({
      where: { id: deposit.userId },
      data: {
        walletBalance: { increment: creditedUsdt },
        ...(asset === "BTC" ? { btcBalance: { increment: deposit.amount } } : {}),
        ...(asset === "LTC" ? { ltcBalance: { increment: deposit.amount } } : {}),
      },
    });

    // Nota: btc/ltcBalance = histórico depositado; el saldo gastable de escrow es walletBalance (USDT)

    await tx.payment.create({
      data: {
        amount: creditedUsdt,
        method: "CRYPTO",
        status: "COMPLETED",
        externalId: deposit.reference,
        cryptoNetwork: deposit.chain,
        cryptoAddress: deposit.depositAddress || undefined,
        userId: deposit.userId,
      },
    });

    await tx.notification.create({
      data: {
        userId: deposit.userId,
        title: "Depósito cripto acreditado",
        body: `${formatCrypto(deposit.amount, asset)} confirmado → ${formatUSDT(creditedUsdt)} disponibles para escrow.`,
        link: "/dashboard/wallet",
      },
    });

    return d;
  });

  const user = await prisma.user.findUnique({
    where: { id: deposit.userId },
    select: { walletBalance: true, btcBalance: true, ltcBalance: true },
  });

  return NextResponse.json({ deposit: updated, balances: user, automated: true });
}
