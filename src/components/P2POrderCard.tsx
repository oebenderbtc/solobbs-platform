"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MapPin, ShieldCheck, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatUSDT } from "@/lib/crypto-format";
import { useLocale } from "@/i18n/LocaleProvider";

export type P2PEscrow = {
  id: string;
  amount: number;
  status: string;
  paymentMethod?: string;
  buyerMarkedPaidAt: string | null;
  clientArrivedAt?: string | null;
  notes: string | null;
  sellerPaymentMethod?: unknown;
  job: { id: string; title: string } | null;
};

export function P2POrderCard({
  escrow,
  role,
  walletBalance,
  onAction,
  onRefreshBalance,
}: {
  escrow: P2PEscrow;
  role: string;
  walletBalance: number | null;
  onAction: (action: string) => Promise<{ error?: string; code?: string } | void>;
  onRefreshBalance?: () => void;
}) {
  const { dict } = useLocale();
  const p = dict.p2p;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isModel = role === "MODEL";
  const isClient = role === "CLIENT";
  const feeHint = Math.round(escrow.amount * 0.08 * 100) / 100;
  const netHint = Math.round((escrow.amount - feeHint) * 100) / 100;
  const arrived = Boolean(escrow.clientArrivedAt);
  const funded =
    escrow.status === "FUNDED" || escrow.status === "IN_PROGRESS";
  const canPay =
    isClient &&
    escrow.status === "PENDING" &&
    walletBalance !== null &&
    walletBalance >= escrow.amount;
  const needTopUp =
    isClient &&
    escrow.status === "PENDING" &&
    walletBalance !== null &&
    walletBalance < escrow.amount;
  const canConfirmArrival = isClient && funded && !arrived;
  const canRelease = isModel && funded && arrived;

  async function run(action: string) {
    setBusy(true);
    setError("");
    try {
      const res = await onAction(action);
      if (res && "error" in res && res.error) {
        setError(res.error);
      }
      onRefreshBalance?.();
    } finally {
      setBusy(false);
    }
  }

  const statusLabel =
    escrow.status === "PENDING"
      ? p.statusAwaitingWallet
      : funded && !arrived
        ? p.statusAwaitingArrival
        : arrived && funded
          ? p.statusReadyRelease
          : (dict.status as Record<string, string>)[escrow.status] || escrow.status;

  return (
    <div className="w-full max-w-sm rounded-2xl border border-champagne/35 bg-ink/80 p-3.5 text-left shadow-[0_0_0_1px_rgba(212,175,122,0.08)]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-champagne">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">
            {p.orderBadge}
          </span>
        </div>
        <span className="rounded-full bg-champagne/15 px-2 py-0.5 text-[10px] text-champagne">
          {statusLabel}
        </span>
      </div>

      <p className="mt-2 font-display text-lg text-cream">
        {formatUSDT(escrow.amount)}
      </p>
      <p className="text-xs text-mist">{escrow.job?.title || p.defaultTitle}</p>

      <div className="mt-3 space-y-1.5 rounded-xl bg-black/35 px-3 py-2.5 text-xs text-mist">
        <p className="flex items-center gap-1.5 text-cream">
          <Wallet className="h-3.5 w-3.5 text-champagne" />
          {p.payWithBalance}
        </p>
        {isClient && walletBalance !== null && (
          <p>
            {p.yourBalance}:{" "}
            <span className="text-champagne">{formatUSDT(walletBalance)}</span>
          </p>
        )}
        {isModel && escrow.status === "PENDING" && (
          <p>{p.waitClientWallet}</p>
        )}
        {funded && !arrived && (
          <p className="flex items-start gap-1.5 text-amber-200/90">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {isClient ? p.confirmArrivalHint : p.waitArrivalHint}
          </p>
        )}
        {canRelease && (
          <p>
            {p.releaseHint
              .replace("{net}", formatUSDT(netHint))
              .replace("{fee}", formatUSDT(feeHint))}
          </p>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {canPay && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run("pay_from_wallet")}
            className="btn-primary !py-2 text-xs"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : p.payNow}
          </button>
        )}

        {needTopUp && (
          <Link
            href="/dashboard/wallet"
            className="rounded-xl border border-champagne/40 px-3 py-2 text-xs text-champagne hover:bg-champagne/10"
          >
            {p.topUpWallet}
          </Link>
        )}

        {canConfirmArrival && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run("confirm_arrival")}
            className="btn-primary !py-2 text-xs"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              p.confirmArrival
            )}
          </button>
        )}

        {isModel && funded && !arrived && (
          <button
            type="button"
            disabled
            className="rounded-xl border border-line px-3 py-2 text-xs text-mist/50"
            title={p.waitArrivalHint}
          >
            {p.releaseLocked}
          </button>
        )}

        {canRelease && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run("release")}
            className="btn-primary !py-2 text-xs"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : p.release}
          </button>
        )}

        {["PENDING", "FUNDED", "IN_PROGRESS"].includes(escrow.status) && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run("dispute")}
            className={cn(
              "rounded-xl border border-line px-3 py-2 text-xs text-mist hover:border-rose-400/40 hover:text-rose-200",
            )}
          >
            {p.dispute}
          </button>
        )}
      </div>
    </div>
  );
}
