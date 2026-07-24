"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { useLocale } from "@/i18n/LocaleProvider";

export function ContactModelForm({
  modelCode,
  modelName,
  defaultAmount,
}: {
  modelCode: string;
  modelName: string;
  defaultAmount?: number | null;
}) {
  const { dict } = useLocale();
  const { data: session } = useSession();
  const [tab, setTab] = useState<"message" | "book">("message");
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : "650000");
  const [paymentMethod, setPaymentMethod] = useState("CARD");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");

  if (!session?.user) {
    return (
      <div className="rounded-[1.5rem] border border-line bg-ink/45 p-5">
        <p className="text-sm text-mist">{dict.gallery.loginToContact}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/login" className="btn-primary !px-4 !py-2.5 text-sm">
            {dict.header.login}
          </Link>
          <Link
            href={`/register?role=CLIENT&ref=${modelCode}`}
            className="btn-ghost !px-4 !py-2.5 text-sm"
          >
            {dict.auth.createAccount}
          </Link>
        </div>
      </div>
    );
  }

  if (session.user.role !== "CLIENT") {
    return (
      <div className="rounded-[1.5rem] border border-line bg-ink/45 p-5 text-sm text-mist">
        {dict.gallery.clientsOnly}
      </div>
    );
  }

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modelCode,
        body: message.trim(),
        subject: `Hola ${modelName}`,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || dict.gallery.contactError);
      return;
    }
    setDone(dict.gallery.messageSent);
    setMessage("");
  }

  async function book(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modelCode,
        title: title.trim() || `Cita con ${modelName}`,
        amount: Number(amount),
        paymentMethod,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || dict.gallery.bookError);
      return;
    }
    setDone(dict.gallery.bookSent);
  }

  if (done) {
    return (
      <div className="rounded-[1.5rem] border border-success/30 bg-success/10 p-5 text-sm text-success">
        <p>{done}</p>
        <Link href="/dashboard/messages" className="mt-3 inline-block text-champagne hover:underline">
          {dict.messages.goInbox}
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-line bg-ink/45 p-5">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("message")}
          className={`rounded-full px-3 py-1.5 text-xs ${
            tab === "message" ? "bg-champagne/20 text-champagne" : "text-mist"
          }`}
        >
          {dict.gallery.tabMessage}
        </button>
        <button
          type="button"
          onClick={() => setTab("book")}
          className={`rounded-full px-3 py-1.5 text-xs ${
            tab === "book" ? "bg-champagne/20 text-champagne" : "text-mist"
          }`}
        >
          {dict.gallery.tabBook}
        </button>
      </div>

      {tab === "message" ? (
        <form onSubmit={sendMessage} className="mt-4 space-y-3">
          <textarea
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={1000}
            className="input-field min-h-[100px] resize-y"
            placeholder={dict.gallery.messagePlaceholder}
          />
          <button disabled={loading} className="btn-primary w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : dict.gallery.sendMessage}
          </button>
        </form>
      ) : (
        <form onSubmit={book} className="mt-4 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field"
            placeholder={dict.gallery.bookTitle}
          />
          <input
            type="number"
            required
            min={50000}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input-field"
            placeholder={dict.escrowPage.amount}
          />
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="input-field"
          >
            <option value="CARD">{dict.status.CARD}</option>
            <option value="CRYPTO">{dict.status.CRYPTO}</option>
          </select>
          <button disabled={loading} className="btn-primary w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : dict.gallery.requestBook}
          </button>
        </form>
      )}

      {error && (
        <p className="mt-3 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
