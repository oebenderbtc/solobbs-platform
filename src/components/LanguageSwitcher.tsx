"use client";

import { cn } from "@/lib/utils";
import { useLocale } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/config";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, isPending, t } = useLocale();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-line bg-ink/40 p-0.5 text-xs",
        className,
      )}
      role="group"
      aria-label={t("common.language")}
    >
      {(["es", "en"] as Locale[]).map((code) => (
        <button
          key={code}
          type="button"
          disabled={isPending}
          onClick={() => setLocale(code)}
          className={cn(
            "rounded-full px-2.5 py-1 font-medium uppercase tracking-wide transition",
            locale === code
              ? "bg-champagne/20 text-champagne"
              : "text-mist hover:text-cream",
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
