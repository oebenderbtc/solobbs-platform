"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Toast, ToastTone } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useLocale } from "@/i18n/LocaleProvider";

type Conversation = {
  id: string;
  visitorName: string | null;
  visitorEmail: string | null;
  status: string;
  updatedAt: string;
  user?: { name: string; email: string } | null;
  messages: { body: string; createdAt: string; sender: string }[];
};

type Message = {
  id: string;
  sender: string;
  body: string;
  createdAt: string;
};

export default function AdminSupportPage() {
  const { dict } = useLocale();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [toast, setToast] = useState<{ open: boolean; message: string; tone: ToastTone }>({
    open: false,
    message: "",
    tone: "info",
  });

  async function loadList() {
    const res = await fetch("/api/support");
    const data = await res.json();
    setConversations(data.conversations || []);
  }

  async function loadThread(id: string) {
    setActiveId(id);
    const res = await fetch(`/api/support?conversationId=${id}`);
    const data = await res.json();
    setMessages(data.messages || []);
  }

  useEffect(() => {
    loadList();
  }, []);

  async function sendReply(e: FormEvent) {
    e.preventDefault();
    if (!activeId || !reply.trim()) return;
    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: activeId,
        body: reply.trim(),
        asAdmin: true,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessages(data.messages || []);
      setReply("");
      setToast({ open: true, message: "Respuesta enviada", tone: "success" });
      setTimeout(() => setToast((t) => ({ ...t, open: false })), 1800);
      loadList();
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={dict.admin.overviewEyebrow}
        title={dict.admin.supportTitle}
        description={dict.admin.supportDesc}
      />

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="surface max-h-[70vh] overflow-y-auto rounded-[1.5rem] p-3">
          {conversations.length === 0 && (
            <p className="p-4 text-sm text-mist">Aún no hay chats de soporte.</p>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => loadThread(c.id)}
              className={cn(
                "mb-1 w-full rounded-2xl px-3.5 py-3 text-left transition",
                activeId === c.id ? "bg-champagne/12" : "hover:bg-ink/40",
              )}
            >
              <p className="font-medium">
                {c.user?.name || c.visitorName || "Visitante"}
                {c.status === "NEEDS_AGENT" && (
                  <span className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] text-warning">
                    Agente
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-mist">
                {c.messages[0]?.body || "Sin mensajes"}
              </p>
              <p className="mt-1 text-[11px] text-mist">{formatDate(c.updatedAt)}</p>
            </button>
          ))}
        </div>

        <div className="surface flex min-h-[70vh] flex-col rounded-[1.5rem]">
          {!activeId ? (
            <p className="m-auto text-sm text-mist">Selecciona una conversación</p>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                      m.sender === "USER"
                        ? "bg-ink/55"
                        : "ml-auto bg-gradient-to-br from-champagne/90 to-blush/90 text-ink",
                    )}
                  >
                    <p>{m.body}</p>
                    <p className="mt-1 text-[10px] opacity-70">{formatDate(m.createdAt)}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={sendReply} className="flex gap-2 border-t border-line p-3">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  className="input-field !rounded-xl"
                  placeholder="Responder como soporte..."
                />
                <button className="btn-primary !px-4 !py-2.5 text-sm">Enviar</button>
              </form>
            </>
          )}
        </div>
      </div>

      <Toast open={toast.open} message={toast.message} tone={toast.tone} />
    </div>
  );
}
