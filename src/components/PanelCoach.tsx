"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { HelpCircle, Lightbulb, X } from "lucide-react";
import { getTipIdForPath } from "@/lib/panel-tips";
import { useLocale } from "@/i18n/LocaleProvider";
import type { TipId } from "@/i18n/dictionaries";

const STORAGE_KEY = "solobbs-tips-dismissed";
const DISABLED_KEY = "solobbs-tips-disabled";

function readDismissed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as string[];
  } catch {
    return [];
  }
}

export function PanelCoach({ role }: { role: string }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const { dict, t } = useLocale();
  const tipId = useMemo(() => getTipIdForPath(pathname, role), [pathname, role]);
  const tip = tipId ? dict.tips[tipId as TipId] : null;

  const [dismissed, setDismissed] = useState<string[]>([]);
  const [disabled, setDisabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  useEffect(() => {
    setDismissed(readDismissed());
    setDisabled(localStorage.getItem(DISABLED_KEY) === "1");
    setReady(true);
  }, []);

  useEffect(() => {
    setManualOpen(false);
  }, [pathname]);

  if (!ready || !tip || !tipId) return null;

  const isDismissed = dismissed.includes(tipId);
  const visible = (!disabled && !isDismissed) || manualOpen;

  function dismissOnce() {
    if (!tipId) return;
    const next = Array.from(new Set([...dismissed, tipId]));
    setDismissed(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setManualOpen(false);
  }

  function disableAll() {
    setDisabled(true);
    localStorage.setItem(DISABLED_KEY, "1");
    setManualOpen(false);
  }

  function reopen() {
    setManualOpen(true);
  }

  return (
    <>
      {!visible && (
        <motion.button
          type="button"
          initial={reduce ? false : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={reopen}
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] z-50 inline-flex items-center gap-2 rounded-full border border-line bg-ink-elevated/95 px-3.5 py-2.5 text-sm text-cream shadow-2xl backdrop-blur-xl hover:border-champagne/40 sm:left-auto sm:right-[calc(5.25rem+env(safe-area-inset-right))]"
          aria-label={t("coach.showHelp")}
        >
          <HelpCircle className="h-4 w-4 text-champagne" />
          {t("common.help")}
        </motion.button>
      )}

      <AnimatePresence>
        {visible && (
          <motion.div
            key={tipId}
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-3 right-3 z-50 sm:left-auto sm:right-[calc(5.25rem+env(safe-area-inset-right))] sm:w-[min(92vw,380px)]"
            role="status"
            aria-live="polite"
          >
            <div className="overflow-hidden rounded-[1.5rem] border border-champagne/25 bg-ink-soft/95 shadow-2xl shadow-black/50 backdrop-blur-xl">
              <div className="h-1 overflow-hidden bg-ink">
                <motion.div
                  className="h-full bg-gradient-to-r from-champagne to-blush"
                  initial={{ x: "-100%" }}
                  animate={{ x: "0%" }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>

              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-champagne/15 text-champagne">
                      <Lightbulb className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-mist">
                        {dict.coach.quickGuide}
                      </p>
                      <h3 className="mt-1 font-display text-xl leading-tight text-cream">
                        {tip.title}
                      </h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={dismissOnce}
                    className="rounded-lg p-1.5 text-mist transition hover:bg-white/5 hover:text-cream"
                    aria-label={t("common.close")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-mist">{tip.body}</p>

                {tip.bullets && tip.bullets.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {tip.bullets.map((b) => (
                      <motion.li
                        key={b}
                        initial={reduce ? false : { opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex gap-2 text-sm text-cream/90"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blush" />
                        <span>{b}</span>
                      </motion.li>
                    ))}
                  </ul>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={dismissOnce}
                    className="btn-primary !px-3.5 !py-2 text-sm"
                  >
                    {dict.coach.gotIt}
                  </button>
                  <button
                    type="button"
                    onClick={disableAll}
                    className="btn-ghost !px-3.5 !py-2 text-sm"
                  >
                    {dict.coach.hideTips}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
