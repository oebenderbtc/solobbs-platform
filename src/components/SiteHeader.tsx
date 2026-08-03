"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Menu, X } from "lucide-react";
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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const onModelsSection =
    pathname === "/models" ||
    pathname.startsWith("/models/") ||
    pathname.startsWith("/m/");

  const links = onModelsSection
    ? [{ href: "/", label: t("header.home") }]
    : [
        { href: "#como-funciona", label: t("header.howItWorks") },
        { href: "#garantia", label: t("header.guarantee") },
        { href: "/models", label: t("header.network") },
        { href: "#pagos", label: t("header.payments") },
      ];

  function NavLinks({
    onNavigate,
    className,
    linkClassName,
  }: {
    onNavigate?: () => void;
    className?: string;
    linkClassName?: string;
  }) {
    return (
      <nav className={className}>
        {links.map((link) =>
          link.href.startsWith("#") ? (
            <a
              key={link.label}
              href={link.href}
              onClick={onNavigate}
              className={cn("transition hover:text-cream", linkClassName)}
            >
              {link.label}
            </a>
          ) : (
            <Link
              key={link.label}
              href={link.href}
              onClick={onNavigate}
              className={cn("transition hover:text-cream", linkClassName)}
            >
              {link.label}
            </Link>
          ),
        )}
      </nav>
    );
  }

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-300",
        "pt-[env(safe-area-inset-top)]",
        scrolled || !transparent || menuOpen
          ? "border-b border-line/80 bg-ink/80 backdrop-blur-xl"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-3 py-3 sm:gap-3 sm:px-6 sm:py-4">
        <Logo className="min-w-0 shrink" size={34} />

        <NavLinks
          className="ml-auto hidden items-center gap-6 text-sm text-mist md:flex"
          linkClassName="py-1"
        />

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2.5 md:ml-0">
          <CurrencySwitcher className="hidden sm:inline-flex" />
          <LanguageSwitcher className="hidden sm:inline-flex" />
          {session?.user ? (
            <Link
              href={session.user.role === "ADMIN" ? "/admin" : "/dashboard"}
              className="btn-primary !px-3 !py-2 text-sm sm:!px-4"
            >
              {t("shell.modelNav.panel")}
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="btn-ghost !px-2.5 !py-2 text-sm sm:!px-3.5"
              >
                {t("header.login")}
              </Link>
              <Link
                href="/register"
                className="btn-primary !px-2.5 !py-2 text-sm sm:!px-4"
              >
                {t("header.join")}
              </Link>
            </>
          )}
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line text-cream md:hidden"
            aria-label={menuOpen ? t("common.closeMenu") : t("common.openMenu")}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-line bg-ink/95 px-3 py-3 backdrop-blur-xl md:hidden">
          <NavLinks
            onNavigate={() => setMenuOpen(false)}
            className="flex flex-col text-base text-mist"
            linkClassName="rounded-xl px-3 py-3 hover:bg-white/5"
          />
          <div className="mt-3 space-y-3 border-t border-line px-3 pt-4 sm:hidden">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-mist">{t("common.language")}</span>
              <LanguageSwitcher />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-mist">{t("common.currency")}</span>
              <CurrencySwitcher />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
