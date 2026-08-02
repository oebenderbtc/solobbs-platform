import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

const TTL_MS = 10 * 60 * 1000;

function secret() {
  return (
    process.env.AUTH_SECRET ||
    process.env.WALLET_ENC_KEY ||
    "solobbs-dev-captcha"
  );
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export type CaptchaChallenge = {
  a: number;
  b: number;
  token: string;
  question: string;
};

/** Simple addition challenge: a + b = ? */
export function createMathCaptcha(): CaptchaChallenge {
  const a = 1 + Math.floor(Math.random() * 9);
  const b = 1 + Math.floor(Math.random() * 9);
  const exp = Date.now() + TTL_MS;
  const body = `${a}.${b}.${exp}`;
  const token = `${body}.${sign(body)}`;
  return {
    a,
    b,
    token,
    question: `${a} + ${b}`,
  };
}

export function verifyMathCaptcha(
  token: string | undefined | null,
  answer: string | number | undefined | null,
): { ok: true } | { ok: false; error: string } {
  if (!token || typeof token !== "string") {
    return { ok: false, error: "Completa el captcha" };
  }
  const parts = token.split(".");
  if (parts.length !== 4) {
    return { ok: false, error: "Captcha inválido" };
  }
  const [aStr, bStr, expStr, sig] = parts;
  const a = Number(aStr);
  const b = Number(bStr);
  const exp = Number(expStr);
  if (![a, b, exp].every((n) => Number.isFinite(n))) {
    return { ok: false, error: "Captcha inválido" };
  }
  if (Date.now() > exp) {
    return { ok: false, error: "Captcha expirado. Recarga e intenta de nuevo." };
  }
  const body = `${aStr}.${bStr}.${expStr}`;
  const expected = sign(body);
  try {
    const ok = timingSafeEqual(
      Buffer.from(expected, "utf8"),
      Buffer.from(sig, "utf8"),
    );
    if (!ok) return { ok: false, error: "Captcha inválido" };
  } catch {
    return { ok: false, error: "Captcha inválido" };
  }

  const n = typeof answer === "number" ? answer : Number(String(answer ?? "").trim());
  if (!Number.isFinite(n) || n !== a + b) {
    return { ok: false, error: "Respuesta del captcha incorrecta" };
  }
  return { ok: true };
}
