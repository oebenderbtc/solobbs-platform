import "server-only";
import { prisma } from "@/lib/prisma";
import {
  formatCrypto,
  formatUSDT,
  isDemoTreasuryAddress,
  toUsdt,
  type CryptoAsset,
} from "@/lib/crypto";
import {
  fetchRecentUsdtIncoming,
  usdtToSun,
} from "@/lib/tron-escrow";

const LOOKBACK_MS = 30 * 60 * 1000; // match txs up to 30m before deposit create

async function creditDeposit(opts: {
  depositId: string;
  txHash: string;
  notes: string;
}) {
  const deposit = await prisma.walletDeposit.findUnique({
    where: { id: opts.depositId },
  });
  if (!deposit || deposit.status !== "PENDING") return null;

  const asset = (deposit.asset || "USDT") as CryptoAsset;
  const creditedUsdt = deposit.creditedUsdt ?? (await toUsdt(deposit.amount, asset));

  return prisma.$transaction(async (tx) => {
    // Re-check inside tx to avoid double credit races
    const current = await tx.walletDeposit.findUnique({
      where: { id: deposit.id },
    });
    if (!current || current.status !== "PENDING") return null;

    const reused = await tx.walletDeposit.findFirst({
      where: { txHash: opts.txHash, status: "COMPLETED" },
    });
    if (reused) return null;

    const d = await tx.walletDeposit.update({
      where: { id: deposit.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        txHash: opts.txHash,
        confirmations: 20,
        creditedUsdt,
        notes: opts.notes,
      },
    });

    await tx.user.update({
      where: { id: deposit.userId },
      data: { walletBalance: { increment: creditedUsdt } },
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
        body: `${formatCrypto(deposit.amount, asset)} confirmado → ${formatUSDT(creditedUsdt)} disponibles.`,
        link: "/dashboard/wallet",
      },
    });

    return d;
  });
}

/**
 * Detect incoming USDT-TRC20 to the user's permanent wallet and credit PENDING deposits.
 */
export async function settlePendingUsdtDeposits(userId: string) {
  const pending = await prisma.walletDeposit.findMany({
    where: {
      userId,
      status: "PENDING",
      asset: "USDT",
    },
    orderBy: { createdAt: "asc" },
  });

  if (pending.length === 0) return { settled: [] as string[] };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tronAddress: true },
  });

  const watchAddress =
    pending[0].depositAddress || user?.tronAddress || "";
  if (!watchAddress || isDemoTreasuryAddress(watchAddress)) {
    return { settled: [] as string[] };
  }

  const transfers = await fetchRecentUsdtIncoming(watchAddress, 50);
  if (transfers.length === 0) return { settled: [] as string[] };

  const usedTx = new Set(
    (
      await prisma.walletDeposit.findMany({
        where: {
          status: "COMPLETED",
          txHash: { in: transfers.map((t) => t.txId) },
        },
        select: { txHash: true },
      })
    )
      .map((d) => d.txHash)
      .filter(Boolean) as string[],
  );

  const settled: string[] = [];
  const claimedInPass = new Set<string>();

  for (const deposit of pending) {
    const expectedSun = usdtToSun(deposit.amount);
    const createdMs = new Date(deposit.createdAt).getTime();
    const minTs = createdMs - LOOKBACK_MS;
    const toAddr = (deposit.depositAddress || watchAddress).toLowerCase();

    const match = transfers.find((t) => {
      if (claimedInPass.has(t.txId) || usedTx.has(t.txId)) return false;
      if (Math.abs(t.amountSun - expectedSun) > 1) return false;
      if (t.blockTimestamp && t.blockTimestamp < minTs) return false;
      if (t.to && t.to.toLowerCase() !== toAddr) return false;
      return true;
    });

    if (!match) continue;

    claimedInPass.add(match.txId);
    usedTx.add(match.txId);

    const credited = await creditDeposit({
      depositId: deposit.id,
      txHash: match.txId,
      notes: "Depósito USDT-TRC20 a tu wallet fija detectado (TronGrid)",
    });
    if (credited) settled.push(deposit.id);
  }

  return { settled };
}
