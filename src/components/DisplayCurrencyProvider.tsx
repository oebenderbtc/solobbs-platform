"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CURRENCY_COOKIE,
  FALLBACK_FX,
  formatDisplayAmount,
  type DisplayCurrency,
  type FxRates,
} from "@/lib/display-currency";

type DisplayCurrencyContextValue = {
  currency: DisplayCurrency;
  setCurrency: (c: DisplayCurrency) => void;
  rates: FxRates;
  ratesLoading: boolean;
  formatPrice: (amountUsdt: number, opts?: { compact?: boolean }) => string;
  formatUsdt: (amountUsdt: number) => string;
  refreshRates: () => Promise<void>;
};

const DisplayCurrencyContext =
  createContext<DisplayCurrencyContextValue | null>(null);

function readCookie(): DisplayCurrency {
  if (typeof document === "undefined") return "USD";
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CURRENCY_COOKIE}=`));
  const raw = match?.split("=")[1];
  if (raw === "COP") return "COP";
  return "USD";
}

export function DisplayCurrencyProvider({
  children,
  initial = "USD",
}: {
  children: ReactNode;
  initial?: DisplayCurrency;
}) {
  const boot: DisplayCurrency = initial === "COP" ? "COP" : "USD";
  const [currency, setCurrencyState] = useState<DisplayCurrency>(boot);
  const [rates, setRates] = useState<FxRates>(FALLBACK_FX);
  const [ratesLoading, setRatesLoading] = useState(true);

  const refreshRates = useCallback(async () => {
    try {
      const res = await fetch("/api/fx", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as FxRates;
      if (data?.copPerUsdt > 0 && data?.usdPerUsdt > 0) {
        setRates(data);
      }
    } catch {
      // keep last known / fallback
    } finally {
      setRatesLoading(false);
    }
  }, []);

  useEffect(() => {
    const fromCookie = readCookie();
    if (fromCookie !== currency) setCurrencyState(fromCookie);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refreshRates();
    const id = window.setInterval(refreshRates, 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [refreshRates]);

  const setCurrency = useCallback((next: DisplayCurrency) => {
    if (next !== "USD" && next !== "COP") return;
    setCurrencyState(next);
    document.cookie = `${CURRENCY_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  }, []);

  const formatPrice = useCallback(
    (amountUsdt: number, opts?: { compact?: boolean }) =>
      formatDisplayAmount(amountUsdt, currency, { ...opts, rates }),
    [currency, rates],
  );

  const formatUsdt = useCallback(
    (amountUsdt: number) => formatDisplayAmount(amountUsdt, "USDT"),
    [],
  );

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      rates,
      ratesLoading,
      formatPrice,
      formatUsdt,
      refreshRates,
    }),
    [
      currency,
      setCurrency,
      rates,
      ratesLoading,
      formatPrice,
      formatUsdt,
      refreshRates,
    ],
  );

  return (
    <DisplayCurrencyContext.Provider value={value}>
      {children}
    </DisplayCurrencyContext.Provider>
  );
}

export function useDisplayCurrency() {
  const ctx = useContext(DisplayCurrencyContext);
  if (!ctx) {
    throw new Error("useDisplayCurrency must be used within DisplayCurrencyProvider");
  }
  return ctx;
}
