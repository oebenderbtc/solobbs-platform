"use client";

import QRCode from "react-qr-code";
import { CopyButton } from "@/components/ui/CopyButton";
import { cn } from "@/lib/utils";

export function AddressQr({
  address,
  label,
  amountHint,
  networkHint,
  className,
}: {
  address: string;
  label?: string;
  amountHint?: string;
  networkHint?: string;
  className?: string;
}) {
  if (!address) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="mx-auto w-fit rounded-2xl bg-white p-3">
        <QRCode value={address} size={168} level="M" />
      </div>
      {label && <p className="text-center text-sm text-mist">{label}</p>}
      {networkHint && (
        <p className="text-center text-xs font-medium text-champagne">{networkHint}</p>
      )}
      {amountHint && (
        <p className="text-center text-sm text-cream">{amountHint}</p>
      )}
      <div className="flex items-start justify-between gap-2 rounded-2xl bg-ink/50 p-3">
        <p className="break-all font-mono text-xs text-champagne sm:text-sm">{address}</p>
        <CopyButton value={address} />
      </div>
    </div>
  );
}
