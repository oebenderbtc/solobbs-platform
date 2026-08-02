"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard,
  ShieldCheck,
  Wallet,
  Network,
  Briefcase,
  Settings,
  Users,
  LogOut,
  CreditCard,
  Menu,
  X,
  Headphones,
  Star,
  Images,
  MessageCircle,
  BadgeCheck,
} from "lucide-react";
import { Logo } from "./Logo";
import { PanelCoach } from "./PanelCoach";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { CurrencySwitcher } from "./CurrencySwitcher";
import { NotificationBell } from "./NotificationBell";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { useLocale } from "@/i18n/LocaleProvider";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function DashboardShell({
  children,
  role,
  name,
}: {
  children: React.ReactNode;
  role: string;
  name: string;
}) {
  const pathname = usePathname();
  const isAdmin = role === "ADMIN";
  const isClient = role === "CLIENT";
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const { dict, t } = useLocale();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const items: NavItem[] = isAdmin
    ? [
        { href: "/admin", label: dict.shell.adminNav.overview, icon: LayoutDashboard },
        { href: "/admin/users", label: dict.shell.adminNav.users, icon: Users },
        { href: "/admin/escrows", label: dict.shell.adminNav.escrows, icon: ShieldCheck },
        { href: "/admin/payments", label: dict.shell.adminNav.payments, icon: CreditCard },
        { href: "/admin/support", label: dict.shell.adminNav.support, icon: Headphones },
        { href: "/admin/settings", label: dict.shell.adminNav.settings, icon: Settings },
      ]
    : isClient
      ? [
          { href: "/dashboard", label: dict.shell.clientNav.panel, icon: LayoutDashboard },
          { href: "/models", label: dict.shell.clientNav.browse, icon: Users },
          { href: "/dashboard/wallet", label: dict.shell.clientNav.wallet, icon: Wallet },
          { href: "/dashboard/jobs", label: dict.shell.clientNav.jobs, icon: Briefcase },
          { href: "/dashboard/messages", label: dict.shell.clientNav.messages, icon: MessageCircle },
          { href: "/dashboard/payment-methods", label: dict.shell.clientNav.paymentMethods, icon: CreditCard },
          { href: "/dashboard/reviews", label: dict.shell.clientNav.reviews, icon: Star },
          { href: "/dashboard/kyc", label: dict.shell.clientNav.kyc, icon: BadgeCheck },
          { href: "/dashboard/settings", label: dict.shell.clientNav.profile, icon: Settings },
        ]
      : [
          { href: "/dashboard", label: dict.shell.modelNav.panel, icon: LayoutDashboard },
          { href: "/dashboard/gallery", label: dict.shell.modelNav.gallery, icon: Images },
          { href: "/dashboard/messages", label: dict.shell.modelNav.messages, icon: MessageCircle },
          { href: "/dashboard/payment-methods", label: dict.shell.modelNav.paymentMethods, icon: CreditCard },
          { href: "/dashboard/jobs", label: dict.shell.modelNav.jobs, icon: Briefcase },
          { href: "/dashboard/escrow", label: dict.shell.modelNav.escrow, icon: ShieldCheck },
          { href: "/dashboard/wallet", label: dict.shell.modelNav.wallet, icon: Wallet },
          { href: "/dashboard/network", label: dict.shell.modelNav.network, icon: Network },
          { href: "/dashboard/reviews", label: dict.shell.modelNav.reviews, icon: Star },
          { href: "/dashboard/kyc", label: dict.shell.modelNav.kyc, icon: BadgeCheck },
          { href: "/dashboard/settings", label: dict.shell.modelNav.profile, icon: Settings },
        ];

  const homeHref = isAdmin ? "/admin" : "/dashboard";
  const accountLabel = isAdmin
    ? dict.shell.admin
    : isClient
      ? dict.shell.clientAccount
      : dict.shell.modelAccount;

  const nav = (
    <>
      <div className="px-5 py-5">
        <div className="flex items-start justify-between gap-2">
          <Logo href={homeHref} size={48} />
          <div className="mt-1 hidden flex-col items-end gap-1.5 lg:flex">
            <CurrencySwitcher />
            <LanguageSwitcher />
          </div>
        </div>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-5 rounded-2xl bg-ink/50 px-3.5 py-3"
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-mist">
            {accountLabel}
          </p>
          <p className="mt-1 truncate text-sm font-medium text-cream">{name}</p>
        </motion.div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 pb-4">
        {items.map((item, i) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              item.href !== "/admin" &&
              pathname.startsWith(item.href));
          return (
            <motion.div
              key={item.href}
              initial={reduce ? false : { opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 + i * 0.04 }}
            >
              <Link
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition",
                  active
                    ? "bg-gradient-to-r from-champagne/15 to-blush/10 text-champagne"
                    : "text-mist hover:bg-white/5 hover:text-cream",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-gradient-to-b from-champagne to-blush"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className={cn("h-4 w-4", active && "text-blush")} />
                {item.label}
              </Link>
            </motion.div>
          );
        })}

        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="mt-auto flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-mist transition hover:bg-white/5 hover:text-cream"
        >
          <LogOut className="h-4 w-4" />
          {dict.shell.logout}
        </button>
      </nav>
    </>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[272px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-ink-soft/40 lg:flex">
        {nav}
      </aside>

      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-ink/85 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Logo href={homeHref} size={44} />
        <div className="flex items-center gap-2">
          <NotificationBell />
          <CurrencySwitcher className="hidden sm:inline-flex" />
          <LanguageSwitcher />
          <button
            type="button"
            aria-label={open ? t("common.closeMenu") : t("common.openMenu")}
            onClick={() => setOpen((v) => !v)}
            className="rounded-xl border border-line p-2 text-cream"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.button
              type="button"
              aria-label={t("common.close")}
              className="absolute inset-0 bg-black/55"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="absolute inset-y-0 left-0 flex w-[86%] max-w-xs flex-col border-r border-line bg-ink-soft shadow-2xl"
            >
              {nav}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="min-w-0">
        <div className="sticky top-0 z-20 hidden items-center justify-end gap-3 border-b border-line bg-ink/70 px-7 py-3 backdrop-blur-xl lg:flex lg:px-10">
          <CurrencySwitcher />
          <NotificationBell />
          <LanguageSwitcher />
        </div>

        <main className="px-4 py-6 sm:px-7 lg:px-10 lg:py-9">
          <motion.div
            key={pathname}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-6xl"
          >
            {children}
          </motion.div>
        </main>
      </div>

      <PanelCoach role={role} />
    </div>
  );
}
