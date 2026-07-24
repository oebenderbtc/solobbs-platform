"use client";

import { cn } from "@/lib/utils";
import { useLocale } from "@/i18n/LocaleProvider";

const styles: Record<string, string> = {
  PENDING: "bg-warning/15 text-warning ring-warning/20",
  FUNDED: "bg-champagne/15 text-champagne ring-champagne/20",
  IN_PROGRESS: "bg-blush/15 text-blush ring-blush/20",
  RELEASED: "bg-success/15 text-success ring-success/20",
  REFUNDED: "bg-mist/15 text-mist ring-mist/20",
  DISPUTED: "bg-danger/15 text-danger ring-danger/20",
  SCHEDULED: "bg-champagne/15 text-champagne ring-champagne/20",
  ACTIVE: "bg-blush/15 text-blush ring-blush/20",
  COMPLETED: "bg-success/15 text-success ring-success/20",
  CANCELLED: "bg-mist/15 text-mist ring-mist/20",
  NO_SHOW: "bg-danger/15 text-danger ring-danger/20",
  FAILED: "bg-danger/15 text-danger ring-danger/20",
  CARD: "bg-champagne/15 text-champagne ring-champagne/20",
  CRYPTO: "bg-blush/15 text-blush ring-blush/20",
  WALLET: "bg-mist/15 text-mist ring-mist/20",
};

export function StatusBadge({ status }: { status: string }) {
  const { dict } = useLocale();
  const labels = dict.status as Record<string, string>;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset",
        styles[status] || "bg-mist/15 text-mist ring-mist/20",
      )}
    >
      {labels[status] || status}
    </span>
  );
}
