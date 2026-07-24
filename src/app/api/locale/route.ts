import { NextResponse } from "next/server";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const locale = typeof body.locale === "string" ? body.locale : "";
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true, locale });
  res.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return res;
}
