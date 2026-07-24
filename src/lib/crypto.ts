import { prisma } from "./prisma";
import { type CryptoAsset, mockTxHash } from "./crypto-format";

export type { CryptoAsset } from "./crypto-format";
export { formatUSDT, formatCrypto, mockTxHash } from "./crypto-format";

export async function getTreasury(asset: CryptoAsset) {
  const settings = await prisma.platformSettings.findUnique({
    where: { id: "default" },
  });
  if (asset === "BTC") {
    return {
      address: settings?.cryptoWalletBtc || "",
      chain: "BITCOIN",
    };
  }
  if (asset === "LTC") {
    return {
      address: settings?.cryptoWalletLtc || "",
      chain: "LITECOIN",
    };
  }
  return {
    address: settings?.cryptoWalletUsdt || "",
    chain: "TRON",
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
