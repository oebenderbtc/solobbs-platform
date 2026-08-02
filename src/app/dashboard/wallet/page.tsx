"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { CopyButton } from "@/components/ui/CopyButton";
import { formatDate } from "@/lib/utils";
import { formatCrypto, formatUSDT, type CryptoAsset } from "@/lib/crypto-format";
import { tronLinkLockUsdt } from "@/lib/tron-client";
import { AddressQr } from "@/components/ui/AddressQr";
import { useLocale } from "@/i18n/LocaleProvider";
import { useSession } from "next-auth/react";

type PlatformRails = {
  usdt?: string;
  usdtDemo?: boolean;
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
  const { dict, t } = useLocale();
  const { data: session } = useSession();
  const isClient = session?.user?.role === "CLIENT";
  const [usdt, setUsdt] = useState(0);
  const [btc, setBtc] = useState(0);
  const [ltc, setLtc] = useState(0);
  const [held, setHeld] = useState(0);
  const [earned, setEarned] = useState(0);
  const [platform, setPlatform] = useState<PlatformRails>({});
  const [demoMode, setDemoMode] = useState(true);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [amount, setAmount] = useState("10");
  const [asset, setAsset] = useState<CryptoAsset>("USDT");
  const [pending, setPending] = useState<Deposit | null>(null);
  const [txIdInput, setTxIdInput] = useState("");
  const [showManualTx, setShowManualTx] = useState(false);
  const [watching, setWatching] = useState(false);
  const [error, setError] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawTo, setWithdrawTo] = useState("");
  const [tronAddress, setTronAddress] = useState("");
  const [custodialWallet, setCustodialWallet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const payAddress =
    asset === "BTC"
      ? platform.btc
      : asset === "LTC"
        ? platform.ltc
        : tronAddress || platform.usdt;
  const networkHint =
    asset === "BTC"
      ? dict.walletPage.qrNetworkBtc
      : asset === "LTC"
        ? dict.walletPage.qrNetworkLtc
        : dict.walletPage.qrNetworkUsdt;
  const displayAmount = Number(amount) || 0;
  const activePending =
    pending && (pending.asset || "USDT") === asset ? pending : null;

  async function load() {
    const res = await fetch("/api/wallet");
    const data = await res.json();
    if (!res.ok) return null;
    setUsdt(data.user.walletBalance);
    setBtc(data.user.btcBalance || 0);
    setLtc(data.user.ltcBalance || 0);
    setHeld(data.user.escrowHeld);
    setEarned(data.user.totalEarned);
    setPlatform(data.platform || {});
    setDemoMode(Boolean(data.demoMode));
    setDeposits(data.deposits || []);
    setTronAddress(data.user.tronAddress || "");
    setCustodialWallet(Boolean(data.user.custodialWallet));
    setWithdrawTo((prev) => prev || data.user.tronAddress || "");
    const open = (data.deposits as Deposit[] | undefined)?.find(
      (d) => d.status === "PENDING",
    );
    setPending(open || null);
    if (Array.isArray(data.settled) && data.settled.length > 0) {
      setToastMsg(dict.walletPage.creditedAuto);
      setTimeout(() => setToastMsg(""), 4000);
    }
    setLoading(false);
    return open || null;
  }

  useEffect(() => {
    load();
  }, []);

  // Auto-detect USDT payment while a matching pending deposit exists
  useEffect(() => {
      if (
      !activePending ||
      (activePending.asset || "USDT") !== "USDT" ||
      !tronAddress
    ) {
      setWatching(false);
      return;
    }
    setWatching(true);
    const id = window.setInterval(() => {
      load();
    }, 6000);
    return () => window.clearInterval(id);
  }, [activePending?.id, tronAddress]);

  async function createDeposit(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!value) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/wallet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: value, asset }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || dict.walletPage.depositError);
      return;
    }
    setPending(data.deposit);
    load();
  }

  async function confirmDemo(depositId: string) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/wallet", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ depositId, action: "confirm_demo" }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || dict.walletPage.confirmError);
      return;
    }
    setPending(null);
    load();
  }

  async function confirmTx(depositId: string, txId: string, fromAddress?: string) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/wallet", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        depositId,
        action: "confirm",
        txId,
        fromAddress,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || dict.walletPage.confirmError);
      return;
    }
    setPending(null);
    setTxIdInput("");
    load();
  }

  async function payWithTronLink(deposit: Deposit) {
    const toAddress = deposit.depositAddress || tronAddress || "";
    if (!toAddress) {
      setError(dict.walletPage.depositError);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { txId, fromAddress } = await tronLinkLockUsdt({
        toAddress,
        amountUsdt: deposit.amount,
      });
      await new Promise((r) => setTimeout(r, 2500));
      await confirmTx(deposit.id, txId, fromAddress);
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : dict.walletPage.confirmError);
    }
  }

  async function withdrawUsdt(e: FormEvent) {
    e.preventDefault();
    const value = Number(withdrawAmount);
    if (!value || value < 1) {
      setError(dict.walletPage.minWithdraw);
      return;
    }
    const dest = withdrawTo.trim();
    if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(dest)) {
      setError(dict.walletPage.invalidTronAddress);
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/wallet", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "withdraw",
        amount: value,
        toAddress: dest,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || dict.walletPage.withdrawError);
      return;
    }
    setWithdrawAmount("");
    setToastMsg(dict.walletPage.withdrawOk);
    setTimeout(() => setToastMsg(""), 4000);
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
          {platform.escrowChain || "TRON"} ·{" "}
          {platform.escrowContract || "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"}
        </p>
        <p className="mt-1 text-xs">
          Fee automático: {platform.feePercent ?? 8}% + comisiones de referidos (L1/L2/L3) al liberar
        </p>
      </div>

      {tronAddress && (
        <div className="surface rounded-[1.75rem] p-5 sm:p-6">
          <h2 className="font-display text-2xl tracking-tight">
            {dict.walletPage.linkedWallet}
          </h2>
          <p className="mt-1 text-sm text-mist">
            {custodialWallet
              ? dict.walletPage.linkedWalletCustodial
              : dict.walletPage.linkedWalletTronLink}
          </p>
          <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-ink/50 p-4">
            <p className="break-all font-mono text-sm text-champagne">{tronAddress}</p>
            <CopyButton value={tronAddress} />
          </div>
        </div>
      )}

      {isClient && (
        <div className="grid gap-5 lg:grid-cols-2">
          <form
            onSubmit={createDeposit}
            className="surface space-y-3 rounded-[1.75rem] p-5 sm:p-6"
          >
            <h2 className="font-display text-2xl tracking-tight">
              {dict.walletPage.depositCrypto}
            </h2>
            <p className="text-sm text-mist">
              {asset === "USDT" && !tronAddress
                ? dict.walletPage.demoTreasuryWarn
                : dict.walletPage.realDepositHint}
            </p>
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
            {error && (
              <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
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
              {dict.walletPage.anyWalletTitle}
            </h2>
            <p className="text-sm text-mist">{dict.walletPage.anyWalletBody}</p>

            {activePending && (
              <p className="text-sm text-cream">
                {dict.walletPage.pendingRef}:{" "}
                <span className="font-mono text-champagne">
                  {activePending.reference}
                </span>
              </p>
            )}

            {payAddress ? (
              <AddressQr
                key={`${asset}-${payAddress}`}
                address={payAddress}
                label={
                  asset === "USDT"
                    ? dict.walletPage.qrScanHint
                    : asset === "BTC"
                      ? dict.walletPage.qrScanHintBtc
                      : dict.walletPage.qrScanHintLtc
                }
                networkHint={networkHint}
                amountHint={
                  displayAmount > 0
                    ? t("walletPage.qrSendExact", {
                        amount: formatCrypto(displayAmount, asset),
                      })
                    : undefined
                }
              />
            ) : (
              <p className="text-sm text-danger">
                {asset === "USDT"
                  ? "Generando tu wallet fija…"
                  : "Dirección no configurada"}
              </p>
            )}

            {asset === "USDT" && tronAddress && (
              <>
                {watching && activePending && (
                  <p className="flex items-center justify-center gap-2 text-sm text-champagne">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {dict.walletPage.watchingPayment}
                  </p>
                )}
                {activePending && (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => payWithTronLink(activePending)}
                      className="btn-ghost flex w-full items-center justify-center gap-2 !py-2 text-sm"
                    >
                      <Wallet className="h-4 w-4" />
                      {dict.walletPage.payWithTronLink}
                    </button>
                    <button
                      type="button"
                      className="w-full text-center text-[11px] text-mist underline"
                      onClick={() => setShowManualTx((v) => !v)}
                    >
                      {dict.walletPage.pasteTxId}
                    </button>
                    {showManualTx && (
                      <>
                        <input
                          className="input-field font-mono text-xs"
                          value={txIdInput}
                          onChange={(e) => setTxIdInput(e.target.value.trim())}
                          placeholder="64-char txId"
                        />
                        <button
                          type="button"
                          disabled={busy || txIdInput.length < 64}
                          onClick={() => confirmTx(activePending.id, txIdInput)}
                          className="btn-ghost w-full !py-2 text-sm"
                        >
                          {dict.walletPage.confirmTx}
                        </button>
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {demoMode && activePending && (
              <button
                type="button"
                disabled={busy}
                onClick={() => confirmDemo(activePending.id)}
                className="btn-ghost w-full !py-2 text-sm"
              >
                {dict.walletPage.confirmOnChain}
              </button>
            )}

            {toastMsg && (
              <p className="rounded-xl border border-champagne/30 bg-champagne/10 px-3 py-2 text-sm text-champagne">
                {toastMsg}
              </p>
            )}
          </div>
        </div>
      )}

      {toastMsg && !isClient && (
        <p className="rounded-xl border border-champagne/30 bg-champagne/10 px-3 py-2 text-sm text-champagne max-w-xl">
          {toastMsg}
        </p>
      )}

      <form
        onSubmit={withdrawUsdt}
        className="surface max-w-xl space-y-3 rounded-[1.75rem] p-5 sm:p-6"
      >
        <h2 className="font-display text-2xl tracking-tight">
          {dict.walletPage.payoutTitle}
        </h2>
        <p className="text-sm text-mist">{dict.walletPage.payoutBody}</p>
        <div>
          <label className="mb-2 block text-sm text-mist" htmlFor="withdrawTo">
            {dict.walletPage.withdrawTo}
          </label>
          <input
            id="withdrawTo"
            className="input-field font-mono text-sm"
            value={withdrawTo}
            onChange={(e) => setWithdrawTo(e.target.value.trim())}
            placeholder="T..."
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-mist">{dict.walletPage.withdrawToHint}</p>
          {tronAddress && (
            <button
              type="button"
              className="mt-2 text-xs text-champagne underline"
              onClick={() => setWithdrawTo(tronAddress)}
            >
              {dict.walletPage.withdrawUseMine}
            </button>
          )}
        </div>
        <div>
          <label className="mb-2 block text-sm text-mist" htmlFor="withdrawAmount">
            {dict.walletPage.withdrawAmount}
          </label>
          <input
            id="withdrawAmount"
            className="input-field"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder={dict.walletPage.withdrawAmount}
            type="number"
            min={1}
            step="0.01"
          />
          <p className="mt-1 text-xs text-mist">Disponible: {formatUSDT(usdt)}</p>
        </div>
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            dict.walletPage.withdrawCta
          )}
        </button>
      </form>

      <div className="surface rounded-[1.75rem] p-5 sm:p-6">
        <h2 className="font-display text-2xl tracking-tight">
          {dict.walletPage.deposits}
        </h2>
        <div className="mt-4 space-y-3">
          {deposits.map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink/40 px-4 py-3"
            >
              <div>
                <p className="font-medium text-cream">
                  {formatCrypto(d.amount, (d.asset as CryptoAsset) || "USDT")}
                  {d.creditedUsdt != null ? ` → ${formatUSDT(d.creditedUsdt)}` : ""}
                </p>
                <p className="text-xs text-mist">
                  {d.reference} · {formatDate(d.createdAt)}
                  {d.txHash ? ` · ${d.txHash.slice(0, 10)}…` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={d.status} />
                {d.status === "PENDING" &&
                  (d.asset || "USDT") === "USDT" &&
                  !platform.usdtDemo && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setAsset("USDT");
                        setPending(d);
                        setAmount(String(d.amount));
                        payWithTronLink(d);
                      }}
                      className="btn-ghost !px-3 !py-1.5 text-xs"
                    >
                      {dict.walletPage.payWithTronLink}
                    </button>
                  )}
                {d.status === "PENDING" && demoMode && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => confirmDemo(d.id)}
                    className="btn-ghost !px-3 !py-1.5 text-xs"
                  >
                    {dict.walletPage.confirmOnChain}
                  </button>
                )}
              </div>
            </div>
          ))}
          {deposits.length === 0 && (
            <p className="text-sm text-mist">{dict.walletPage.empty}</p>
          )}
        </div>
      </div>
    </div>
  );
}
