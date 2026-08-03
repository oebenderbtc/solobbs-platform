"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useLocale } from "@/i18n/LocaleProvider";

type Challenge = {
  token: string;
  question: string;
};

export function SimpleCaptcha({
  onChange,
}: {
  /** Called whenever token or answer changes */
  onChange: (value: { token: string; answer: string }) => void;
}) {
  const { dict } = useLocale();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const load = useCallback(async () => {
    setLoading(true);
    setAnswer("");
    try {
      const res = await fetch("/api/captcha");
      const data = await res.json();
      if (res.ok && data.token) {
        setChallenge({ token: data.token, question: data.question });
        onChangeRef.current({ token: data.token, answer: "" });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <label className="mb-2 block text-sm text-mist" htmlFor="captcha-answer">
        {dict.auth.captchaLabel}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex min-h-11 items-center justify-center rounded-2xl border border-line bg-ink/50 px-3 py-2.5 font-mono text-lg text-champagne sm:min-w-[7.5rem]">
          {loading || !challenge ? "…" : `${challenge.question} = ?`}
        </div>
        <div className="flex flex-1 items-center gap-2">
          <input
            id="captcha-answer"
            name="captchaAnswer"
            inputMode="numeric"
            autoComplete="off"
            required
            className="input-field flex-1"
            placeholder={dict.auth.captchaPlaceholder}
            value={answer}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d]/g, "");
              setAnswer(v);
              if (challenge) {
                onChangeRef.current({ token: challenge.token, answer: v });
              }
            }}
          />
          <button
            type="button"
            onClick={() => void load()}
            className="btn-ghost inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl p-0"
            aria-label={dict.auth.captchaRefresh}
            title={dict.auth.captchaRefresh}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
      <input type="hidden" name="captchaToken" value={challenge?.token || ""} />
    </div>
  );
}
