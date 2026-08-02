"use client";

import { cn } from "@/lib/utils";
import { useDisplayCurrency } from "@/components/DisplayCurrencyProvider";

/** Formats a USDT settlement amount in the user's display currency. */
export function PriceLabel({
  amountUsdt,
  prefix,
  className,
  showSettlementHint = true,
  compact,
}: {
  amountUsdt: number;
  prefix?: string;
  className?: string;
  /** When viewing COP/USD, show ≈ USDT underneath. */
  showSettlementHint?: boolean;
  compact?: boolean;
}) {
  const { currency, formatPrice, formatUsdt } = useDisplayCurrency();
  const primary = formatPrice(amountUsdt, { compact });

  return (
    <span className={cn("inline-flex flex-col", className)}>
      <span>
        {prefix ? `${prefix} ` : ""}
        {primary}
      </span>
      {showSettlementHint && currency !== "USDT" && (
        <span className="text-[11px] font-normal text-mist/80">
          ≈ {formatUsdt(amountUsdt)}
        </span>
      )}
    </span>
  );
}
