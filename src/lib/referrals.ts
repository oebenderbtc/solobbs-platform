import { prisma } from "./prisma";
import { REFERRAL_PERCENTS } from "./utils";
import { formatUSDT } from "./crypto-format";

export type ReferralSplit = {
  earnerId: string;
  earnerName: string;
  level: number;
  percent: number;
  amount: number;
  tronAddress: string | null;
};

/** Walk up to 3 referral levels and compute USDT amounts from a base (usually net after platform fee). */
export async function computeReferralSplits(
  sourceUserId: string,
  baseAmount: number,
): Promise<ReferralSplit[]> {
  const settings = await prisma.platformSettings.findUnique({
    where: { id: "default" },
  });

  const percents = [
    settings?.referralL1Percent ?? REFERRAL_PERCENTS[0],
    settings?.referralL2Percent ?? REFERRAL_PERCENTS[1],
    settings?.referralL3Percent ?? REFERRAL_PERCENTS[2],
  ];

  const splits: ReferralSplit[] = [];
  let current = await prisma.user.findUnique({
    where: { id: sourceUserId },
    select: { referredById: true, name: true },
  });

  for (let level = 0; level < 3; level++) {
    if (!current?.referredById) break;

    const earnerId = current.referredById;
    const percent = percents[level];
    const amount = Math.round(((baseAmount * percent) / 100) * 100) / 100;

    const earner = await prisma.user.findUnique({
      where: { id: earnerId },
      select: {
        id: true,
        name: true,
        referredById: true,
        tronAddress: true,
        usdtPayoutAddress: true,
      },
    });
    if (!earner) break;

    if (amount > 0) {
      splits.push({
        earnerId: earner.id,
        earnerName: earner.name,
        level: level + 1,
        percent,
        amount,
        tronAddress: earner.tronAddress || earner.usdtPayoutAddress || null,
      });
    }

    current = {
      referredById: earner.referredById,
      name: earner.name,
    };
  }

  return splits;
}

/**
 * Credits referral commissions on the SoloBBs ledger (and notifications).
 * Call after on-chain / smart-escrow settlement so amounts match the automatic split.
 */
export async function applyReferralCommissionsLedger(
  sourceUserId: string,
  splits: ReferralSplit[],
  opts?: { creditWallet?: boolean },
) {
  const creditWallet = opts?.creditWallet !== false;
  for (const split of splits) {
    await prisma.$transaction([
      prisma.commission.create({
        data: {
          amount: split.amount,
          level: split.level,
          percent: split.percent,
          description: creditWallet
            ? `Nivel ${split.level} · referido (auto split)`
            : `Nivel ${split.level} · referido (pagado on-chain)`,
          earnerId: split.earnerId,
          sourceId: sourceUserId,
        },
      }),
      prisma.user.update({
        where: { id: split.earnerId },
        data: {
          ...(creditWallet
            ? { walletBalance: { increment: split.amount } }
            : {}),
          totalEarned: { increment: split.amount },
        },
      }),
      prisma.notification.create({
        data: {
          userId: split.earnerId,
          title: `Comisión nivel ${split.level}`,
          body: creditWallet
            ? `Recibiste ${formatUSDT(split.amount)} por tu red (split automático al liberar).`
            : `Comisión ${formatUSDT(split.amount)} enviada on-chain a tu wallet TRON.`,
          link: "/dashboard/network",
        },
      }),
    ]);
  }
}

/** @deprecated Prefer computeReferralSplits + applyReferralCommissionsLedger */
export async function distributeReferralCommissions(
  sourceUserId: string,
  baseAmount: number,
) {
  const splits = await computeReferralSplits(sourceUserId, baseAmount);
  await applyReferralCommissionsLedger(sourceUserId, splits);
  return splits;
}
