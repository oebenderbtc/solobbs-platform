import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Outfit } from "next/font/google";
import { Providers } from "@/components/Providers";
import { SupportChat } from "@/components/SupportChat";
import { getDictionary, getLocale } from "@/i18n/server";
import {
  CURRENCY_COOKIE,
  type DisplayCurrency,
} from "@/lib/display-currency";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    title: dict.meta.title,
    description: dict.meta.description,
    icons: {
      icon: [{ url: "/mark.svg", type: "image/svg+xml" }],
      shortcut: "/mark.svg",
      apple: "/mark.svg",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const jar = await cookies();
  const raw = jar.get(CURRENCY_COOKIE)?.value;
  const currency: DisplayCurrency = raw === "COP" ? "COP" : "USD";

  return (
    <html
      lang={locale}
      data-scroll-behavior="smooth"
      className={`${outfit.variable} h-full`}
    >
      <body className={`${outfit.className} min-h-full antialiased`}>
        <Providers locale={locale} currency={currency}>
          {children}
          <SupportChat />
        </Providers>
      </body>
    </html>
  );
}
