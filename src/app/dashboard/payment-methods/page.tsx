"use client";

import { FormEvent, useEffect, useState } from "react";
import { CreditCard, Loader2, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useLocale } from "@/i18n/LocaleProvider";

type Method = {
  id: string;
  type: string;
  label: string;
  accountName: string;
  accountNumber: string;
  bankName: string | null;
  phone: string | null;
  notes: string | null;
  isDefault: boolean;
};

const TYPES = [
  "NEQUI",
  "BANCOLOMBIA",
  "DAVIVIENDA",
  "PSE",
  "CRYPTO_USDT",
  "OTHER",
] as const;

export default function PaymentMethodsPage() {
  const { dict } = useLocale();
  const p = dict.p2p;
  const [methods, setMethods] = useState<Method[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    type: "NEQUI" as (typeof TYPES)[number],
    label: "",
    accountName: "",
    accountNumber: "",
    bankName: "",
    phone: "",
    notes: "",
    isDefault: false,
  });

  async function load() {
    const res = await fetch("/api/payment-methods");
    const data = await res.json();
    setMethods(data.methods || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/payment-methods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        bankName: form.bankName || undefined,
        phone: form.phone || undefined,
        notes: form.notes || undefined,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setForm({
        type: "NEQUI",
        label: "",
        accountName: "",
        accountNumber: "",
        bankName: "",
        phone: "",
        notes: "",
        isDefault: false,
      });
      load();
    }
  }

  async function remove(id: string) {
    await fetch("/api/payment-methods", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "deactivate" }),
    });
    load();
  }

  async function setDefault(id: string) {
    await fetch("/api/payment-methods", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "setDefault" }),
    });
    load();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={p.methodsEyebrow}
        title={p.methodsTitle}
        description={p.methodsDescription}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <form onSubmit={onSubmit} className="surface space-y-3 rounded-[1.5rem] p-5">
          <h2 className="font-display text-lg text-cream">{p.addMethod}</h2>
          <select
            value={form.type}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                type: e.target.value as (typeof TYPES)[number],
              }))
            }
            className="input-field"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {(p.rails as Record<string, string>)[t] || t}
              </option>
            ))}
          </select>
          <input
            className="input-field"
            placeholder={p.labelPh}
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            required
          />
          <input
            className="input-field"
            placeholder={p.accountNamePh}
            value={form.accountName}
            onChange={(e) =>
              setForm((f) => ({ ...f, accountName: e.target.value }))
            }
            required
          />
          <input
            className="input-field"
            placeholder={p.accountNumberPh}
            value={form.accountNumber}
            onChange={(e) =>
              setForm((f) => ({ ...f, accountNumber: e.target.value }))
            }
            required
          />
          <input
            className="input-field"
            placeholder={p.bankPh}
            value={form.bankName}
            onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
          />
          <input
            className="input-field"
            placeholder={p.phonePh}
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <input
            className="input-field"
            placeholder={p.notesPh}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm text-mist">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) =>
                setForm((f) => ({ ...f, isDefault: e.target.checked }))
              }
            />
            {p.setDefault}
          </label>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : p.saveMethod}
          </button>
        </form>

        <div className="space-y-3">
          {loading ? (
            <p className="text-mist">{dict.common.loading}</p>
          ) : methods.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title={p.emptyMethods}
              description={p.emptyMethodsBody}
            />
          ) : (
            methods.map((m) => (
              <div
                key={m.id}
                className="surface flex items-start justify-between gap-3 rounded-2xl p-4"
              >
                <div>
                  <p className="font-medium text-cream">
                    {m.label}
                    {m.isDefault && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-champagne">
                        {p.defaultBadge}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-mist">
                    {(p.rails as Record<string, string>)[m.type] || m.type} ·{" "}
                    {m.accountName}
                  </p>
                  <p className="mt-1 font-mono text-sm text-champagne">
                    {m.accountNumber}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {!m.isDefault && (
                    <button
                      type="button"
                      onClick={() => setDefault(m.id)}
                      className="text-xs text-mist hover:text-champagne"
                    >
                      {p.setDefault}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(m.id)}
                    className="text-mist hover:text-rose-300"
                    aria-label={dict.common.cancel}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
