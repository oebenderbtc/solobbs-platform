import "server-only";
import { prisma } from "@/lib/prisma";
import { generateCustodialTronWallet } from "@/lib/tron-wallet";

/**
 * Ensures the user has a TRON address. Creates a custodial wallet if missing.
 * Does not overwrite an existing TronLink-linked address.
 */
export async function ensureUserTronWallet(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      tronAddress: true,
      tronPrivateKeyEnc: true,
      usdtPayoutAddress: true,
    },
  });
  if (!user) return null;

  if (user.tronAddress) {
    // Keep payout locked to the permanent TRON address
    if (user.usdtPayoutAddress !== user.tronAddress) {
      return prisma.user.update({
        where: { id: userId },
        data: { usdtPayoutAddress: user.tronAddress },
        select: {
          id: true,
          tronAddress: true,
          usdtPayoutAddress: true,
          tronPrivateKeyEnc: true,
        },
      });
    }
    return user;
  }

  const wallet = await generateCustodialTronWallet();
  return prisma.user.update({
    where: { id: userId },
    data: {
      tronAddress: wallet.address,
      tronPrivateKeyEnc: wallet.privateKeyEnc,
      usdtPayoutAddress: wallet.address,
    },
    select: {
      id: true,
      tronAddress: true,
      usdtPayoutAddress: true,
      tronPrivateKeyEnc: true,
    },
  });
}
