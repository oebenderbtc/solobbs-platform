"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  size = "md",
  className,
}: {
  value: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const dim = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            dim,
            n <= Math.round(value) ? "fill-champagne text-champagne" : "text-mist/40",
          )}
        />
      ))}
    </span>
  );
}
