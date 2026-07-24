"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { dictionaries, type Dictionary } from "./dictionaries";
import type { Locale } from "./config";

type LocaleContextValue = {
  locale: Locale;
  dict: Dictionary;
  t: (path: string, vars?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
  isPending: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function translate(
  dict: Dictionary,
  path: string,
  vars?: Record<string, string | number>,
) {
  const parts = path.split(".");
  let cur: unknown = dict;
  for (const part of parts) {
    if (cur && typeof cur === "object" && part in cur) {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return path;
    }
  }
  if (typeof cur !== "string") return path;
  if (!vars) return cur;
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    cur,
  );
}

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const dict = dictionaries[locale];

  const setLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return;
      startTransition(async () => {
        await fetch("/api/locale", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale: next }),
        });
        document.documentElement.lang = next;
        router.refresh();
      });
    },
    [locale, router],
  );

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>) =>
      translate(dict, path, vars),
    [dict],
  );

  const value = useMemo(
    () => ({ locale, dict, t, setLocale, isPending }),
    [locale, dict, t, setLocale, isPending],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

export function useT() {
  return useLocale().t;
}
