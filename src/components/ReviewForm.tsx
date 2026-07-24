"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/i18n/LocaleProvider";

type Props = {
  jobId: string;
  targetName: string;
  targetRole: "MODEL" | "CLIENT";
  onSubmitted?: () => void;
};

export function ReviewForm({ jobId, targetName, targetRole, onSubmitted }: Props) {
  const router = useRouter();
  const { dict } = useLocale();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, rating, comment: comment.trim() || undefined }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || dict.reviews.error);
      return;
    }
    setDone(true);
    onSubmitted?.();
    router.refresh();
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
        {dict.reviews.thanks}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-line bg-ink/40 p-4">
      <p className="text-sm text-mist">
        {targetRole === "MODEL"
          ? dict.reviews.rateModel.replace("{name}", targetName)
          : dict.reviews.rateClient.replace("{name}", targetName)}
      </p>

      <div className="mt-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((value) => {
          const active = (hover || rating) >= value;
          return (
            <button
              key={value}
              type="button"
              aria-label={`${value}`}
              onMouseEnter={() => setHover(value)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(value)}
              className="rounded-lg p-1 transition hover:scale-110"
            >
              <Star
                className={cn(
                  "h-6 w-6",
                  active ? "fill-champagne text-champagne" : "text-mist/50",
                )}
              />
            </button>
          );
        })}
        <span className="ml-2 text-sm text-cream">{rating}/5</span>
      </div>

      <label className="mt-4 block">
        <span className="mb-2 block text-sm text-mist">{dict.reviews.comment}</span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          maxLength={800}
          className="input-field min-h-[88px] resize-y"
          placeholder={dict.reviews.commentPlaceholder}
        />
      </label>

      {error && (
        <p className="mt-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <button disabled={loading} className="btn-primary mt-4 !px-4 !py-2.5 text-sm">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> {dict.common.loading}
          </>
        ) : (
          dict.reviews.submit
        )}
      </button>
    </form>
  );
}
