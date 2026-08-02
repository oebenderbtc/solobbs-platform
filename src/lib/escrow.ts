import { prisma } from "./prisma";
import {
  applyReferralCommissionsLedger,
  computeReferralSplits,
} from "./referrals";
import { formatUSDT } from "./crypto-format";
import { smartEscrowRelease } from "./smart-escrow";
import { getCompanyFeeWallet } from "./platform-wallets";

export async function releaseEscrow(
  escrowId: string,
  opts?: { skipArrivalCheck?: boolean; releaseTxHash?: string },
) {
  const escrow = await prisma.escrow.findUnique({
    where: { id: escrowId },
    include: {
      job: true,
      model: {
        select: {
          id: true,
          usdtPayoutAddress: true,
          tronAddress: true,
          name: true,
        },
      },
    },
  });

  if (!escrow || (escrow.status !== "FUNDED" && escrow.status !== "IN_PROGRESS")) {
    throw new Error("Escrow no liberable");
  }

  if (!opts?.skipArrivalCheck && !escrow.clientArrivedAt) {
    throw new Error(
      "El cliente aún no confirmó que la modelo llegó a la cita",
    );
  }

  const settings = await prisma.platformSettings.findUnique({
    where: { id: "default" },
  });
  const feePercent = settings?.platformFeePercent ?? 8;
  const feeUsdt = Math.round(((escrow.amount * feePercent) / 100) * 100) / 100;
  const afterFee = Math.round((escrow.amount - feeUsdt) * 100) / 100;

  const referralSplits = await computeReferralSplits(escrow.modelId, afterFee);
  const referralTotal =
    Math.round(referralSplits.reduce((a, s) => a + s.amount, 0) * 100) / 100;
  const net =
    Math.round(Math.max(0, afterFee - referralTotal) * 100) / 100;

  const companyFeeWallet = await getCompanyFeeWallet();

  const onChain = await smartEscrowRelease({
    escrowId: escrow.id,
    amountUsdt: escrow.amount,
    feeUsdt,
    netUsdt: net,
    modelPayoutAddress:
      escrow.model.tronAddress || escrow.model.usdtPayoutAddress,
    treasuryAddress: companyFeeWallet,
    contractAddress: settings?.escrowContractAddress || "",
    chain: escrow.chain || settings?.escrowChain || "TRON",
    releaseTxHash: opts?.releaseTxHash,
    referralSplits,
  });

  await prisma.$transaction([
    prisma.escrow.update({
      where: { id: escrowId },
      data: {
        status: "RELEASED",
        fee: feeUsdt,
        releasedAt: new Date(),
        releaseTxHash: onChain.releaseTxHash,
        notes: `Auto-split · fee ${feeUsdt} · referidos ${referralTotal} · neto ${net} · ${onChain.message}`,
      },
    }),
    // If on-chain payout succeeded, USDT already left treasury — still mirror on ledger
    // so SoloBBs balances stay consistent for spending/withdraw UX.
    prisma.user.update({
      where: { id: escrow.modelId },
      data: {
        walletBalance: { increment: net },
        escrowHeld: { decrement: escrow.amount },
        totalEarned: { increment: net },
        totalJobs: { increment: 1 },
      },
    }),
    ...(escrow.jobId
      ? [
          prisma.job.update({
            where: { id: escrow.jobId },
            data: { status: "COMPLETED", completedAt: new Date() },
          }),
        ]
      : []),
    prisma.notification.create({
      data: {
        userId: escrow.modelId,
        title: "Escrow liberado (split automático)",
        body: `Neto ${formatUSDT(net)} · fee plataforma ${formatUSDT(feeUsdt)} · comisiones red ${formatUSDT(referralTotal)}.`,
        link: "/dashboard/wallet",
      },
    }),
  ]);

  await applyReferralCommissionsLedger(escrow.modelId, referralSplits);

  return {
    net,
    fee: feeUsdt,
    referralTotal,
    referralSplits,
    releaseTxHash: onChain.releaseTxHash,
    automated: true,
  };
}
