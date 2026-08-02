"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toast, ToastTone } from "@/components/ui/Toast";
import { formatCOP, formatDate } from "@/lib/utils";
import { useLocale } from "@/i18n/LocaleProvider";

type Escrow = {
  id: string;
  amount: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  clientArrivedAt?: string | null;
  cryptoTxHash?: string | null;
  cardLast4?: string | null;
  job?: { title: string } | null;
};

export default function EscrowPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { dict } = useLocale();
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; tone: ToastTone }>({
    open: false,
    message: "",
    tone: "info",
  });

  useEffect(() => {
    if (status === "authenticated" && session.user.role === "CLIENT") {
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  function notify(message: string, tone: ToastTone = "success") {
    setToast({ open: true, message, tone });
    window.setTimeout(() => setToast((t) => ({ ...t, open: false })), 2200);
  }

  async function load() {
    const res = await fetch("/api/escrow");
    const data = await res.json();
    setEscrows(data.escrows || []);
    setLoading(false);
  }

  useEffect(() => {
    if (status === "authenticated" && session.user.role !== "CLIENT") {
      load();
    }
  }, [status, session]);

  async function createEscrow(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/escrow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description"),
        amount: Number(form.get("amount")),
        city: form.get("city"),
        paymentMethod: form.get("paymentMethod"),
        scheduledAt: form.get("scheduledAt") || undefined,
        clientEmail: form.get("clientEmail") || undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      notify(dict.escrowPage.empty, "error");
      return;
    }
    e.currentTarget.reset();
    notify(dict.escrowPage.create);
    load();
  }

  async function action(id: string, actionName: "fund" | "release" | "dispute") {
    setActingId(id);
    const payload: Record<string, string> = { id, action: actionName };
    if (actionName === "fund") {
      const escrow = escrows.find((e) => e.id === id);
      if (escrow?.paymentMethod === "CARD") payload.cardLast4 = "4242";
      else payload.cryptoTxHash = `0x${Math.random().toString(16).slice(2, 12)}`;
    }
    const res = await fetch("/api/escrow", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setActingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      notify(
        (data as { error?: string }).error || dict.common.error,
        "error",
      );
      return;
    }
    notify(
      actionName === "fund"
        ? dict.escrowPage.fund
        : actionName === "release"
          ? dict.escrowPage.release
          : dict.escrowPage.dispute,
      actionName === "dispute" ? "info" : "success",
    );
    load();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={dict.escrowPage.eyebrow}
        title={dict.escrowPage.title}
        description={dict.escrowPage.description}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["1", dict.escrowPage.create],
          ["2", dict.escrowPage.fund],
          ["3", dict.escrowPage.release],
        ].map(([n, label]) => (
          <div
            key={n}
            className="surface flex items-center gap-3 rounded-2xl px-4 py-3.5"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-champagne/15 font-display text-champagne">
              {n}
            </span>
            <span className="text-sm text-cream">{label}</span>
          </div>
        ))}
      </div>

      <form
        onSubmit={createEscrow}
        className="surface grid gap-4 rounded-[1.75rem] p-5 sm:p-6 md:grid-cols-2"
      >
        <div className="md:col-span-2">
          <h2 className="font-display text-2xl tracking-tight">{dict.escrowPage.create}</h2>
        </div>
        <div>
          <label className="mb-2 block text-sm text-mist" htmlFor="title">
            {dict.escrowPage.titleField}
          </label>
          <input
            id="title"
            name="title"
            required
            className="input-field"
            placeholder="Cena privada Zona T"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-mist" htmlFor="amount">
            {dict.escrowPage.amount}
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            required
            min={50000}
            step={1000}
            className="input-field"
            placeholder="650000"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-mist" htmlFor="city">
            {dict.escrowPage.city}
          </label>
          <input id="city" name="city" className="input-field" placeholder="Bogotá" />
        </div>
        <div>
          <label className="mb-2 block text-sm text-mist" htmlFor="paymentMethod">
            {dict.escrowPage.payment}
          </label>
          <select id="paymentMethod" name="paymentMethod" className="input-field">
            <option value="CARD">{dict.status.CARD}</option>
            <option value="CRYPTO">{dict.status.CRYPTO} (USDT/BTC)</option>
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm text-mist" htmlFor="scheduledAt">
            {dict.escrowPage.when}
          </label>
          <input id="scheduledAt" name="scheduledAt" type="datetime-local" className="input-field" />
        </div>
        <div>
          <label className="mb-2 block text-sm text-mist" htmlFor="description">
            {dict.escrowPage.notes}
          </label>
          <input id="description" name="description" className="input-field" />
        </div>
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm text-mist" htmlFor="clientEmail">
            {dict.reviews.clientEmail}
          </label>
          <input
            id="clientEmail"
            name="clientEmail"
            type="email"
            className="input-field"
            placeholder="cliente@solobbs.com"
          />
          <p className="mt-1.5 text-xs text-mist">{dict.reviews.clientEmailHint}</p>
        </div>
        <div className="md:col-span-2">
          <button disabled={submitting} className="btn-primary">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {dict.common.loading}
              </>
            ) : (
              dict.escrowPage.submit
            )}
          </button>
        </div>
      </form>

      <div className="surface rounded-[1.75rem] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl tracking-tight">{dict.escrowPage.list}</h2>
          <Link href="/dashboard/wallet" className="text-sm text-champagne hover:underline">
            {dict.shell.modelNav.wallet}
          </Link>
        </div>

        {loading ? (
          <div className="mt-8 flex items-center gap-2 text-mist">
            <Loader2 className="h-4 w-4 animate-spin" /> {dict.common.loading}
          </div>
        ) : escrows.length === 0 ? (
          <EmptyState
            className="mt-6"
            icon={ShieldCheck}
            title={dict.common.empty}
            description={dict.escrowPage.empty}
          />
        ) : (
          <div className="mt-5 space-y-3">
            {escrows.map((e) => (
              <div
                key={e.id}
                className="rounded-2xl border border-line bg-ink/35 p-4 transition hover:border-champagne/25"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{e.job?.title || dict.escrowPage.create}</p>
                    <p className="mt-1 text-sm text-mist">
                      {formatCOP(e.amount)} · {formatDate(e.createdAt)}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <StatusBadge status={e.paymentMethod} />
                      <StatusBadge status={e.status} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {e.status === "PENDING" && (
                      <button
                        disabled={actingId === e.id}
                        onClick={() => action(e.id, "fund")}
                        className="btn-ghost !px-3 !py-2 text-sm"
                      >
                        {dict.escrowPage.fund}
                      </button>
                    )}
                    {(e.status === "FUNDED" || e.status === "IN_PROGRESS") &&
                      e.clientArrivedAt && (
                      <button
                        disabled={actingId === e.id}
                        onClick={() => action(e.id, "release")}
                        className="btn-primary !px-3 !py-2 text-sm"
                      >
                        {dict.escrowPage.release}
                      </button>
                    )}
                    {(e.status === "FUNDED" || e.status === "IN_PROGRESS") &&
                      !e.clientArrivedAt && (
                      <span className="rounded-xl border border-line px-3 py-2 text-sm text-mist/60">
                        {dict.p2p.releaseLocked}
                      </span>
                    )}
                    {e.status !== "RELEASED" && e.status !== "REFUNDED" && (
                      <button
                        disabled={actingId === e.id}
                        onClick={() => action(e.id, "dispute")}
                        className="btn-ghost !px-3 !py-2 text-sm"
                      >
                        {dict.escrowPage.dispute}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Toast open={toast.open} message={toast.message} tone={toast.tone} />
    </div>
  );
}
