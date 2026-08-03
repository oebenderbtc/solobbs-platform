"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Smileys",
    emojis: [
      "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😜", "🤗", "🤔",
      "😎", "🥳", "😏", "😌", "😴", "😢", "😭", "😤", "🤯", "❤️",
    ],
  },
  {
    label: "Gestures",
    emojis: [
      "👍", "👎", "👏", "🙌", "🙏", "👌", "✌️", "🤞", "👋", "💪",
      "🔥", "✨", "💫", "⭐", "💯", "🎉", "💋", "🌹", "🥂", "🍾",
    ],
  },
  {
    label: "Chat",
    emojis: [
      "💬", "📍", "🕐", "📸", "💄", "👠", "💅", "🌙", "☀️", "🚕",
      "🏠", "🔑", "💵", "💸", "✅", "❌", "⚠️", "📌", "🥰", "😈",
    ],
  },
];

export function ChatEmojiPicker({
  open,
  onClose,
  onPick,
  className,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (emoji: string) => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute bottom-[calc(100%+0.5rem)] left-0 z-20 w-[min(100%,20rem)] overflow-hidden rounded-2xl border border-line bg-ink-elevated/98 shadow-2xl backdrop-blur-xl",
        className,
      )}
    >
      <div className="max-h-52 space-y-3 overflow-y-auto p-3">
        {EMOJI_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 text-[10px] uppercase tracking-[0.16em] text-mist/80">
              {group.label}
            </p>
            <div className="grid grid-cols-8 gap-0.5">
              {group.emojis.map((emoji) => (
                <button
                  key={`${group.label}-${emoji}`}
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-lg transition hover:bg-white/10"
                  onClick={() => {
                    onPick(emoji);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
