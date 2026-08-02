"use client";

import { SessionProvider } from "next-auth/react";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { DisplayCurrencyProvider } from "@/components/DisplayCurrencyProvider";
import type { Locale } from "@/i18n/config";
import type { DisplayCurrency } from "@/lib/display-currency";

export function Providers({
  children,
  locale,
  currency = "USD",
}: {
  children: React.ReactNode;
  locale: Locale;
  currency?: DisplayCurrency;
}) {
  return (
    <SessionProvider>
      <LocaleProvider locale={locale}>
        <DisplayCurrencyProvider initial={currency}>
          {children}
        </DisplayCurrencyProvider>
      </LocaleProvider>
    </SessionProvider>
  );
}
