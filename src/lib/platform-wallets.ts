import "server-only";
import { prisma } from "@/lib/prisma";
import { resolveUsdtTreasury } from "@/lib/crypto";
import {
  decryptTronPrivateKey,
  encryptTronPrivateKey,
} from "@/lib/tron-wallet";

/** Company wallet that receives the platform fee (8%). */
export async function getCompanyFeeWallet() {
  const settings = await prisma.platformSettings.findUnique({
    where: { id: "default" },
  });
  const fromDb = (settings?.companyFeeWallet || "").trim();
  if (fromDb) return fromDb;
  return resolveUsdtTreasury(settings?.cryptoWalletUsdt);
}

/** Public address of the gas/hot wallet (TRX + USDT for transfers). */
export async function getGasWalletAddress() {
  const settings = await prisma.platformSettings.findUnique({
    where: { id: "default" },
  });
  const fromDb = (settings?.gasWalletAddress || "").trim();
  if (fromDb) return fromDb;
  return (process.env.TRON_GAS_WALLET_ADDRESS || "").trim();
}

/**
 * Private key used to sign withdrawals and auto-splits.
 * Prefer admin-configured encrypted key; fallback to env.
 */
export async function getGasWalletPrivateKey(): Promise<string | null> {
  const settings = await prisma.platformSettings.findUnique({
    where: { id: "default" },
  });
  const enc = (settings?.gasWalletKeyEnc || "").trim();
  if (enc) {
    try {
      return decryptTronPrivateKey(enc);
    } catch {
      // fall through to env
    }
  }
  const fromEnv = (process.env.TRON_HOT_WALLET_PRIVATE_KEY || "").trim();
  return fromEnv || null;
}

export function encryptGasWalletPrivateKey(privateKey: string) {
  return encryptTronPrivateKey(privateKey.replace(/^0x/, "").trim());
}
