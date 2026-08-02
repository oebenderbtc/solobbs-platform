"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { useLocale } from "@/i18n/LocaleProvider";
import { termsEn, termsEs } from "@/content/terms";

export default function TermsPage() {
  const { locale, dict } = useLocale();
  const doc = locale === "en" ? termsEn : termsEs;

  return (
    <div className="noise min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 pb-20 pt-28 sm:px-6">
        <p className="text-[11px] uppercase tracking-[0.22em] text-blush">
          {dict.legal.eyebrow}
        </p>
        <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
          {doc.title}
        </h1>
        <p className="mt-2 text-sm text-mist">{doc.updated}</p>
        <p className="mt-6 text-[15px] leading-relaxed text-cream/90">
          {doc.intro}
        </p>

        <div className="mt-10 space-y-8">
          {doc.sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-display text-2xl tracking-tight text-cream">
                {section.title}
              </h2>
              <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-mist">
                {section.paragraphs.map((p) => (
                  <p key={p.slice(0, 48)}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-12 text-sm text-mist">
          <Link href="/" className="text-champagne hover:underline">
            {dict.header.home}
          </Link>
          {" · "}
          <Link href="/register" className="text-champagne hover:underline">
            {dict.header.join}
          </Link>
        </p>
      </main>
    </div>
  );
}
