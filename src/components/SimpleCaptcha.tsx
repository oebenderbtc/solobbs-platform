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
      <div className="flex items-center gap-2">
        <div className="flex min-w-[7.5rem] items-center justify-center rounded-2xl border border-line bg-ink/50 px-3 py-2.5 font-mono text-lg text-champagne">
          {loading || !challenge ? "…" : `${challenge.question} = ?`}
        </div>
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
          className="btn-ghost shrink-0 rounded-xl p-2.5"
          aria-label={dict.auth.captchaRefresh}
          title={dict.auth.captchaRefresh}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
      <input type="hidden" name="captchaToken" value={challenge?.token || ""} />
    </div>
  );
}
