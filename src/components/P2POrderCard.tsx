"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MapPin, ShieldCheck, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatUSDT } from "@/lib/crypto-format";
import { tronLinkLockUsdt, tronLinkSignRelease } from "@/lib/tron-client";
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
  onAction: (
    action: string,
    extra?: Record<string, string>,
  ) => Promise<{ error?: string; code?: string } | void>;
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
  const canPay = isClient && escrow.status === "PENDING";
  const canPayInternal =
    canPay && walletBalance !== null && walletBalance >= escrow.amount;
  const canConfirmArrival = isClient && funded && !arrived;
  const canRelease = isModel && funded && arrived;

  async function run(action: string, extra?: Record<string, string>) {
    setBusy(true);
    setError("");
    try {
      const res = await onAction(action, extra);
      if (res && "error" in res && res.error) {
        setError(res.error);
      }
      onRefreshBalance?.();
    } finally {
      setBusy(false);
    }
  }

  async function payWithTronLink() {
    setBusy(true);
    setError("");
    try {
      const infoRes = await fetch(`/api/p2p?escrowId=${escrow.id}`);
      const info = await infoRes.json();
      if (!infoRes.ok) {
        setError(info.error || p.tronPayError);
        return;
      }
      const treasury = info.payment?.treasuryAddress as string;
      if (!treasury || treasury.startsWith("TSolo")) {
        // Demo treasury — still open TronLink flow; server may be in demo mode
      }
      const { txId, fromAddress } = await tronLinkLockUsdt({
        toAddress: treasury,
        amountUsdt: escrow.amount,
      });
      await run("pay_with_tron", { txId, fromAddress });
    } catch (e) {
      setError(e instanceof Error ? e.message : p.tronPayError);
    } finally {
      setBusy(false);
    }
  }

  async function releaseWithTronLink() {
    setBusy(true);
    setError("");
    try {
      const signed = await tronLinkSignRelease({
        escrowId: escrow.id,
        amountUsdt: escrow.amount,
        netUsdt: netHint,
      });
      await run("release", {
        releaseSignature: signed.signature,
        releaseMessage: signed.message,
        releaseAddress: signed.address,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : p.tronReleaseError);
    } finally {
      setBusy(false);
    }
  }

  const statusLabel =
    escrow.status === "PENDING"
      ? p.statusAwaitingTron
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
      <p className="mt-1 text-[10px] uppercase tracking-wider text-champagne/80">
        TRON · USDT-TRC20 · TronLink
      </p>

      <div className="mt-3 space-y-1.5 rounded-xl bg-black/35 px-3 py-2.5 text-xs text-mist">
        <p className="flex items-center gap-1.5 text-cream">
          <Wallet className="h-3.5 w-3.5 text-champagne" />
          {p.payWithTron}
        </p>
        {isModel && escrow.status === "PENDING" && (
          <p>{p.waitClientTron}</p>
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
            onClick={payWithTronLink}
            className="btn-primary !py-2 text-xs"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : p.payTronNow}
          </button>
        )}

        {canPayInternal && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run("pay_from_wallet")}
            className="rounded-xl border border-line px-3 py-2 text-xs text-mist hover:text-cream"
            title={p.payWithBalance}
          >
            {p.payInternal}
          </button>
        )}

        {canPay && !canPayInternal && (
          <Link
            href="/dashboard/wallet"
            className="rounded-xl border border-line px-3 py-2 text-xs text-mist hover:text-cream"
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
            onClick={releaseWithTronLink}
            className="btn-primary !py-2 text-xs"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              p.releaseTron
            )}
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
