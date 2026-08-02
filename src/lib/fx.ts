import "server-only";
import { FALLBACK_FX, type FxRates } from "@/lib/display-currency";

export type { FxRates };

const CACHE_MS = 5 * 60 * 1000;
let cache: { at: number; rates: FxRates } | null = null;

function fallbackRates(): FxRates {
  const envCop = Number(process.env.NEXT_PUBLIC_COP_PER_USDT || "4100");
  const cop = Number.isFinite(envCop) && envCop > 0 ? envCop : 4100;
  return {
    ...FALLBACK_FX,
    copPerUsdt: cop,
    copPerUsd: cop,
    updatedAt: new Date().toISOString(),
    source: "fallback",
  };
}

async function fromCoinGecko(): Promise<FxRates | null> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd,cop",
    { next: { revalidate: 300 }, signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    tether?: { usd?: number; cop?: number };
  };
  const usd = data.tether?.usd;
  const cop = data.tether?.cop;
  if (!usd || !cop || usd <= 0 || cop <= 0) return null;
  return {
    usdPerUsdt: usd,
    copPerUsdt: cop,
    copPerUsd: cop / usd,
    updatedAt: new Date().toISOString(),
    source: "coingecko",
  };
}

async function fromOpenErApi(): Promise<FxRates | null> {
  const res = await fetch("https://open.er-api.com/v6/latest/USD", {
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    rates?: { COP?: number };
  };
  const cop = data.rates?.COP;
  if (!cop || cop <= 0) return null;
  return {
    usdPerUsdt: 1,
    copPerUsdt: cop,
    copPerUsd: cop,
    updatedAt: new Date().toISOString(),
    source: "open.er-api",
  };
}

export async function getLiveFxRates(): Promise<FxRates> {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return cache.rates;
  }

  let rates: FxRates | null = null;
  try {
    rates = await fromCoinGecko();
  } catch {
    rates = null;
  }
  if (!rates) {
    try {
      rates = await fromOpenErApi();
    } catch {
      rates = null;
    }
  }

  if (!rates) rates = fallbackRates();

  cache = { at: Date.now(), rates };
  return rates;
}
