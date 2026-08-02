"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { motion, useReducedMotion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SimpleCaptcha } from "@/components/SimpleCaptcha";
import { TronWalletButton } from "@/components/TronWalletButton";
import { Toast } from "@/components/ui/Toast";
import { easeOut } from "@/components/ui/motion";
import { useLocale } from "@/i18n/LocaleProvider";

function safeCallback(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const reduce = useReducedMotion();
  const { dict } = useLocale();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [toast, setToast] = useState(false);
  const [captcha, setCaptcha] = useState({ token: "", answer: "" });
  const captchaRef = useRef(captcha);
  captchaRef.current = captcha;
  const callbackUrl = safeCallback(params.get("callbackUrl"));

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!captcha.token || !captcha.answer.trim()) {
      setError(dict.auth.captchaRequired);
      return;
    }
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(form.get("email")),
      password: String(form.get("password")),
      captchaToken: captcha.token,
      captchaAnswer: captcha.answer,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      const code = (res as { code?: string }).code;
      setError(
        code && /captcha|Captcha|verific/i.test(code)
          ? code
          : dict.auth.loginError,
      );
      return;
    }
    setToast(true);
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center overflow-hidden px-5 py-12">
      <div className="auth-orbit left-[-20%] top-[10%] h-56 w-56 bg-blush/20" />
      <div
        className="auth-orbit right-[-15%] bottom-[15%] h-64 w-64 bg-champagne/15"
        style={{ animationDelay: "1.5s" }}
      />

      <div className="absolute right-5 top-5 z-10 sm:right-8 sm:top-8">
        <LanguageSwitcher />
      </div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeOut }}
        className="relative mb-10 flex justify-center"
      >
        <Logo />
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.08, ease: easeOut }}
        className="glass relative rounded-[2rem] p-7 sm:p-8"
      >
        <h1 className="font-display text-3xl tracking-tight">
          {dict.auth.loginTitle}
        </h1>
        <p className="mt-2 text-sm text-mist">{dict.auth.loginSubtitle}</p>
        <div className="mt-8 space-y-4">
          <SimpleCaptcha onChange={setCaptcha} />
          <TronWalletButton
            mode="login"
            label={dict.auth.tronLogin}
            loadingLabel={dict.auth.tronConnecting}
            onError={(msg) => setError(msg)}
            onSuccess={async (payload) => {
              const cap = captchaRef.current;
              if (!cap.token || !cap.answer.trim()) {
                setError(dict.auth.captchaRequired);
                return;
              }
              setError("");
              setLoading(true);
              const res = await signIn("credentials", {
                ...payload,
                mode: "login",
                captchaToken: cap.token,
                captchaAnswer: cap.answer,
                redirect: false,
              });
              setLoading(false);
              if (res?.error) {
                setError(
                  (res as { code?: string }).code || dict.auth.loginError,
                );
                return;
              }
              setToast(true);
              router.push(callbackUrl);
              router.refresh();
            }}
          />
          <p className="text-center text-[11px] text-mist/70">{dict.auth.tronHint}</p>
          <div className="relative flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-[11px] uppercase tracking-wider text-mist">
              {dict.auth.orContinue}
            </span>
            <div className="h-px flex-1 bg-line" />
          </div>
        </div>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-2 block text-sm text-mist" htmlFor="email">
              {dict.auth.email}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input-field"
              placeholder="tu@email.com"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-mist" htmlFor="password">
              {dict.auth.password}
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPass ? "text" : "password"}
                autoComplete="current-password"
                required
                className="input-field pr-12"
                placeholder="••••••••"
              />
              <button
                type="button"
                aria-label={
                  showPass ? dict.auth.hidePassword : dict.auth.showPassword
                }
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-mist hover:text-cream"
              >
                {showPass ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
            >
              {error}
            </motion.p>
          )}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {dict.auth.loggingIn}
              </>
            ) : (
              dict.auth.loginCta
            )}
          </motion.button>
        </form>
        <p className="mt-6 text-center text-sm text-mist">
          {dict.auth.newHere}{" "}
          <Link
            href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="text-champagne transition hover:underline"
          >
            {dict.auth.createAccount}
          </Link>
        </p>
        <p className="mt-4 text-center text-xs text-mist">
          <Link href="/terms" className="text-champagne/90 hover:underline">
            {dict.legal.termsNav}
          </Link>
        </p>
        <div className="mt-6 whitespace-pre-line rounded-2xl bg-ink/50 p-4 text-xs leading-relaxed text-mist">
          {dict.auth.demoHint}
        </div>
      </motion.div>
      <Toast open={toast} message={dict.auth.welcomeBack} tone="success" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink" />}>
      <LoginForm />
    </Suspense>
  );
}
