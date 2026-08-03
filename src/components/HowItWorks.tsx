"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Bitcoin,
  Briefcase,
  Check,
  CreditCard,
  Network,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/i18n/LocaleProvider";

const icons = [Sparkles, ShieldCheck, Wallet, Network] as const;
const demos = ["register", "escrow", "release", "network"] as const;

function DemoPanel({
  type,
  demo,
  levelLabel,
}: {
  type: (typeof demos)[number];
  demo: {
    stageName: string;
    referralCode: string;
    accountReady: string;
    dinner: string;
    card: string;
    crypto: string;
    funding: string;
    escrowStatus: string;
    inEscrow: string;
    release: string;
    walletCredit: string;
    feeDone: string;
    commissionOf: string;
  };
  levelLabel: (n: number) => string;
}) {
  if (type === "register") {
    return (
      <div className="space-y-3">
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-2xl bg-ink/60 px-4 py-3"
        >
          <p className="text-xs text-mist">{demo.stageName}</p>
          <p className="mt-1 text-cream">Lucía Vargas</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-ink/60 px-4 py-3"
        >
          <p className="text-xs text-mist">{demo.referralCode}</p>
          <p className="mt-1 font-mono text-champagne">CAMI9K</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
          className="flex items-center gap-2 rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
        >
          <Check className="h-4 w-4" />
          {demo.accountReady}
        </motion.div>
      </div>
    );
  }

  if (type === "escrow") {
    return (
      <div className="space-y-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-ink/60 px-4 py-3"
        >
          <div className="flex items-center gap-2 text-sm text-mist">
            <Briefcase className="h-4 w-4 text-blush" />
            {demo.dinner}
          </div>
          <p className="mt-2 font-display text-2xl text-cream">$650.000</p>
        </motion.div>
        <div className="grid grid-cols-2 gap-2">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="rounded-2xl border border-champagne/30 bg-champagne/10 px-3 py-3 text-center text-sm"
          >
            <CreditCard className="mx-auto mb-1 h-4 w-4 text-champagne" />
            {demo.card}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-blush/30 bg-blush/10 px-3 py-3 text-center text-sm"
          >
            <Bitcoin className="mx-auto mb-1 h-4 w-4 text-blush" />
            {demo.crypto}
          </motion.div>
        </div>
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ delay: 0.35, duration: 1.1, ease: "easeOut" }}
          className="h-1.5 overflow-hidden rounded-full bg-ink"
        >
          <div className="h-full w-full bg-gradient-to-r from-champagne to-blush" />
        </motion.div>
        <p className="text-center text-xs text-mist">{demo.funding}</p>
      </div>
    );
  }

  if (type === "release") {
    return (
      <div className="space-y-3">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl bg-ink/60 px-4 py-3"
        >
          <p className="text-xs text-mist">{demo.escrowStatus}</p>
          <p className="mt-1 text-champagne">{demo.inEscrow}</p>
        </motion.div>
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="btn-primary w-full !py-3 text-sm"
          type="button"
        >
          {demo.release}
        </motion.button>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.55 }}
          className="rounded-2xl border border-success/30 bg-success/10 px-4 py-3"
        >
          <p className="text-sm text-success">{demo.walletCredit}</p>
          <p className="mt-1 text-xs text-mist">{demo.feeDone}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {[
        { level: 1, pct: "10%", amount: "+ $59.800" },
        { level: 2, pct: "5%", amount: "+ $10.120" },
        { level: 3, pct: "2%", amount: "+ $4.040" },
      ].map((row, i) => (
        <motion.div
          key={row.level}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 + i * 0.12 }}
          className="flex items-center justify-between rounded-2xl bg-ink/60 px-4 py-3"
        >
          <div>
            <p className="text-sm text-cream">{levelLabel(row.level)}</p>
            <p className="text-xs text-mist">
              {demo.commissionOf.replace("{pct}", row.pct)}
            </p>
          </div>
          <p className="font-medium text-champagne">{row.amount}</p>
        </motion.div>
      ))}
    </div>
  );
}

