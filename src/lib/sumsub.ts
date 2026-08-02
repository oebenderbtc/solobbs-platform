import "server-only";
import crypto from "node:crypto";

const SUMSUB_BASE = (process.env.SUMSUB_BASE_URL || "https://api.sumsub.com").replace(
  /\/$/,
  "",
);

export type KycStatus =
  | "NONE"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "RESUBMISSION";

export function isSumsubConfigured() {
  return Boolean(
    process.env.SUMSUB_APP_TOKEN?.trim() && process.env.SUMSUB_SECRET_KEY?.trim(),
  );
}

/** Enforce gates only when Sumsub is configured (unless KYC_ENFORCE=false). */
export function isKycEnforced() {
  if (process.env.KYC_ENFORCE === "false") return false;
  return isSumsubConfigured();
}

export function sumsubLevelForRole(role: string) {
  if (role === "MODEL") {
    return (
      process.env.SUMSUB_LEVEL_MODEL?.trim() ||
      process.env.SUMSUB_LEVEL_NAME?.trim() ||
      "basic-kyc-level"
    );
  }
  return (
    process.env.SUMSUB_LEVEL_CLIENT?.trim() ||
    process.env.SUMSUB_LEVEL_NAME?.trim() ||
    "basic-kyc-level"
  );
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

function sign(ts: number, method: Method, path: string, body: string) {
  const secret = process.env.SUMSUB_SECRET_KEY || "";
  return crypto
    .createHmac("sha256", secret)
    .update(`${ts}${method}${path}${body}`)
    .digest("hex");
}

export async function sumsubRequest<T>(
  method: Method,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = process.env.SUMSUB_APP_TOKEN?.trim();
  if (!token) throw new Error("SUMSUB_APP_TOKEN no configurado");

  const ts = Math.floor(Date.now() / 1000);
  const payload = body === undefined ? "" : JSON.stringify(body);
  const signature = sign(ts, method, path, payload);

  const res = await fetch(`${SUMSUB_BASE}${path}`, {
    method,
    headers: {
      "X-App-Token": token,
      "X-App-Access-Ts": String(ts),
      "X-App-Access-Sig": signature,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: payload || undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sumsub ${method} ${path} → ${res.status}: ${text}`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function createSumsubAccessToken(opts: {
  userId: string;
  levelName: string;
  email?: string | null;
  phone?: string | null;
  ttlInSecs?: number;
}) {
  const body: Record<string, unknown> = {
    userId: opts.userId,
    levelName: opts.levelName,
    ttlInSecs: opts.ttlInSecs ?? 600,
  };
  if (opts.email || opts.phone) {
    body.applicantIdentifiers = {
      ...(opts.email ? { email: opts.email } : {}),
      ...(opts.phone ? { phone: opts.phone } : {}),
    };
  }
  return sumsubRequest<{ token: string; userId: string }>(
    "POST",
    "/resources/accessTokens/sdk",
    body,
  );
}

export function verifySumsubWebhookSignature(
  rawBody: string,
  digestHeader: string | null,
  algHeader: string | null,
) {
  const secret = process.env.SUMSUB_WEBHOOK_SECRET?.trim();
  if (!secret) {
    // If Sumsub is configured, never accept unsigned webhooks
    if (isSumsubConfigured()) return false;
    return process.env.NODE_ENV !== "production";
  }
  if (!digestHeader) return false;

  const algMap: Record<string, string> = {
    HMAC_SHA1_HEX: "sha1",
    HMAC_SHA256_HEX: "sha256",
    HMAC_SHA512_HEX: "sha512",
  };
  const alg = algMap[algHeader || "HMAC_SHA256_HEX"] || "sha256";
  const expected = crypto.createHmac(alg, secret).update(rawBody).digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "utf8"),
      Buffer.from(digestHeader, "utf8"),
    );
  } catch {
    return false;
  }
}

export function mapSumsubReviewToStatus(payload: {
  type?: string;
  reviewStatus?: string;
  reviewResult?: { reviewAnswer?: string; reviewRejectType?: string; rejectLabels?: string[] };
}): KycStatus {
  const type = payload.type || "";
  const answer = payload.reviewResult?.reviewAnswer?.toUpperCase();
  const reviewStatus = (payload.reviewStatus || "").toLowerCase();

  if (type === "applicantCreated" || type === "applicantPending") {
    return "PENDING";
  }
  if (type === "applicantOnHold") return "PENDING";

  if (answer === "GREEN") return "APPROVED";
  if (answer === "RED") {
    if (payload.reviewResult?.reviewRejectType === "RETRY") return "RESUBMISSION";
    return "REJECTED";
  }

  if (reviewStatus === "completed" && answer === "GREEN") return "APPROVED";
  if (reviewStatus === "pending" || reviewStatus === "init") return "PENDING";
  if (reviewStatus === "completed" && answer === "RED") return "REJECTED";

  return "PENDING";
}

/** Permalink in Sumsub dashboard (sandbox/prod share same host pattern). */
export function sumsubApplicantDashboardUrl(applicantId: string) {
  return `https://cockpit.sumsub.com/checkus#/applicant/${encodeURIComponent(applicantId)}`;
}
