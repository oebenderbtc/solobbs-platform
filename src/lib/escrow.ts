import { prisma } from "./prisma";
import { distributeReferralCommissions } from "./referrals";
import { formatUSDT } from "./crypto-format";
import { smartEscrowRelease } from "./smart-escrow";

export async function releaseEscrow(
  escrowId: string,
  opts?: { skipArrivalCheck?: boolean },
) {
  const escrow = await prisma.escrow.findUnique({
    where: { id: escrowId },
    include: {
      job: true,
      model: {
        select: {
          id: true,
          usdtPayoutAddress: true,
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
  const net = Math.round((escrow.amount - feeUsdt) * 100) / 100;

  const onChain = await smartEscrowRelease({
    escrowId: escrow.id,
    amountUsdt: escrow.amount,
    feeUsdt,
    netUsdt: net,
    modelPayoutAddress: escrow.model.usdtPayoutAddress,
    treasuryAddress: settings?.cryptoWalletUsdt || "",
    contractAddress: settings?.escrowContractAddress || "",
    chain: escrow.chain || settings?.escrowChain || "POLYGON",
  });

  await prisma.$transaction([
    prisma.escrow.update({
      where: { id: escrowId },
      data: {
        status: "RELEASED",
        fee: feeUsdt,
        releasedAt: new Date(),
        releaseTxHash: onChain.releaseTxHash,
        notes: `Auto-release SC · fee ${feeUsdt} USDT · ${onChain.message}`,
      },
    }),
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
        title: "Escrow liberado (auto)",
        body: `Contrato liberó ${formatUSDT(net)}. Fee plataforma ${formatUSDT(feeUsdt)}. Tx: ${onChain.releaseTxHash.slice(0, 12)}…`,
        link: "/dashboard/wallet",
      },
    }),
  ]);

  await distributeReferralCommissions(escrow.modelId, net);
  return { net, fee: feeUsdt, releaseTxHash: onChain.releaseTxHash, automated: true };
}
