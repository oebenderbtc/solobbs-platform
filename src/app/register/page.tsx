"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { motion, useReducedMotion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { TronWalletButton } from "@/components/TronWalletButton";
import { Toast } from "@/components/ui/Toast";
import { easeOut } from "@/components/ui/motion";
import { useLocale } from "@/i18n/LocaleProvider";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const reduce = useReducedMotion();
  const { dict } = useLocale();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [toast, setToast] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const acceptedTermsRef = useRef(false);
  const defaultRef = params.get("ref") || "";
  const defaultRole = params.get("role") === "CLIENT" ? "CLIENT" : "MODEL";
  const [role, setRole] = useState<"MODEL" | "CLIENT">(defaultRole);
  const callbackRaw = params.get("callbackUrl");
  const callbackUrl =
    callbackRaw && callbackRaw.startsWith("/") && !callbackRaw.startsWith("//")
      ? callbackRaw
      : "/dashboard";

  function setTerms(next: boolean) {
    acceptedTermsRef.current = next;
    setAcceptedTerms(next);
    if (next) setError("");
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!acceptedTermsRef.current) {
      setError(dict.auth.acceptTermsRequired);
      return;
    }
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name")),
      email: String(form.get("email")),
      password: String(form.get("password")),
      city: String(form.get("city") || ""),
      phone: String(form.get("phone") || ""),
      referralCode: String(form.get("referralCode") || ""),
      role,
    };

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error || dict.auth.registerError);
      return;
    }

    await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false,
    });
    setToast(true);
    setLoading(false);
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.08, ease: easeOut }}
        className="glass rounded-[2rem] p-7 sm:p-8"
      >
        <h1 className="font-display text-3xl tracking-tight">{dict.auth.registerTitle}</h1>
        <p className="mt-2 text-sm text-mist">{dict.auth.registerSubtitle}</p>
        <form id="register-form" onSubmit={onSubmit} className="mt-8 space-y-4">
          <div className="flex gap-2 rounded-2xl bg-ink/45 p-1">
            <button
              type="button"
              onClick={() => setRole("MODEL")}
              className={`flex-1 rounded-xl px-3 py-2 text-sm ${
                role === "MODEL" ? "bg-champagne/20 text-champagne" : "text-mist"
              }`}
            >
              Modelo
            </button>
            <button
              type="button"
              onClick={() => setRole("CLIENT")}
              className={`flex-1 rounded-xl px-3 py-2 text-sm ${
                role === "CLIENT" ? "bg-champagne/20 text-champagne" : "text-mist"
              }`}
            >
              Cliente
            </button>
          </div>

          <label className="flex items-start gap-2.5 text-sm text-mist">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-line bg-ink accent-champagne"
            />
            <span>
              {dict.auth.acceptTerms}{" "}
              <Link
                href="/terms"
                target="_blank"
                className="text-champagne hover:underline"
              >
                {dict.auth.acceptTermsLink}
              </Link>
            </span>
          </label>

          <TronWalletButton
            mode="register"
            role={role}
            label={dict.auth.tronRegister}
            loadingLabel={dict.auth.tronConnecting}
            className={!acceptedTerms ? "pointer-events-none opacity-40" : undefined}
            onError={(msg) => setError(msg)}
            onSuccess={async (payload) => {
              if (!acceptedTermsRef.current) {
                setError(dict.auth.acceptTermsRequired);
                return;
              }
              setError("");
              const form = document.getElementById("register-form") as HTMLFormElement | null;
              const fd = form ? new FormData(form) : null;
              const name = fd ? String(fd.get("name") || "") : "";
              const referralCode = fd
                ? String(fd.get("referralCode") || defaultRef)
                : defaultRef;
              const res = await signIn("credentials", {
                ...payload,
                name: name || undefined,
                role,
                referralCode: referralCode || undefined,
                mode: "register",
                redirect: false,
              });
              if (res?.error) {
                setError(
                  (res as { code?: string }).code ||
                    dict.auth.registerError,
                );
                return;
              }
              setToast(true);
              router.push(callbackUrl);
              router.refresh();
            }}
          />
          <p className="text-center text-[11px] text-mist/70">{dict.auth.tronHint}</p>

          <div className="relative my-2 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-[11px] uppercase tracking-wider text-mist">
              {dict.auth.orContinue}
            </span>
            <div className="h-px flex-1 bg-line" />
          </div>

          <div>
            <label className="mb-2 block text-sm text-mist" htmlFor="name">
              {role === "MODEL" ? dict.auth.stageName : dict.auth.email === "Email" ? "Name" : "Nombre"}
            </label>
            <input id="name" name="name" required className="input-field" placeholder="Lucía" />
          </div>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-mist" htmlFor="city">
                {dict.auth.city}
              </label>
              <input id="city" name="city" className="input-field" placeholder="Medellín" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-mist" htmlFor="phone">
                {dict.auth.phone}
              </label>
              <input id="phone" name="phone" className="input-field" placeholder="+57..." />
            </div>
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
                required
                minLength={6}
                className="input-field pr-12"
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
          <div>
            <label className="mb-2 block text-sm text-mist" htmlFor="referralCode">
              {dict.auth.referralOptional}{" "}
              <span className="text-mist/60">{dict.common.optional}</span>
            </label>
            <input
              id="referralCode"
              name="referralCode"
              defaultValue={defaultRef}
              className="input-field uppercase"
              placeholder="LUCIA7X"
            />
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
                <Loader2 className="h-4 w-4 animate-spin" /> {dict.auth.creating}
              </>
            ) : (
              dict.auth.createCta
            )}
          </motion.button>
        </form>
        <p className="mt-6 text-center text-sm text-mist">
          {dict.auth.haveAccount}{" "}
          <Link href="/login" className="text-champagne hover:underline">
            {dict.auth.loginCta}
          </Link>
        </p>
        <p className="mt-3 text-center text-xs text-mist">
          <Link href="/terms" className="text-champagne/90 hover:underline">
            {dict.legal.termsNav}
          </Link>
        </p>
      </motion.div>
      <Toast open={toast} message={dict.auth.welcome} tone="success" />
    </>
  );
}

export default function RegisterPage() {
  const { dict } = useLocale();

  return (
    <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center overflow-hidden px-5 py-12">
      <div className="auth-orbit left-[-18%] top-[8%] h-56 w-56 bg-champagne/18" />
      <div
        className="auth-orbit right-[-12%] bottom-[12%] h-60 w-60 bg-blush/18"
        style={{ animationDelay: "1.2s" }}
      />
      <div className="absolute right-5 top-5 z-10 sm:right-8 sm:top-8">
        <LanguageSwitcher />
      </div>
      <div className="relative mb-10 flex justify-center">
        <Logo />
      </div>
      <Suspense
        fallback={
          <div className="glass rounded-[2rem] p-8 text-mist">{dict.common.loading}</div>
        }
      >
        <RegisterForm />
      </Suspense>
    </div>
  );
}
