"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/LocaleProvider";

export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const copyLabel = label ?? t("common.copy");

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-mist transition hover:border-champagne/40 hover:text-cream",
        className,
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? t("common.copied") : copyLabel}
    </button>
  );
}
