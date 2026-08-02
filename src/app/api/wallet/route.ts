import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  type CryptoAsset,
  formatCrypto,
  formatUSDT,
  getTreasury,
  isDemoTreasuryAddress,
  mockTxHash,
  resolveUsdtTreasury,
  toUsdt,
} from "@/lib/crypto";
import { tronEscrowDemoMode, verifyTronUsdtLock } from "@/lib/tron-escrow";
import { requireKycApproved } from "@/lib/kyc";

function depositRef(userId: string, asset: string) {
  return `SB-${asset}-${userId.slice(-4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Backfill custodial TRON wallet for email-only accounts created before this feature
  try {
    const { ensureUserTronWallet } = await import("@/lib/ensure-tron-wallet");
    await ensureUserTronWallet(session.user.id);
  } catch {
    // non-fatal
  }

  const depositsBefore = await prisma.walletDeposit.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const hasPendingUsdt = depositsBefore.some(
    (d) => d.status === "PENDING" && (d.asset || "USDT") === "USDT",
  );

  let settledIds: string[] = [];
  if (hasPendingUsdt) {
    try {
      const { settlePendingUsdtDeposits } = await import("@/lib/wallet-settle");
      const result = await settlePendingUsdtDeposits(session.user.id);
      settledIds = result.settled;
    } catch {
      settledIds = [];
    }
  }

  const userRow = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      walletBalance: true,
      btcBalance: true,
      ltcBalance: true,
      escrowHeld: true,
      totalEarned: true,
      tronAddress: true,
      tronPrivateKeyEnc: true,
      usdtPayoutAddress: true,
      btcPayoutAddress: true,
      ltcPayoutAddress: true,
    },
  });

  const { tronPrivateKeyEnc, ...userRest } = userRow;
  const user = {
    ...userRest,
    custodialWallet: Boolean(tronPrivateKeyEnc),
  };

  const settings = await prisma.platformSettings.findUnique({
    where: { id: "default" },
  });

  const deposits =
    settledIds.length > 0 || hasPendingUsdt
      ? await prisma.walletDeposit.findMany({
          where: { userId: session.user.id },
          orderBy: { createdAt: "desc" },
          take: 30,
        })
      : depositsBefore;

  const payments = await prisma.payment.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const usdtTreasury = resolveUsdtTreasury(settings?.cryptoWalletUsdt);
  const demoMode = tronEscrowDemoMode();

  return NextResponse.json({
    user,
    deposits,
    payments,
    demoMode,
    settled: settledIds,
    platform: {
      usdt: usdtTreasury,
      usdtDemo: isDemoTreasuryAddress(usdtTreasury),
      btc: settings?.cryptoWalletBtc,
      ltc: settings?.cryptoWalletLtc,
      escrowContract: settings?.escrowContractAddress,
      escrowChain: settings?.escrowChain || "TRON",
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
    const minNative = asset === "USDT" ? 1 : asset === "BTC" ? 0.0002 : 0.1;
    if (body.amount < minNative) {
      return NextResponse.json(
        { error: `Mínimo ${formatCrypto(minNative, asset)}` },
        { status: 400 },
      );
    }

    const treasury = await getTreasury(asset);
    let depositAddress = treasury.address;
    let demoAddr = treasury.demo;

    // USDT reloads go to the user's permanent TRON wallet (never changes)
    if (asset === "USDT") {
      const me = await prisma.user.findUniqueOrThrow({
        where: { id: session.user.id },
        select: { tronAddress: true },
      });
      if (!me.tronAddress) {
        return NextResponse.json(
          { error: "Tu cuenta aún no tiene wallet TRON. Recarga la página." },
          { status: 400 },
        );
      }
      depositAddress = me.tronAddress;
      demoAddr = false;
    } else if (treasury.demo && !tronEscrowDemoMode()) {
      return NextResponse.json(
        {
          error:
            "Configura las direcciones BTC/LTC de plataforma en admin para depósitos on-chain.",
        },
        { status: 400 },
      );
    }

    if (asset === "USDT" && demoAddr && !tronEscrowDemoMode()) {
      return NextResponse.json(
        {
          error:
            "Configura TRON_TREASURY_USDT en .env con una wallet TRON real para depósitos on-chain.",
        },
        { status: 400 },
      );
    }

    const reference = depositRef(session.user.id, asset);
    const creditedUsdt = await toUsdt(body.amount, asset);

    const deposit = await prisma.walletDeposit.create({
      data: {
        amount: body.amount,
        asset,
        chain: asset === "USDT" ? "TRON" : treasury.chain,
        rail: asset,
        status: "PENDING",
        reference,
        depositAddress,
        creditedUsdt,
        userId: session.user.id,
        notes: `Envía ${formatCrypto(body.amount, asset)} a tu wallet. Memo/ref: ${reference}. Se acredita ~${formatUSDT(creditedUsdt)} al confirmar.`,
      },
    });

    return NextResponse.json({
      deposit,
      instructions: {
        asset,
        amount: body.amount,
        address: depositAddress,
        chain: asset === "USDT" ? "TRON" : treasury.chain,
        reference,
        creditedUsdt,
        demo: demoAddr,
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
      action: z.enum(["confirm_demo", "confirm", "withdraw"]),
      txId: z.string().optional(),
      fromAddress: z.string().optional(),
      amount: z.number().positive().optional(),
      toAddress: z.string().optional(),
    })
    .parse(await req.json());

  if (body.action === "withdraw") {
    const kycBlock = await requireKycApproved(session.user.id);
    if (kycBlock) return kycBlock;

    const amount = body.amount;
    if (!amount || amount < 1) {
      return NextResponse.json({ error: "Monto mínimo 1 USDT" }, { status: 400 });
    }

    const toAddress = (body.toAddress || "").trim();
    if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(toAddress)) {
      return NextResponse.json(
        { error: "Dirección TRON de destino inválida" },
        { status: 400 },
      );
    }

    const me = await prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: {
        walletBalance: true,
        tronAddress: true,
      },
    });

    if (me.walletBalance < amount) {
      return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
    }

    const { sendUsdtToAddress } = await import("@/lib/tron-send");
    const sent = await sendUsdtToAddress({
      toAddress,
      amountUsdt: amount,
    });
    if (!sent.ok) {
      return NextResponse.json({ error: sent.error }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const fresh = await tx.user.findUniqueOrThrow({
        where: { id: session.user.id },
        select: { walletBalance: true },
      });
      if (fresh.walletBalance < amount) {
        throw new Error("Saldo insuficiente");
      }

      const user = await tx.user.update({
        where: { id: session.user.id },
        data: { walletBalance: { decrement: amount } },
        select: { walletBalance: true, tronAddress: true },
      });

      await tx.payment.create({
        data: {
          amount,
          method: "CRYPTO",
          status: "COMPLETED",
          externalId: `WD-${session.user.id.slice(-4)}-${Date.now().toString(36)}`,
          cryptoNetwork: "TRON",
          cryptoAddress: toAddress,
          userId: session.user.id,
        },
      });

      await tx.notification.create({
        data: {
          userId: session.user.id,
          title: "Retiro USDT enviado",
          body: sent.demo
            ? `${formatUSDT(amount)} debitados (demo) → ${toAddress}`
            : `${formatUSDT(amount)} enviados a ${toAddress}. Tx: ${sent.txId.slice(0, 10)}…`,
          link: "/dashboard/wallet",
        },
      });

      return user;
    }).catch(() => null);

    if (!updated) {
      return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      txId: sent.txId,
      demo: Boolean(sent.demo),
      balances: updated,
      toAddress,
    });
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

  if (deposit.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  if (deposit.status !== "PENDING") {
    return NextResponse.json({ error: "Depósito ya procesado" }, { status: 400 });
  }

  const asset = (deposit.asset || "USDT") as CryptoAsset;
  const creditedUsdt = deposit.creditedUsdt ?? (await toUsdt(deposit.amount, asset));
  let txHash = deposit.txHash || "";
  let notes = "Depósito confirmado";

  if (body.action === "confirm_demo") {
    if (!tronEscrowDemoMode()) {
      return NextResponse.json(
        { error: "Simulación desactivada. Paga con TronLink o envía el txId real." },
        { status: 400 },
      );
    }
    txHash = mockTxHash(asset === "BTC" || asset === "LTC" ? "" : "0x");
    notes = "Depósito confirmado en modo demo (sin on-chain)";
  } else if (body.action === "confirm") {
    if (asset !== "USDT") {
      return NextResponse.json(
        { error: "Confirmación on-chain automática solo para USDT-TRC20" },
        { status: 400 },
      );
    }
    const txId = (body.txId || "").trim();
    if (!/^[a-fA-F0-9]{64}$/.test(txId)) {
      return NextResponse.json({ error: "txId TRON inválido" }, { status: 400 });
    }

    const treasury = deposit.depositAddress || (await getTreasury("USDT")).address;
    if (isDemoTreasuryAddress(treasury) && !tronEscrowDemoMode()) {
      return NextResponse.json(
        { error: "Treasury demo: configura TRON_TREASURY_USDT en .env" },
        { status: 400 },
      );
    }

    const reused = await prisma.walletDeposit.findFirst({
      where: { txHash: txId, status: "COMPLETED" },
    });
    if (reused) {
      return NextResponse.json(
        { error: "Esa transacción ya fue acreditada" },
        { status: 400 },
      );
    }

    const verified = await verifyTronUsdtLock({
      txId,
      treasuryAddress: treasury,
      amountUsdt: deposit.amount,
      fromAddress: body.fromAddress || null,
    });
    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: 400 });
    }

    txHash = txId;
    notes = "Depósito USDT-TRC20 verificado on-chain (TronGrid)";
  } else {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const d = await tx.walletDeposit.update({
      where: { id: deposit.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        txHash,
        confirmations: asset === "BTC" ? 3 : asset === "LTC" ? 6 : 20,
        creditedUsdt,
        notes,
      },
    });

    await tx.user.update({
      where: { id: deposit.userId },
      data: {
        walletBalance: { increment: creditedUsdt },
        ...(asset === "BTC" ? { btcBalance: { increment: deposit.amount } } : {}),
        ...(asset === "LTC" ? { ltcBalance: { increment: deposit.amount } } : {}),
      },
    });

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

  return NextResponse.json({ deposit: updated, balances: user });
}
