export type FxRates = {
  /** USD per 1 USDT */
  usdPerUsdt: number;
  /** COP per 1 USDT */
  copPerUsdt: number;
  /** COP per 1 USD (dólar / TRM aprox.) */
  copPerUsd: number;
  updatedAt: string;
  source: string;
};

export const FALLBACK_FX: FxRates = {
  usdPerUsdt: 1,
  copPerUsdt: 4100,
  copPerUsd: 4100,
  updatedAt: new Date(0).toISOString(),
  source: "fallback",
};

export const DISPLAY_CURRENCIES = ["USDT", "USD", "COP"] as const;
export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

export const CURRENCY_COOKIE = "solobbs_currency";

export function usdtToDisplay(
  amountUsdt: number,
  currency: DisplayCurrency,
  rates: FxRates = FALLBACK_FX,
) {
  if (currency === "COP") return amountUsdt * rates.copPerUsdt;
  if (currency === "USD") return amountUsdt * rates.usdPerUsdt;
  return amountUsdt;
}

export function formatDisplayAmount(
  amountUsdt: number,
  currency: DisplayCurrency,
  opts?: { compact?: boolean; rates?: FxRates },
) {
  const rates = opts?.rates || FALLBACK_FX;
  const value = usdtToDisplay(amountUsdt, currency, rates);

  if (currency === "USDT") {
    return `${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: opts?.compact ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value)} USDT`;
  }

  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: opts?.compact ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatFxChip(rates: FxRates, currency: DisplayCurrency) {
  if (currency === "COP") {
    return `1 USDT ≈ ${new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(rates.copPerUsdt)}`;
  }
  return `1 USDT ≈ ${new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(rates.usdPerUsdt)}`;
}

export function isDisplayCurrency(v: unknown): v is DisplayCurrency {
  return (
    typeof v === "string" &&
    (DISPLAY_CURRENCIES as readonly string[]).includes(v)
  );
}
