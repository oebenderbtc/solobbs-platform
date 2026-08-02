import { prisma } from "./prisma";
import { type CryptoAsset, mockTxHash } from "./crypto-format";

export type { CryptoAsset } from "./crypto-format";
export { formatUSDT, formatCrypto, mockTxHash } from "./crypto-format";

function looksLikeTronAddress(address: string) {
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address.trim());
}

export function isDemoTreasuryAddress(address: string | null | undefined) {
  if (!address) return true;
  return /demo/i.test(address) || !looksLikeTronAddress(address);
}

export function resolveUsdtTreasury(settingsAddress?: string | null) {
  const fromEnv = (process.env.TRON_TREASURY_USDT || "").trim();
  if (fromEnv && looksLikeTronAddress(fromEnv)) return fromEnv;
  const fromDb = (settingsAddress || "").trim();
  if (fromDb && !isDemoTreasuryAddress(fromDb)) return fromDb;
  return fromDb || fromEnv;
}

export async function getTreasury(asset: CryptoAsset) {
  const settings = await prisma.platformSettings.findUnique({
    where: { id: "default" },
  });
  if (asset === "BTC") {
    return {
      address: settings?.cryptoWalletBtc || "",
      chain: "BITCOIN",
      demo: /demo/i.test(settings?.cryptoWalletBtc || ""),
    };
  }
  if (asset === "LTC") {
    return {
      address: settings?.cryptoWalletLtc || "",
      chain: "LITECOIN",
      demo: /demo/i.test(settings?.cryptoWalletLtc || ""),
    };
  }
  const address = resolveUsdtTreasury(settings?.cryptoWalletUsdt);
  return {
    address,
    chain: "TRON",
    demo: isDemoTreasuryAddress(address),
  };
}

export async function toUsdt(amount: number, asset: CryptoAsset) {
  if (asset === "USDT") return amount;
  const settings = await prisma.platformSettings.findUnique({
    where: { id: "default" },
  });
  const price =
    asset === "BTC"
      ? settings?.btcPriceUsdt ?? 95000
      : settings?.ltcPriceUsdt ?? 85;
  return Math.round(amount * price * 100) / 100;
}