export function HowItWorks() {
  const reduce = useReducedMotion();
  const { dict, t, locale } = useLocale();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const steps = useMemo(
    () =>
      dict.how.steps.map((step, i) => ({
        id: i + 1,
        ...step,
        icon: icons[i],
        demo: demos[i],
      })),
    [dict],
  );

  const step = steps[active];

  useEffect(() => {
    if (reduce || paused) return;
    const id = window.setInterval(() => {
      setActive((prev) => (prev + 1) % steps.length);
    }, 4200);
    return () => window.clearInterval(id);
  }, [reduce, paused, active, steps.length]);

  return (
    <section
      id="como-funciona"
      className="relative overflow-hidden border-y border-line"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-blush/5 via-transparent to-champagne/5" />

      <div className="relative mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-28">
        <div className="max-w-2xl">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[11px] font-medium uppercase tracking-[0.22em] text-blush"
          >
            {dict.how.eyebrow}
          </motion.p>
          <motion.h2
            initial={reduce ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="mt-3 font-display text-4xl tracking-tight sm:text-5xl"
          >
            {dict.how.title}
          </motion.h2>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.14 }}
            className="mt-4 text-[15px] leading-relaxed text-mist"
          >
            {dict.how.subtitle}
          </motion.p>
        </div>

        <div className="mt-10 flex gap-1 sm:gap-2">
          {steps.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={t("how.goToStep", { n: s.id })}
              className="group relative flex h-11 flex-1 items-center overflow-hidden rounded-full px-0.5"
            >
              <span className="relative h-1.5 w-full overflow-hidden rounded-full bg-ink-elevated">
                <motion.span
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-champagne to-blush"
                  initial={false}
                  animate={{
                    width: i < active ? "100%" : i === active ? "100%" : "0%",
                    opacity: i === active ? 1 : i < active ? 0.55 : 0.2,
                  }}
                  transition={
                    i === active && !reduce && !paused
                      ? { duration: 4.2, ease: "linear" }
                      : { duration: 0.35 }
                  }
                  key={`${active}-${i}-${paused}`}
                />
              </span>
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
          <div className="space-y-2">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === active;
              return (
                <motion.button
                  key={s.id}
                  type="button"
                  onClick={() => setActive(i)}
                  whileHover={reduce ? undefined : { x: 4 }}
                  className={cn(
                    "w-full rounded-[1.35rem] border px-4 py-4 text-left transition",
                    isActive
                      ? "border-champagne/35 bg-gradient-to-r from-champagne/12 to-blush/10"
                      : "border-transparent bg-ink/30 hover:border-line hover:bg-ink/50",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                        isActive
                          ? "bg-gradient-to-br from-champagne to-blush text-ink"
                          : "bg-ink-elevated text-mist",
                      )}
                    >
                      {isActive ? (
                        <Icon className="h-4 w-4" />
                      ) : (
                        <span className="font-display text-sm">{s.id}</span>
                      )}
                    </span>
                    <div>
                      <p
                        className={cn(
                          "font-medium",
                          isActive ? "text-cream" : "text-mist",
                        )}
                      >
                        {s.title}
                      </p>
                      <p className="mt-0.5 text-xs text-mist/80">{s.subtitle}</p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          <div className="relative min-h-[320px] sm:min-h-[420px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${locale}-${step.id}`}
                initial={reduce ? false : { opacity: 0, y: 22, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? undefined : { opacity: 0, y: -16, scale: 0.98 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="glass relative h-full overflow-hidden rounded-[1.75rem] p-6 sm:p-8"
              >
                {!reduce && (
                  <motion.div
                    className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blush/20 blur-3xl"
                    animate={{ opacity: [0.3, 0.55, 0.3], scale: [1, 1.15, 1] }}
                    transition={{ duration: 4, repeat: Infinity }}
                  />
                )}

                <div className="relative flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-champagne">
                  <span>{t("how.stepOf", { n: step.id, total: steps.length })}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="text-mist">{dict.how.liveDemo}</span>
                </div>

                <h3 className="relative mt-4 font-display text-3xl tracking-tight text-cream sm:text-4xl">
                  {step.title}
                </h3>
                <p className="relative mt-4 max-w-lg text-[15px] leading-relaxed text-mist">
                  {step.description}
                </p>
                <p className="relative mt-3 text-sm text-champagne">{step.tip}</p>

                <div className="relative mt-8 rounded-[1.35rem] border border-line bg-ink/45 p-4 sm:p-5">
                  <p className="mb-4 text-[11px] uppercase tracking-[0.18em] text-mist">
                    {dict.how.appPreview}
                  </p>
                  <DemoPanel
                    type={step.demo}
                    demo={dict.how.demo}
                    levelLabel={(n) => t("common.level", { n })}
                  />
                </div>

                <div className="relative mt-6 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setActive((prev) => (prev - 1 + steps.length) % steps.length)
                    }
                    className="btn-ghost !px-4 !py-2 text-sm"
                  >
                    {dict.common.prev}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActive((prev) => (prev + 1) % steps.length)}
                    className="btn-primary !px-4 !py-2 text-sm"
                  >
                    {dict.how.nextStep}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
