"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { motion, useReducedMotion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Toast } from "@/components/ui/Toast";
import { easeOut } from "@/components/ui/motion";
import { useLocale } from "@/i18n/LocaleProvider";

export default function LoginPage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { dict } = useLocale();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [toast, setToast] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(form.get("email")),
      password: String(form.get("password")),
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError(dict.auth.loginError);
      return;
    }
    setToast(true);
    router.push("/dashboard");
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
        <h1 className="font-display text-3xl tracking-tight">{dict.auth.loginTitle}</h1>
        <p className="mt-2 text-sm text-mist">{dict.auth.loginSubtitle}</p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
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
                aria-label={showPass ? dict.auth.hidePassword : dict.auth.showPassword}
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-mist hover:text-cream"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
          <Link href="/register" className="text-champagne transition hover:underline">
            {dict.auth.createAccount}
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
