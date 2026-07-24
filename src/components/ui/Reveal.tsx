"use client";

import { motion, useReducedMotion } from "framer-motion";

export function Reveal({
  children,
  delay = 0,
  className,
  direction = "up",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: "up" | "left" | "right" | "scale";
}) {
  const reduce = useReducedMotion();

  const initial =
    direction === "left"
      ? { opacity: 0, x: -28 }
      : direction === "right"
        ? { opacity: 0, x: 28 }
        : direction === "scale"
          ? { opacity: 0, scale: 0.94 }
          : { opacity: 0, y: 22 };

  return (
    <motion.div
      className={className}
      initial={reduce ? false : initial}
      whileInView={
        reduce
          ? undefined
          : { opacity: 1, x: 0, y: 0, scale: 1 }
      }
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
