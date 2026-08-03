"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastTone = "success" | "error" | "info";

export function Toast({
  open,
  message,
  tone = "info",
}: {
  open: boolean;
  message: string;
  tone?: ToastTone;
}) {
  const Icon = tone === "success" ? CheckCircle2 : tone === "error" ? XCircle : Info;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          className="pointer-events-none fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-1/2 z-50 w-[min(92vw,380px)] -translate-x-1/2"
        >
          <div
            className={cn(
              "glass flex items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl shadow-black/40",
              tone === "success" && "border-success/30",
              tone === "error" && "border-danger/30",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                tone === "success" && "text-success",
                tone === "error" && "text-danger",
                tone === "info" && "text-champagne",
              )}
            />
            <p className="text-sm text-cream">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
