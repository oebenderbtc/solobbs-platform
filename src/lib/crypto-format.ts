export type CryptoAsset = "USDT" | "BTC" | "LTC";

export function formatUSDT(amount: number) {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)} USDT`;
}

export function formatCrypto(amount: number, asset: CryptoAsset) {
  if (asset === "USDT") return formatUSDT(amount);
  const digits = asset === "BTC" ? 6 : 4;
  return `${amount.toFixed(digits)} ${asset}`;
}

export function mockTxHash(prefix = "0x") {
  return `${prefix}${Array.from({ length: 40 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join("")}`;
}
