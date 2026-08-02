/**
 * Avisos WhatsApp a modelos cuando un cliente escribe.
 *
 * Proveedores (env WHATSAPP_PROVIDER):
 * - log (default): solo registra en consola / útil en demo
 * - meta: WhatsApp Cloud API (Meta)
 * - callmebot: CallMeBot (demo personal, requiere apikey por número)
 */

export type WhatsAppPayload = {
  to: string;
  text: string;
};

function digitsOnly(phone: string) {
  return phone.replace(/\D/g, "");
}

export function normalizeWhatsApp(phone: string) {
  const d = digitsOnly(phone);
  if (!d) return null;
  // Si viene 10 dígitos CO, anteponer 57
  if (d.length === 10 && d.startsWith("3")) return `57${d}`;
  return d;
}

export async function sendWhatsApp({ to, text }: WhatsAppPayload) {
  const destination = normalizeWhatsApp(to);
  if (!destination) {
    return { ok: false as const, skipped: true, reason: "invalid_phone" };
  }

  const provider = (process.env.WHATSAPP_PROVIDER || "log").toLowerCase();

  if (provider === "log" || process.env.WHATSAPP_ENABLED === "false") {
    console.log(`[whatsapp:${provider}] → +${destination}: ${text}`);
    return { ok: true as const, provider: "log", to: destination, demo: true };
  }

  if (provider === "callmebot") {
    const apikey = process.env.CALLMEBOT_APIKEY;
    if (!apikey) {
      console.warn("[whatsapp] CALLMEBOT_APIKEY missing");
      return { ok: false as const, reason: "missing_apikey" };
    }
    const url = new URL("https://api.callmebot.com/whatsapp.php");
    url.searchParams.set("phone", destination);
    url.searchParams.set("text", text);
    url.searchParams.set("apikey", apikey);
    const res = await fetch(url.toString());
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[whatsapp:callmebot]", res.status, body);
      return { ok: false as const, reason: "api_error", status: res.status };
    }
    return { ok: true as const, provider: "callmebot", to: destination };
  }

  // Meta WhatsApp Cloud API
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    console.warn("[whatsapp] WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID missing — fallback log");
    console.log(`[whatsapp:log] → +${destination}: ${text}`);
    return { ok: true as const, provider: "log", to: destination, demo: true };
  }

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: destination,
        type: "text",
        text: { preview_url: false, body: text },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[whatsapp:meta]", res.status, body);
    return { ok: false as const, reason: "api_error", status: res.status, body };
  }

  return { ok: true as const, provider: "meta", to: destination };
}

export async function notifyModelWhatsApp(opts: {
  modelWhatsapp: string | null | undefined;
  enabled?: boolean | null;
  clientName: string;
  preview: string;
  appUrl?: string;
}) {
  if (opts.enabled === false) {
    return { ok: false as const, skipped: true, reason: "disabled" };
  }
  if (!opts.modelWhatsapp) {
    return { ok: false as const, skipped: true, reason: "no_whatsapp" };
  }

  const base = opts.appUrl || process.env.AUTH_URL || "http://localhost:3000";
  const text =
    `SoloBBs · Nuevo cliente\n` +
    `${opts.clientName} te escribió:\n` +
    `"${opts.preview.slice(0, 160)}"\n\n` +
    `Responde en: ${base}/dashboard/messages`;

  return sendWhatsApp({ to: opts.modelWhatsapp, text });
}
