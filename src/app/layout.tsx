import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { Providers } from "@/components/Providers";
import { SupportChat } from "@/components/SupportChat";
import { getDictionary, getLocale } from "@/i18n/server";
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

  return (
    <html
      lang={locale}
      data-scroll-behavior="smooth"
      className={`${outfit.variable} h-full`}
    >
      <body className={`${outfit.className} min-h-full antialiased`}>
        <Providers locale={locale}>
          {children}
          <SupportChat />
        </Providers>
      </body>
    </html>
  );
}
