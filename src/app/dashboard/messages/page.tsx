"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  Camera,
  ChevronLeft,
  Loader2,
  Mic,
  Paperclip,
  MessageCircle,
  Send,
  ShieldPlus,
  Smile,
  Square,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChatEmojiPicker } from "@/components/ChatEmojiPicker";
import {
  FileChip,
  MessageTicks,
  ViewOnceBadge,
} from "@/components/ChatMessageMeta";
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
  mediaUrl?: string | null;
  mediaName?: string | null;
  mediaMime?: string | null;
  viewOnce?: boolean;
  viewedAt?: string | null;
  readAt?: string | null;
  lockedViewOnce?: boolean;
  mediaConsumed?: boolean;
  createdAt: string;
  sender: { id: string; name: string; role: string };
  escrow?: P2PEscrow | null;
};

function shortTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return formatDate(iso);
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

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
  const [showEmoji, setShowEmoji] = useState(false);
  const [viewOnce, setViewOnce] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [p2pTitle, setP2pTitle] = useState("");
  const [p2pAmount, setP2pAmount] = useState("");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [viewOnceReveal, setViewOnceReveal] = useState<{
    url: string;
    id: string;
  } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);

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
    setShowEmoji(false);
    clearPending();
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

  function clearPending() {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    setViewOnce(false);
  }

  useEffect(() => {
    loadList();
    loadBalance();
  }, [loadBalance]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeId]);

  // Refresh read receipts / new messages while a thread is open
  useEffect(() => {
    if (!activeId) return;
    const id = window.setInterval(async () => {
      const res = await fetch(`/api/inquiries?id=${activeId}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.inquiry.messages || []);
    }, 6000);
    return () => window.clearInterval(id);
  }, [activeId]);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function pickFile(file: File | null) {
    if (!file) return;
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(file);
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      setPendingPreview(URL.createObjectURL(file));
    } else {
      setPendingPreview(null);
    }
    if (!file.type.startsWith("image/")) setViewOnce(false);
  }

  async function sendText(e: FormEvent) {
    e.preventDefault();
    if (!activeId) return;
    if (pendingFile) {
      await sendMedia(pendingFile, input.trim(), viewOnce);
      return;
    }
    if (!input.trim()) return;
    setSending(true);
    setShowEmoji(false);
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

  async function sendMedia(file: File, caption: string, once: boolean) {
    if (!activeId) return;
    setSending(true);
    setShowEmoji(false);
    const form = new FormData();
    form.set("inquiryId", activeId);
    form.set("file", file, file.name || `media-${Date.now()}`);
    if (caption) form.set("body", caption);
    if (once) form.set("viewOnce", "1");
    const res = await fetch("/api/inquiries", { method: "POST", body: form });
    setSending(false);
    if (res.ok) {
      setInput("");
      clearPending();
      await openThread(activeId);
      loadList();
    }
  }

  function insertEmoji(emoji: string) {
    const el = inputRef.current;
    if (!el) {
      setInput((v) => v + emoji);
      return;
    }
    const start = el.selectionStart ?? input.length;
    const end = el.selectionEnd ?? input.length;
    const next = input.slice(0, start) + emoji + input.slice(end);
    setInput(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recordTimerRef.current) {
          window.clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
        }
        setRecording(false);
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        if (blob.size < 500) return;
        const file = new File([blob], `audio-${Date.now()}.webm`, {
          type: blob.type,
        });
        await sendMedia(file, "", false);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordSecs(0);
      recordTimerRef.current = window.setInterval(
        () => setRecordSecs((s) => s + 1),
        1000,
      );
    } catch {
      alert("No se pudo acceder al micrófono");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
  }

  async function openViewOnce(messageId: string) {
    const res = await fetch("/api/inquiries", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "viewOnce", messageId }),
    });
    const data = await res.json();
    if (!res.ok) return;
    const url = data.message?.mediaUrl as string | undefined;
    if (url) {
      setViewOnceReveal({ url, id: messageId });
    }
    if (activeId) await openThread(activeId);
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

  const canViewOnce = Boolean(
    pendingFile?.type.startsWith("image/") ||
      (pendingPreview && pendingFile?.type.startsWith("image/")),
  );

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
        <div className="grid gap-4 overflow-hidden rounded-[1.5rem] border border-line lg:grid-cols-[0.85fr_1.15fr] lg:gap-0">
          <div
            className={cn(
              "chat-list-panel max-h-[70vh] space-y-0.5 overflow-y-auto p-2 lg:border-r lg:border-line",
              activeId && "hidden lg:block",
            )}
          >
            {list.map((item) => {
              const me = session?.user?.id;
              const peer = item.model.id === me ? item.client : item.model;
              const active = activeId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openThread(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition",
                    active ? "chat-list-item-active" : "hover:bg-white/[0.04]",
                  )}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-champagne/40 to-blush/50 text-sm font-semibold text-ink">
                    {initials(peer.name)}
                  </span>
                  <span className="min-w-0 flex-1 border-b border-line pb-3">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-cream">
                        {peer.name}
                      </span>
                      <span className="shrink-0 text-[10px] text-mist">
                        {shortTime(item.updatedAt)}
                      </span>
                    </span>
                    <span className="mt-0.5 line-clamp-1 text-xs text-mist">
                      {item.messages[0]?.body || item.subject}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div
            className={cn(
              "chat-shell flex max-h-[min(74vh,calc(100dvh-11rem))] min-h-[55vh] flex-col overflow-hidden lg:min-h-[70vh] lg:rounded-none lg:border-0",
              !activeId && "hidden lg:flex",
            )}
          >
            {activeId ? (
              <>
                <div className="chat-header flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setActiveId(null)}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-cream hover:bg-white/5 lg:hidden"
                      aria-label={dict.messages.backToList}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-champagne/40 to-blush/50 text-sm font-semibold text-ink">
                      {initials(peerName)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-cream">
                        {peerName}
                      </p>
                      <p className="text-xs text-mist">{dict.messages.thread}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                    {session?.user?.role === "CLIENT" &&
                      walletBalance !== null && (
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

                <div className="chat-wallpaper flex-1 space-y-1.5 overflow-y-auto px-3 py-4 sm:px-5">
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
                          className={cn(
                            "flex py-1",
                            mine ? "justify-end" : "justify-start",
                          )}
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
                          className="mx-auto max-w-[92%] rounded-full border border-line bg-ink/70 px-3 py-1 text-center text-[11px] text-mist backdrop-blur-sm"
                        >
                          {m.body} · {shortTime(m.createdAt)}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "chat-bubble",
                          mine ? "chat-bubble-mine" : "chat-bubble-theirs",
                        )}
                      >
                        {m.lockedViewOnce ? (
                          <button
                            type="button"
                            onClick={() => openViewOnce(m.id)}
                            className="flex min-w-[10rem] flex-col items-start gap-2 rounded-lg bg-black/20 px-3 py-4"
                          >
                            <ViewOnceBadge locked />
                          </button>
                        ) : m.mediaConsumed ||
                          (m.viewOnce && m.viewedAt && !m.mediaUrl) ? (
                          <ViewOnceBadge consumed mine={mine} />
                        ) : m.type === "IMAGE" && m.mediaUrl ? (
                          <div className="space-y-1">
                            {m.viewOnce && <ViewOnceBadge mine={mine} />}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={m.mediaUrl}
                              alt={m.body || "Foto"}
                              className="max-h-72 max-w-full rounded-lg object-cover"
                            />
                            {m.body &&
                              m.body !== "Foto" &&
                              m.body !== "Foto de una vista" && (
                                <p className="whitespace-pre-wrap">{m.body}</p>
                              )}
                          </div>
                        ) : m.type === "VIDEO" && m.mediaUrl ? (
                          <video
                            src={m.mediaUrl}
                            controls
                            className="max-h-72 max-w-full rounded-lg"
                          />
                        ) : m.type === "AUDIO" && m.mediaUrl ? (
                          <audio src={m.mediaUrl} controls className="max-w-full" />
                        ) : m.type === "FILE" ? (
                          <FileChip
                            name={m.mediaName || m.body || "Archivo"}
                            href={m.mediaUrl}
                            mine={mine}
                          />
                        ) : (
                          <p className="whitespace-pre-wrap">{m.body}</p>
                        )}
                        <span className="chat-bubble-meta">
                          {shortTime(m.createdAt)}
                          <MessageTicks mine={mine} readAt={m.readAt} />
                        </span>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>

                {showP2P ? (
                  <form
                    onSubmit={createP2P}
                    className="chat-composer space-y-2 p-3"
                  >
                    <p className="text-xs font-medium text-champagne">
                      {dict.p2p.createTitle}
                    </p>
                    <p className="text-[11px] text-mist">{dict.p2p.createHint}</p>
                    <input
                      value={p2pTitle}
                      onChange={(e) => setP2pTitle(e.target.value)}
                      className="chat-input w-full !rounded-xl"
                      placeholder={dict.p2p.titlePlaceholder}
                      required
                    />
                    <input
                      value={p2pAmount}
                      onChange={(e) => setP2pAmount(e.target.value)}
                      className="chat-input w-full !rounded-xl"
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
                  <div className="chat-composer relative space-y-2 px-2 py-2.5 sm:px-3">
                    {pendingFile && (
                      <div className="flex items-center gap-3 rounded-2xl border border-line bg-ink/60 px-3 py-2">
                        {pendingPreview &&
                        pendingFile.type.startsWith("image/") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={pendingPreview}
                            alt=""
                            className="h-14 w-14 rounded-lg object-cover"
                          />
                        ) : pendingPreview &&
                          pendingFile.type.startsWith("video/") ? (
                          <video
                            src={pendingPreview}
                            className="h-14 w-14 rounded-lg object-cover"
                          />
                        ) : (
                          <FileChip name={pendingFile.name} mine />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs text-mist">
                            {pendingFile.name}
                          </p>
                          {canViewOnce && (
                            <label className="mt-1 flex items-center gap-2 text-xs text-cream">
                              <input
                                type="checkbox"
                                checked={viewOnce}
                                onChange={(e) => setViewOnce(e.target.checked)}
                                className="rounded border-line accent-champagne"
                              />
                              Ver solo una vez
                            </label>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={clearPending}
                          className="rounded-full p-2 text-mist hover:text-cream"
                          aria-label="Quitar archivo"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    <form
                      onSubmit={sendText}
                      className="relative flex items-end gap-1 sm:gap-1.5"
                    >
                      <ChatEmojiPicker
                        open={showEmoji}
                        onClose={() => setShowEmoji(false)}
                        onPick={insertEmoji}
                      />
                      <input
                        ref={fileRef}
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          pickFile(e.target.files?.[0] || null);
                          e.target.value = "";
                        }}
                      />
                      <input
                        ref={cameraRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          pickFile(e.target.files?.[0] || null);
                          e.target.value = "";
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => setShowP2P(true)}
                        title={dict.p2p.createTitle}
                        className="flex h-11 w-10 shrink-0 items-center justify-center rounded-full text-champagne hover:bg-white/5 sm:w-11"
                      >
                        <ShieldPlus className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="flex h-11 w-10 shrink-0 items-center justify-center rounded-full text-mist hover:bg-white/5 hover:text-cream sm:w-11"
                        aria-label="Adjuntar"
                      >
                        <Paperclip className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => cameraRef.current?.click()}
                        className="flex h-11 w-10 shrink-0 items-center justify-center rounded-full text-mist hover:bg-white/5 hover:text-cream sm:w-11"
                        aria-label="Cámara"
                      >
                        <Camera className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowEmoji((v) => !v)}
                        className={cn(
                          "flex h-11 w-10 shrink-0 items-center justify-center rounded-full text-mist hover:bg-white/5 hover:text-cream sm:w-11",
                          showEmoji && "bg-white/10 text-champagne",
                        )}
                        aria-label="Emoji"
                      >
                        <Smile className="h-5 w-5" />
                      </button>

                      {recording ? (
                        <div className="flex flex-1 items-center gap-2 rounded-full border border-blush/40 bg-ink px-4 py-2.5 text-sm text-blush">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-blush" />
                          Grabando… {recordSecs}s
                        </div>
                      ) : (
                        <input
                          ref={inputRef}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onFocus={() => setShowEmoji(false)}
                          className="chat-input text-sm"
                          placeholder={
                            pendingFile
                              ? "Añade un mensaje…"
                              : dict.messages.placeholder
                          }
                          autoComplete="off"
                        />
                      )}

                      {recording ? (
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blush text-ink"
                          aria-label="Detener"
                        >
                          <Square className="h-4 w-4 fill-current" />
                        </button>
                      ) : input.trim() || pendingFile ? (
                        <button
                          type="submit"
                          disabled={sending}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-champagne to-blush text-ink disabled:opacity-40"
                          aria-label="Enviar"
                        >
                          {sending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void startRecording()}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-champagne to-blush text-ink"
                          aria-label="Audio"
                        >
                          <Mic className="h-5 w-5" />
                        </button>
                      )}
                    </form>
                  </div>
                )}
              </>
            ) : (
              <div className="chat-wallpaper flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
                <MessageCircle className="h-10 w-10 text-champagne/50" />
                <p className="text-sm text-mist">{dict.messages.pick}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {viewOnceReveal && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setViewOnceReveal(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={viewOnceReveal.url}
            alt="Foto de una vista"
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-cream"
            onClick={() => setViewOnceReveal(null)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
