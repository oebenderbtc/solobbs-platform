"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { CopyButton } from "@/components/ui/CopyButton";
import { formatDate } from "@/lib/utils";
import { formatCrypto, formatUSDT, type CryptoAsset } from "@/lib/crypto-format";
import { useLocale } from "@/i18n/LocaleProvider";
import { useSession } from "next-auth/react";

type PlatformRails = {
  usdt?: string;
  btc?: string;
  ltc?: string;
  escrowContract?: string;
  escrowChain?: string;
  btcPriceUsdt?: number;
  ltcPriceUsdt?: number;
  feePercent?: number;
  minEscrowAmount?: number;
};

type Deposit = {
  id: string;
  amount: number;
  asset?: string;
  rail: string;
  status: string;
  reference: string;
  depositAddress?: string | null;
  txHash?: string | null;
  creditedUsdt?: number | null;
  createdAt: string;
};

export default function WalletPage() {
  const { dict } = useLocale();
  const { data: session } = useSession();
  const isClient = session?.user?.role === "CLIENT";
  const [usdt, setUsdt] = useState(0);
  const [btc, setBtc] = useState(0);
  const [ltc, setLtc] = useState(0);
  const [held, setHeld] = useState(0);
  const [earned, setEarned] = useState(0);
  const [platform, setPlatform] = useState<PlatformRails>({});
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [amount, setAmount] = useState("100");
  const [asset, setAsset] = useState<CryptoAsset>("USDT");
  const [pending, setPending] = useState<Deposit | null>(null);
  const [payoutUsdt, setPayoutUsdt] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/wallet");
    const data = await res.json();
    if (!res.ok) return;
    setUsdt(data.user.walletBalance);
    setBtc(data.user.btcBalance || 0);
    setLtc(data.user.ltcBalance || 0);
    setHeld(data.user.escrowHeld);
    setEarned(data.user.totalEarned);
    setPlatform(data.platform || {});
    setDeposits(data.deposits || []);
    setPayoutUsdt(data.user.usdtPayoutAddress || "");
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createDeposit(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!value) return;
    setBusy(true);
    const res = await fetch("/api/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: value, asset }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setPending(data.deposit);
      load();
    }
  }

  async function confirmDemo(depositId: string) {
    setBusy(true);
    await fetch("/api/wallet", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ depositId, action: "confirm_demo" }),
    });
    setBusy(false);
    setPending(null);
    load();
  }

  async function savePayout(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/wallet", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save_payout",
        usdtPayoutAddress: payoutUsdt,
      }),
    });
    setBusy(false);
    load();
  }

  const previewUsdt =
    asset === "USDT"
      ? Number(amount) || 0
      : asset === "BTC"
        ? (Number(amount) || 0) * (platform.btcPriceUsdt || 95000)
        : (Number(amount) || 0) * (platform.ltcPriceUsdt || 85);

  if (loading) {
    return <p className="text-mist">{dict.common.loading}</p>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={dict.walletPage.eyebrow}
        title={dict.walletPage.title}
        description={dict.walletPage.cryptoDescription}
      />

      <div className="stat-grid">
        <StatCard
          label={dict.walletPage.availableUsdt}
          value={formatUSDT(usdt)}
          tone="champagne"
        />
        {isClient ? (
          <>
            <StatCard label="BTC depositado" value={formatCrypto(btc, "BTC")} />
            <StatCard label="LTC depositado" value={formatCrypto(ltc, "LTC")} />
          </>
        ) : (
          <>
            <StatCard
              label={dict.walletPage.held}
              value={formatUSDT(held)}
              tone="blush"
            />
            <StatCard label={dict.walletPage.earned} value={formatUSDT(earned)} />
          </>
        )}
      </div>

      <div className="surface rounded-[1.75rem] p-5 text-sm text-mist sm:p-6">
        <p className="text-cream">{dict.walletPage.scTitle}</p>
        <p className="mt-2">{dict.walletPage.scBody}</p>
        <p className="mt-3 font-mono text-xs text-champagne">
          {platform.escrowChain} · {platform.escrowContract}
        </p>
        <p className="mt-1 text-xs">
          Fee automático: {platform.feePercent ?? 8}% al liberar
        </p>
      </div>

      {isClient && (
        <div className="grid gap-5 lg:grid-cols-2">
          <form
            onSubmit={createDeposit}
            className="surface space-y-3 rounded-[1.75rem] p-5 sm:p-6"
          >
            <h2 className="font-display text-2xl tracking-tight">
              {dict.walletPage.depositCrypto}
            </h2>
            <p className="text-sm text-mist">{dict.walletPage.depositCryptoBody}</p>
            <select
              value={asset}
              onChange={(e) => setAsset(e.target.value as CryptoAsset)}
              className="input-field"
            >
              <option value="USDT">USDT (TRC20/settlement)</option>
              <option value="BTC">BTC</option>
              <option value="LTC">LTC</option>
            </select>
            <input
              className="input-field"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={dict.walletPage.depositAmount}
            />
            <p className="text-xs text-mist">
              ≈ {formatUSDT(previewUsdt)} a acreditar (settlement)
            </p>
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : (
                dict.walletPage.createDeposit
              )}
            </button>
          </form>

          <div className="surface space-y-4 rounded-[1.75rem] p-5 sm:p-6">
            <h2 className="font-display text-2xl tracking-tight">
              {dict.walletPage.treasury}
            </h2>
            <div className="rounded-2xl bg-ink/50 p-4">
              <p className="text-sm text-mist">USDT treasury</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="break-all font-mono text-sm text-champagne">
                  {platform.usdt}
                </p>
                <CopyButton value={platform.usdt || ""} />
              </div>
            </div>
            <div className="rounded-2xl bg-ink/50 p-4">
              <p className="text-sm text-mist">BTC treasury</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="break-all font-mono text-sm text-champagne">
                  {platform.btc}
                </p>
                <CopyButton value={platform.btc || ""} />
              </div>
            </div>
            <div className="rounded-2xl bg-ink/50 p-4">
              <p className="text-sm text-mist">LTC treasury</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="break-all font-mono text-sm text-champagne">
                  {platform.ltc}
                </p>
                <CopyButton value={platform.ltc || ""} />
              </div>
            </div>

            {pending && (
              <div className="rounded-2xl border border-champagne/30 bg-champagne/10 p-4">
                <p className="text-sm text-cream">
                  {dict.walletPage.pendingRef}:{" "}
                  <span className="font-mono text-champagne">{pending.reference}</span>
                </p>
                <p className="mt-1 text-xs text-mist">
                  {formatCrypto(pending.amount, (pending.asset as CryptoAsset) || "USDT")}{" "}
                  → ~{formatUSDT(pending.creditedUsdt || 0)}
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => confirmDemo(pending.id)}
                  className="btn-primary mt-3 w-full !py-2 text-sm"
                >
                  {dict.walletPage.confirmOnChain}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <form
        onSubmit={savePayout}
        className="surface max-w-xl space-y-3 rounded-[1.75rem] p-5 sm:p-6"
      >
        <h2 className="font-display text-2xl tracking-tight">
          {dict.walletPage.payoutTitle}
        </h2>
        <p className="text-sm text-mist">{dict.walletPage.payoutBody}</p>
        <input
          className="input-field"
          value={payoutUsdt}
          onChange={(e) => setPayoutUsdt(e.target.value)}
          placeholder="USDT payout address (TRC20/ERC20)"
        />
        <button type="submit" disabled={busy} className="btn-primary">
          {dict.common.save}
        </button>
      </form>

      <div className="surface rounded-[1.75rem] p-5 sm:p-6">
        <h2 className="font-display text-2xl tracking-tight">
          {dict.walletPage.deposits}
        </h2>
        <div className="mt-4 space-y-2">
          {deposits.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-2xl bg-ink/45 px-4 py-3"
            >
              <div>
                <p className="text-sm text-cream">
                  {formatCrypto(d.amount, (d.asset as CryptoAsset) || "USDT")}
                  {d.creditedUsdt != null && (
                    <span className="text-mist"> → {formatUSDT(d.creditedUsdt)}</span>
                  )}
                </p>
                <p className="text-xs text-mist">
                  {d.reference} · {formatDate(d.createdAt)}
                  {d.txHash ? ` · ${d.txHash.slice(0, 12)}…` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={d.status} />
                {d.status === "PENDING" && isClient && (
                  <button
                    type="button"
                    onClick={() => confirmDemo(d.id)}
                    className="text-xs text-champagne hover:underline"
                  >
                    {dict.walletPage.confirmOnChain}
                  </button>
                )}
              </div>
            </div>
          ))}
          {deposits.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-mist">
              <Wallet className="h-4 w-4" />
              {dict.walletPage.empty}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
