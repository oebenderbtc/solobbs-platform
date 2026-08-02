"use client";

import { cn } from "@/lib/utils";
import type { DisplayCurrency } from "@/lib/display-currency";
import { useDisplayCurrency } from "@/components/DisplayCurrencyProvider";
import { useLocale } from "@/i18n/LocaleProvider";

const VISIBLE_CURRENCIES: DisplayCurrency[] = ["USD", "COP"];

export function CurrencySwitcher({ className }: { className?: string }) {
  const { currency, setCurrency } = useDisplayCurrency();
  const { t } = useLocale();

  const active: DisplayCurrency = currency === "COP" ? "COP" : "USD";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-line bg-ink/40 p-0.5 text-[11px]",
        className,
      )}
      role="group"
      aria-label={t("common.currency")}
      title={t("common.currencyHint")}
    >
      {VISIBLE_CURRENCIES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setCurrency(code)}
          className={cn(
            "rounded-full px-2 py-1 font-medium tracking-wide transition",
            active === code
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
