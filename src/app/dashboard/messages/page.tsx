"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Loader2, MessageCircle, Send, ShieldPlus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { P2POrderCard, type P2PEscrow } from "@/components/P2POrderCard";
import { cn, formatDate } from "@/lib/utils";
import { formatUSDT } from "@/lib/crypto-format";
import { useLocale } from "@/i18n/LocaleProvider";
import { useSession } from "next-auth/react";

type InquiryListItem = {
  id: string;
  updatedAt: string;
  subject: string | null;
  model: { id: string; name: string; referralCode: string };
  client: { id: string; name: string };
  messages: { body: string; createdAt: string }[];
};

type Message = {
  id: string;
  body: string;
  type?: string;
  createdAt: string;
  sender: { id: string; name: string; role: string };
  escrow?: P2PEscrow | null;
};

export default function MessagesPage() {
  const { dict } = useLocale();
  const { data: session } = useSession();
  const [list, setList] = useState<InquiryListItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [peerName, setPeerName] = useState("");
  const [peerCode, setPeerCode] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showP2P, setShowP2P] = useState(false);
  const [p2pTitle, setP2pTitle] = useState("");
  const [p2pAmount, setP2pAmount] = useState("");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadBalance = useCallback(async () => {
    if (session?.user?.role !== "CLIENT") return;
    const res = await fetch("/api/wallet");
    if (!res.ok) return;
    const data = await res.json();
    setWalletBalance(data.user?.walletBalance ?? 0);
  }, [session?.user?.role]);

  async function loadList() {
    const res = await fetch("/api/inquiries");
    const data = await res.json();
    setList(data.inquiries || []);
    setLoading(false);
  }

  async function openThread(id: string) {
    setActiveId(id);
    setShowP2P(false);
    const res = await fetch(`/api/inquiries?id=${id}`);
    const data = await res.json();
    if (!res.ok) return;
    setMessages(data.inquiry.messages || []);
    const me = session?.user?.id;
    const peer =
      data.inquiry.modelId === me ? data.inquiry.client : data.inquiry.model;
    setPeerName(peer.name);
    setPeerCode(data.inquiry.model.referralCode);
  }

  useEffect(() => {
    loadList();
    loadBalance();
  }, [loadBalance]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeId]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!activeId || !input.trim()) return;
    setSending(true);
    const res = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inquiryId: activeId, body: input.trim() }),
    });
    setSending(false);
    if (res.ok) {
      setInput("");
      await openThread(activeId);
      loadList();
    }
  }

  async function createP2P(e: FormEvent) {
    e.preventDefault();
    if (!activeId) return;
    const amount = Number(p2pAmount.replace(/\D/g, ""));
    if (!amount || !p2pTitle.trim()) return;
    setSending(true);
    const res = await fetch("/api/p2p", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inquiryId: activeId,
        title: p2pTitle.trim(),
        amount,
      }),
    });
    setSending(false);
    if (res.ok) {
      setShowP2P(false);
      setP2pTitle("");
      setP2pAmount("");
      await openThread(activeId);
      loadList();
    }
  }

  async function p2pAction(
    escrowId: string,
    action: string,
    extra?: Record<string, string>,
  ) {
    if (!activeId) return;
    const res = await fetch("/api/p2p", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ escrowId, action, ...extra }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: data.error || "Error", code: data.code };
    }
    await openThread(activeId);
    loadList();
    loadBalance();
  }

  const latestP2P = new Map<string, string>();
  for (const m of messages) {
    if (m.type === "P2P" && m.escrow?.id) {
      latestP2P.set(m.escrow.id, m.id);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={dict.messages.eyebrow}
        title={dict.messages.title}
        description={dict.messages.description}
      />

      {loading ? (
        <p className="text-mist">{dict.common.loading}</p>
      ) : list.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title={dict.messages.emptyTitle}
          description={dict.messages.emptyBody}
          action={
            session?.user?.role === "CLIENT" ? (
              <Link href="/models" className="btn-primary">
                {dict.gallery.browseModels}
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div
            className={cn(
              "surface max-h-[70vh] space-y-2 overflow-y-auto rounded-[1.5rem] p-3",
              activeId && "hidden lg:block",
            )}
          >
            {list.map((item) => {
              const me = session?.user?.id;
              const peer = item.model.id === me ? item.client : item.model;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openThread(item.id)}
                  className={cn(
                    "w-full rounded-2xl px-4 py-3 text-left transition",
                    activeId === item.id
                      ? "bg-champagne/15 text-cream"
                      : "bg-ink/40 text-mist hover:bg-ink/60 hover:text-cream",
                  )}
                >
                  <p className="font-medium text-cream">{peer.name}</p>
                  <p className="mt-1 line-clamp-1 text-xs">
                    {item.messages[0]?.body || item.subject}
                  </p>
                </button>
              );
            })}
          </div>

          <div
            className={cn(
              "surface flex max-h-[min(70vh,calc(100dvh-12rem))] min-h-[55vh] flex-col rounded-[1.5rem] lg:min-h-0",
              !activeId && "hidden lg:flex",
            )}
          >
            {activeId ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-3 sm:px-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveId(null)}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line text-cream lg:hidden"
                      aria-label={dict.messages.backToList}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{peerName}</p>
                      <p className="text-xs text-mist">{dict.messages.thread}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                    {session?.user?.role === "CLIENT" && walletBalance !== null && (
                      <Link
                        href="/dashboard/wallet"
                        className="rounded-full bg-champagne/15 px-2.5 py-1 text-xs text-champagne"
                      >
                        {formatUSDT(walletBalance)}
                      </Link>
                    )}
                    {session?.user?.role === "CLIENT" && (
                      <Link
                        href={`/m/${peerCode}`}
                        className="text-sm text-champagne hover:underline"
                      >
                        {dict.gallery.viewPublic}
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
                  {messages.map((m) => {
                    const mine = m.sender.id === session?.user?.id;
                    const isP2PCard =
                      m.type === "P2P" &&
                      m.escrow &&
                      latestP2P.get(m.escrow.id) === m.id;

                    if (isP2PCard && m.escrow) {
                      return (
                        <div
                          key={m.id}
                          className={cn("flex", mine ? "justify-end" : "justify-start")}
                        >
                          <P2POrderCard
                            escrow={m.escrow}
                            role={session?.user?.role || ""}
                            walletBalance={walletBalance}
                            onRefreshBalance={loadBalance}
                            onAction={(action, extra) =>
                              p2pAction(m.escrow!.id, action, extra)
                            }
                          />
                        </div>
                      );
                    }

                    if (m.type === "P2P") {
                      return (
                        <div
                          key={m.id}
                          className="mx-auto max-w-[90%] rounded-full bg-ink/50 px-3 py-1 text-center text-[11px] text-mist"
                        >
                          {m.body} · {formatDate(m.createdAt)}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                          mine
                            ? "ml-auto bg-gradient-to-br from-champagne/90 to-blush/90 text-ink"
                            : "bg-ink/55 text-cream",
                        )}
                      >
                        <p>{m.body}</p>
                        <p
                          className={cn(
                            "mt-1 text-[10px]",
                            mine ? "text-ink/70" : "text-mist",
                          )}
                        >
                          {formatDate(m.createdAt)}
                        </p>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>

                {showP2P ? (
                  <form
                    onSubmit={createP2P}
                    className="space-y-2 border-t border-line p-3"
                  >
                    <p className="text-xs font-medium text-champagne">
                      {dict.p2p.createTitle}
                    </p>
                    <p className="text-[11px] text-mist">{dict.p2p.createHint}</p>
                    <input
                      value={p2pTitle}
                      onChange={(e) => setP2pTitle(e.target.value)}
                      className="input-field !rounded-xl !py-2 text-sm"
                      placeholder={dict.p2p.titlePlaceholder}
                      required
                    />
                    <input
                      value={p2pAmount}
                      onChange={(e) => setP2pAmount(e.target.value)}
                      className="input-field !rounded-xl !py-2 text-sm"
                      placeholder={dict.p2p.amountPlaceholder}
                      required
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowP2P(false)}
                        className="rounded-xl border border-line px-3 py-2 text-sm text-mist"
                      >
                        {dict.common.cancel}
                      </button>
                      <button
                        type="submit"
                        disabled={sending}
                        className="btn-primary flex-1 !py-2 text-sm"
                      >
                        {sending ? (
                          <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                        ) : (
                          dict.p2p.createOrder
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
                    <button
                      type="button"
                      onClick={() => setShowP2P(true)}
                      title={dict.p2p.createTitle}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-champagne/40 text-champagne hover:bg-champagne/10"
                    >
                      <ShieldPlus className="h-4 w-4" />
                    </button>
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      className="input-field !rounded-xl !py-2.5 text-sm"
                      placeholder={dict.messages.placeholder}
                    />
                    <button
                      disabled={sending || !input.trim()}
                      className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-champagne to-blush text-ink disabled:opacity-50"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </form>
                )}
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8 text-sm text-mist">
                {dict.messages.pick}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
