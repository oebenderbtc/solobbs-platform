"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  ArrowRight,
  CreditCard,
  Bitcoin,
  Network,
  BarChart3,
  ChevronDown,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Reveal } from "@/components/ui/Reveal";
import { HowItWorks } from "@/components/HowItWorks";
import { easeOut } from "@/components/ui/motion";
import { useLocale } from "@/i18n/LocaleProvider";

export default function HomePage() {
  const reduce = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const { dict } = useLocale();

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const mediaY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0.2]);

  const escrowSteps = [
    dict.landing.escrowStep1,
    dict.landing.escrowStep2,
    dict.landing.escrowStep3,
  ];

  return (
    <div className="noise relative overflow-x-hidden">
      <SiteHeader transparent />

      <section ref={heroRef} className="relative min-h-[100svh] overflow-hidden bg-ink">
        <motion.div
          className="absolute inset-0 scale-105"
          style={reduce ? undefined : { y: mediaY }}
        >
          <Image
            src="/hero.jpg"
            alt={dict.landing.heroAlt}
            fill
            priority
            className="object-cover object-[center_30%]"
            sizes="100vw"
          />
        </motion.div>

        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-ink/55" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/45 to-ink" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/75 via-ink/35 to-transparent" />
        </div>

        <motion.div
          style={reduce ? undefined : { opacity: contentOpacity }}
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: easeOut }}
          className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-5 pb-16 pt-28 sm:px-6 sm:pb-20 lg:justify-center lg:pb-24"
        >
          <div className="max-w-xl">
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: easeOut }}
              className="mb-4 text-[11px] font-medium uppercase tracking-[0.28em] text-blush"
            >
              {dict.landing.privatePlatform}
            </motion.p>
            <motion.h1
              initial={reduce ? false : { opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.18, ease: easeOut }}
              className="font-display text-5xl leading-[0.95] tracking-tight text-cream sm:text-7xl lg:text-8xl"
            >
              Solo<span className="text-blush">BBs</span>
            </motion.h1>
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: easeOut }}
              className="mt-5 max-w-md text-lg leading-relaxed text-cream/85 sm:text-xl"
            >
              {dict.landing.heroTagline}
            </motion.p>
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.42, ease: easeOut }}
              className="mt-9 flex flex-wrap items-center gap-3"
            >
              <Link href="/register" className="btn-primary btn-glow">
                {dict.landing.createAccount}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#como-funciona" className="btn-ghost">
                {dict.landing.seeHow}
              </a>
            </motion.div>
          </div>

          <motion.a
            href="#como-funciona"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.7 }}
            className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-mist/80 sm:flex"
          >
            {dict.landing.scroll}
            <motion.span
              animate={reduce ? undefined : { y: [0, 6, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            >
              <ChevronDown className="h-4 w-4" />
            </motion.span>
          </motion.a>
        </motion.div>
      </section>

      <HowItWorks />

      <section id="garantia" className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blush/8 via-transparent to-champagne/8" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:px-6 sm:py-28 lg:grid-cols-2">
          <Reveal direction="left">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-champagne">
              {dict.landing.escrowEyebrow}
            </p>
            <h2 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
              {dict.landing.escrowTitle}
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-mist">
              {dict.landing.escrowBody}
            </p>
          </Reveal>

          <Reveal delay={0.1} direction="right">
            <ol className="space-y-0">
              {escrowSteps.map((step, i) => (
                <motion.li
                  key={step}
                  initial={reduce ? false : { opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + i * 0.12, duration: 0.5 }}
                  className="flex items-center gap-4 border-b border-line py-5 last:border-0"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-champagne/20 to-blush/20 font-display text-champagne">
                    {i + 1}
                  </span>
                  <span className="text-lg text-cream">{step}</span>
                </motion.li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      <section id="pagos" className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-28">
        <Reveal>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-blush">
                {dict.landing.paymentsEyebrow}
              </p>
              <h2 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
                {dict.landing.paymentsTitle}
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-mist">
                {dict.landing.paymentsBody}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {[
                { icon: CreditCard, label: "Visa / Mastercard", color: "text-champagne" },
                { icon: Bitcoin, label: "USDT / BTC", color: "text-blush" },
              ].map((chip, i) => (
                <motion.div
                  key={chip.label}
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -3, scale: 1.03 }}
                  className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm text-cream"
                >
                  <chip.icon className={`h-4 w-4 ${chip.color}`} />
                  {chip.label}
                </motion.div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      <section id="red" className="mx-auto max-w-6xl px-5 pb-20 sm:px-6 sm:pb-28">
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal direction="left">
            <motion.div
              whileHover={reduce ? undefined : { y: -4 }}
              className="surface h-full rounded-[2rem] p-8 sm:p-10"
            >
              <BarChart3 className="h-5 w-5 text-champagne" />
              <h2 className="mt-5 font-display text-3xl tracking-tight">
                {dict.landing.metricsTitle}
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-mist">
                {dict.landing.metricsBody}
              </p>
            </motion.div>
          </Reveal>
          <Reveal delay={0.08} direction="right">
            <motion.div
              whileHover={reduce ? undefined : { y: -4 }}
              className="surface h-full rounded-[2rem] p-8 sm:p-10"
            >
              <Network className="h-5 w-5 text-blush" />
              <h2 className="mt-5 font-display text-3xl tracking-tight">
                {dict.landing.networkTitle}
              </h2>
              <div className="mt-6 space-y-2">
                {[
                  [dict.landing.level1, "10%"],
                  [dict.landing.level2, "5%"],
                  [dict.landing.level3, "2%"],
                ].map(([level, pct], i) => (
                  <motion.div
                    key={level}
                    initial={reduce ? false : { opacity: 0, x: 12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.15 + i * 0.08 }}
                    whileHover={{ x: 4 }}
                    className="flex items-center justify-between rounded-2xl bg-ink/50 px-4 py-3.5"
                  >
                    <span className="text-mist">{level}</span>
                    <span className="font-display text-xl text-champagne">{pct}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </Reveal>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-6 sm:pb-28">
        <Reveal direction="scale">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-line px-6 py-16 text-center sm:px-12">
            <div className="absolute inset-0 bg-gradient-to-r from-blush/12 via-transparent to-champagne/12" />
            <div className="relative">
              <h2 className="font-display text-4xl tracking-tight sm:text-5xl">
                {dict.landing.ctaTitle}
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[15px] text-mist">
                {dict.landing.ctaBody}
              </p>
              <Link href="/register" className="btn-primary btn-glow relative mt-8 inline-flex">
                {dict.landing.ctaButton}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-line px-6 py-8 text-center text-sm text-mist">
        <p>
          © {new Date().getFullYear()} SoloBBs · {dict.landing.footer}
        </p>
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <Link href="/terms" className="text-champagne hover:underline">
            {dict.landing.terms}
          </Link>
        </p>
      </footer>
    </div>
  );
}
