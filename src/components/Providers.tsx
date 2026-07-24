"use client";

import { SessionProvider } from "next-auth/react";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/config";

export function Providers({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) {
  return (
    <SessionProvider>
      <LocaleProvider locale={locale}>{children}</LocaleProvider>
    </SessionProvider>
  );
}
