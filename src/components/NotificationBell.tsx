"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn, formatDate } from "@/lib/utils";
import { useLocale } from "@/i18n/LocaleProvider";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const { dict } = useLocale();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications || []);
      setUnread(data.unread || 0);
    } catch {
      // ignore polling errors
    }
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 8000);
    return () => window.clearInterval(id);
  }, [load]);

  async function markOne(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  async function markAll() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    load();
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={dict.notifications.aria}
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-xl border border-line p-2 text-cream transition hover:border-champagne/40"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blush px-1 text-[10px] font-semibold text-ink">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <button
              type="button"
              aria-label={dict.common.close}
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, y: 6, scale: 0.98 }}
              className="absolute right-0 z-50 mt-2 w-[min(92vw,360px)] overflow-hidden rounded-[1.35rem] border border-line bg-ink-soft/98 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <p className="text-sm font-medium">{dict.notifications.title}</p>
                {unread > 0 && (
                  <button
                    type="button"
                    onClick={markAll}
                    className="text-xs text-champagne hover:underline"
                  >
                    {dict.notifications.markAll}
                  </button>
                )}
              </div>

              <div className="max-h-[360px] overflow-y-auto">
                {items.length === 0 && (
                  <p className="px-4 py-8 text-center text-sm text-mist">
                    {dict.notifications.empty}
                  </p>
                )}
                {items.map((n) => {
                  const href = n.link || "/dashboard/messages";
                  const isMessage =
                    n.title.toLowerCase().includes("mensaje") ||
                    n.title.toLowerCase().includes("message") ||
                    n.title.toLowerCase().includes("interesado") ||
                    n.title.toLowerCase().includes("interested") ||
                    Boolean(n.link?.includes("/messages"));

                  return (
                    <Link
                      key={n.id}
                      href={isMessage ? href : n.link || "/dashboard"}
                      onClick={() => {
                        if (!n.read) markOne(n.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "block border-b border-line/70 px-4 py-3 transition hover:bg-white/5",
                        !n.read && "bg-champagne/5",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-cream">{n.title}</p>
                        {!n.read && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blush" />
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-mist">
                        {n.body}
                      </p>
                      <p className="mt-1.5 text-[10px] text-mist/70">
                        {formatDate(n.createdAt)}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
