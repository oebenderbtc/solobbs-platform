"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { CurrencySwitcher } from "./CurrencySwitcher";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/LocaleProvider";

export function SiteHeader({ transparent = false }: { transparent?: boolean }) {
  const t = useT();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onModelsSection =
    pathname === "/models" || pathname.startsWith("/models/") || pathname.startsWith("/m/");

  const links = onModelsSection
    ? [{ href: "/", label: t("header.home") }]
    : [
        { href: "#como-funciona", label: t("header.howItWorks") },
        { href: "#garantia", label: t("header.guarantee") },
        { href: "/models", label: t("header.network") },
        { href: "#pagos", label: t("header.payments") },
      ];

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-300",
        scrolled || !transparent
          ? "border-b border-line/80 bg-ink/80 backdrop-blur-xl"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm text-mist md:flex">
          {links.map((link) =>
            link.href.startsWith("#") ? (
              <a
                key={link.label}
                href={link.href}
                className="transition hover:text-cream"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className="transition hover:text-cream"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>
        {/* Mobile: show Inicio when on models */}
        {onModelsSection && (
          <Link
            href="/"
            className="text-sm text-mist transition hover:text-cream md:hidden"
          >
            {t("header.home")}
          </Link>
        )}
        <div className="flex items-center gap-2 sm:gap-3">
          <CurrencySwitcher className="hidden sm:inline-flex" />
          <LanguageSwitcher />
          {session?.user ? (
            <Link
              href={session.user.role === "ADMIN" ? "/admin" : "/dashboard"}
              className="btn-primary !px-3.5 !py-2 text-sm sm:!px-4"
            >
              {t("shell.modelNav.panel")}
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="btn-ghost !px-3.5 !py-2 text-sm sm:!px-4"
              >
                {t("header.login")}
              </Link>
              <Link
                href="/register"
                className="btn-primary !px-3.5 !py-2 text-sm sm:!px-4"
              >
                {t("header.join")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
