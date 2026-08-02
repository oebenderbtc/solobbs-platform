"use client";

import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type StoryItem = {
  id: string;
  url: string;
  mediaType: string;
  caption: string | null;
  expiresAt?: string;
  createdAt?: string;
};

export function StoryViewer({
  stories,
  modelName,
  startIndex = 0,
  onClose,
  onFinished,
}: {
  stories: StoryItem[];
  modelName: string;
  startIndex?: number;
  onClose: () => void;
  /** Called when the last story ends (instead of only closing). */
  onFinished?: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const timer = useRef<number | null>(null);
  const story = stories[index];
  const isVideo = story?.mediaType === "VIDEO";
  const duration = isVideo ? 15000 : 5000;

  useEffect(() => {
    setProgress(0);
    if (!story || isVideo) return;
    const started = Date.now();
    timer.current = window.setInterval(() => {
      const p = Math.min(1, (Date.now() - started) / duration);
      setProgress(p);
      if (p >= 1) next();
    }, 50);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, story?.id]);

  function finish() {
    if (onFinished) onFinished();
    else onClose();
  }

  function next() {
    if (index >= stories.length - 1) finish();
    else setIndex((i) => i + 1);
  }

  function prev() {
    if (index <= 0) return;
    setIndex((i) => i - 1);
  }

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95 p-3">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-cream"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="relative h-[min(90vh,720px)] w-full max-w-md overflow-hidden rounded-3xl bg-ink">
        <div className="absolute left-0 right-0 top-0 z-10 flex gap-1 px-3 pt-3">
          {stories.map((s, i) => (
            <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full bg-white transition-[width]"
                style={{
                  width:
                    i < index ? "100%" : i === index ? `${progress * 100}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        <p className="absolute left-4 top-6 z-10 text-sm font-medium text-cream drop-shadow">
          {modelName}
        </p>

        {isVideo ? (
          <video
            key={story.id}
            src={story.url}
            className="h-full w-full object-contain"
            autoPlay
            playsInline
            onEnded={next}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (v.duration) setProgress(v.currentTime / v.duration);
            }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={story.url}
            alt={story.caption || modelName}
            className="h-full w-full object-contain"
          />
        )}

        {story.caption && (
          <p className="absolute bottom-6 left-4 right-4 text-center text-sm text-cream drop-shadow">
            {story.caption}
          </p>
        )}

        <button
          type="button"
          className="absolute inset-y-0 left-0 w-1/3"
          onClick={prev}
          aria-label="Previous"
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 w-1/3"
          onClick={next}
          aria-label="Next"
        />
      </div>

      <button
        type="button"
        onClick={prev}
        className={cn(
          "absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-cream sm:flex",
          index === 0 && "opacity-30",
        )}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={next}
        className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/10 p-2 text-cream sm:flex"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

export function StoryRing({
  hasStories,
  avatarUrl,
  name,
  label,
  onClick,
  size = "md",
}: {
  hasStories: boolean;
  avatarUrl?: string | null;
  name: string;
  label?: string;
  onClick: () => void;
  size?: "md" | "lg";
}) {
  const dim = size === "lg" ? "h-[72px] w-[72px]" : "h-16 w-16";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!hasStories}
      className={cn(
        "flex shrink-0 flex-col items-center gap-1.5",
        !hasStories && "cursor-default opacity-80",
      )}
    >
      <span
        className={cn(
          "rounded-full p-[2.5px]",
          hasStories
            ? "bg-gradient-to-tr from-champagne via-blush to-champagne"
            : "bg-line",
        )}
      >
        <span
          className={cn(
            "block overflow-hidden rounded-full border-2 border-ink bg-ink",
            dim,
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl || "/mark.svg"}
            alt={name}
            className="h-full w-full object-cover"
          />
        </span>
      </span>
      {label && (
        <span className="max-w-[72px] truncate text-center text-[11px] text-mist">
          {label}
        </span>
      )}
    </button>
  );
}
