"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Headphones, Loader2, MessageCircle, Send, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/i18n/LocaleProvider";

type ChatMessage = {
  id: string;
  sender: string;
  body: string;
  createdAt: string;
};

type Topic = { id: string; question: string };

const STORAGE_KEY = "solobbs_support_conversation";

export function SupportChat() {
  const { data: session } = useSession();
  const { dict } = useLocale();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [showAllTopics, setShowAllTopics] = useState(false);
  const [needsAgent, setNeedsAgent] = useState(false);
  const [input, setInput] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
    if (session?.user?.email) setEmail(session.user.email);
  }, [session]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setConversationId(saved);
    fetch("/api/support/faq")
      .then((r) => r.json())
      .then((d) => setTopics(d.topics || []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!open) return;
    async function load() {
      if (!conversationId) {
        setMessages([
          {
            id: "welcome",
            sender: "SUPPORT",
            body: dict.support.welcome,
            createdAt: new Date().toISOString(),
          },
        ]);
        return;
      }
      setLoading(true);
      const res = await fetch(`/api/support?conversationId=${conversationId}`);
      const data = await res.json();
      setLoading(false);
      if (res.ok) {
        setMessages(data.messages || []);
        setNeedsAgent(data.status === "NEEDS_AGENT");
      }
    }
    load();
  }, [open, conversationId, dict.support.welcome]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, showAllTopics]);

  async function sendMessage(body: string) {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");

    const optimistic: ChatMessage = {
      id: `tmp_${Date.now()}`,
      sender: "USER",
      body: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: conversationId || undefined,
        name: name || undefined,
        email: email || undefined,
        body: text,
      }),
    });
    const data = await res.json();
    setSending(false);

    if (!res.ok) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: "SUPPORT",
          body: dict.support.sendError,
          createdAt: new Date().toISOString(),
        },
      ]);
      return;
    }

    setConversationId(data.conversationId);
    localStorage.setItem(STORAGE_KEY, data.conversationId);
    setMessages(data.messages || []);
    setNeedsAgent(Boolean(data.needsAgent));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await sendMessage(input);
  }

  const topicList = showAllTopics ? topics : topics.slice(0, 8);

  return (
    <>
      <motion.button
        type="button"
        aria-label={open ? dict.support.close : dict.support.open}
        onClick={() => setOpen((v) => !v)}
        whileHover={reduce ? undefined : { scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        className={cn(
          "fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full shadow-2xl shadow-black/40",
          "bg-gradient-to-br from-champagne to-blush text-ink",
        )}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.96 }}
            transition={{ duration: 0.28 }}
            className="fixed bottom-24 right-5 z-[60] flex h-[min(74vh,580px)] w-[min(92vw,400px)] flex-col overflow-hidden rounded-[1.5rem] border border-line bg-ink-soft/95 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-champagne/15 text-champagne">
                <Headphones className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold tracking-[-0.02em]">{dict.support.title}</p>
                <p className="text-xs text-mist">
                  {needsAgent ? dict.support.waitingAgent : dict.support.faqFirst}
                </p>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {loading ? (
                <div className="flex h-full items-center justify-center text-mist">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <>
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                        m.sender === "USER"
                          ? "ml-auto bg-gradient-to-br from-champagne/90 to-blush/90 text-ink"
                          : "bg-ink/60 text-cream",
                      )}
                    >
                      {m.body}
                    </div>
                  ))}

                  <div className="rounded-2xl border border-line bg-ink/35 p-3">
                    <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-mist">
                      {dict.support.faqTitle}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(showAllTopics
                        ? topicList
                        : dict.support.quick.map((q) => ({ id: q, question: q }))
                      ).map((topic) => (
                          <button
                            key={topic.id}
                            type="button"
                            disabled={sending}
                            onClick={() => sendMessage(topic.question)}
                            className="rounded-full border border-line px-2.5 py-1.5 text-left text-xs text-cream transition hover:border-champagne/40 hover:bg-champagne/10"
                          >
                            {topic.question}
                          </button>
                        ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAllTopics((v) => !v)}
                      className="mt-2 text-xs text-champagne hover:underline"
                    >
                      {showAllTopics
                        ? dict.support.lessTopics
                        : dict.support.seeAll.replace("{n}", String(topics.length))}
                    </button>
                  </div>
                </>
              )}
              <div ref={endRef} />
            </div>

            {!session?.user && (
              <div className="grid grid-cols-2 gap-2 border-t border-line px-3 pt-3">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={dict.support.name}
                  className="input-field !rounded-xl !px-3 !py-2 text-sm"
                />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={dict.support.email}
                  type="email"
                  className="input-field !rounded-xl !px-3 !py-2 text-sm"
                />
              </div>
            )}

            <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-line p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={dict.support.placeholder}
                className="input-field !rounded-xl !py-2.5 text-sm"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-champagne to-blush text-ink disabled:opacity-50"
                aria-label={dict.support.send}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
