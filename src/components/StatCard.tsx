"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

function parseDisplayValue(value: string) {
  const numeric = value.replace(/[^\d.-]/g, "");
  const n = Number(numeric);
  return Number.isFinite(n) ? n : null;
}

export function StatCard({
  label,
  value,
  hint,
  className,
  tone = "default",
  index = 0,
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
  tone?: "default" | "champagne" | "blush";
  index?: number;
}) {
  const reduce = useReducedMotion();
  const target = parseDisplayValue(value);
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 70, damping: 18 });
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (target === null || reduce) {
      setDisplay(value);
      return;
    }
    motionValue.set(0);
    const unsub = spring.on("change", (v) => {
      const rounded = Math.round(v);
      if (value.includes("$") || value.includes("COP") || /[.\s]\d{3}/.test(value)) {
        setDisplay(
          new Intl.NumberFormat("es-CO", {
            style: "currency",
            currency: "COP",
            maximumFractionDigits: 0,
          }).format(rounded),
        );
      } else if (value.includes("chicas") || /^\d+$/.test(value.trim())) {
        const suffix = value.replace(/[\d.\s,$]/g, "").trim();
        setDisplay(suffix ? `${rounded} ${suffix}` : `${rounded}`);
      } else {
        setDisplay(String(rounded));
      }
    });
    motionValue.set(target);
    return () => unsub();
  }, [value, target, motionValue, spring, reduce]);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduce ? undefined : { y: -4, transition: { duration: 0.25 } }}
      className={cn(
        "surface group relative overflow-hidden rounded-[1.5rem] p-5 transition hover:border-champagne/30",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-40 blur-2xl transition duration-500 group-hover:opacity-80 group-hover:scale-125",
          tone === "blush" ? "bg-blush/30" : "bg-champagne/25",
        )}
      />
      <div className="shine pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100" />
      <p className="relative text-[11px] font-medium uppercase tracking-[0.18em] text-mist">
        {label}
      </p>
      <p
        className={cn(
          "relative mt-3 font-display text-[1.85rem] tracking-tight text-cream sm:text-3xl",
          tone === "champagne" && "text-champagne",
          tone === "blush" && "text-blush",
        )}
      >
        {display}
      </p>
      {hint && <p className="relative mt-2 text-sm text-mist">{hint}</p>}
    </motion.div>
  );
}
