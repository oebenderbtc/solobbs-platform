"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { useLocale } from "@/i18n/LocaleProvider";

const SumsubWebSdk = dynamic(() => import("@sumsub/websdk-react"), {
  ssr: false,
  loading: () => <p className="p-4 text-sm text-mist">…</p>,
});

type KycInfo = {
  kycStatus: string;
  kycLevel: string | null;
  kycReviewedAt: string | null;
  kycRejectLabels: string;
  isVerified: boolean;
  role: string;
};

export default function KycPage() {
  const { dict, locale } = useLocale();
  const [info, setInfo] = useState<KycInfo | null>(null);
  const [configured, setConfigured] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loadingToken, setLoadingToken] = useState(false);

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/kyc/status");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || dict.common.error);
      return;
    }
    setConfigured(Boolean(data.configured));
    setInfo(data.kyc);
  }, [dict.common.error]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const fetchToken = useCallback(async () => {
    setLoadingToken(true);
    setError("");
    const res = await fetch("/api/kyc/access-token", { method: "POST" });
    const data = await res.json();
    setLoadingToken(false);
    if (!res.ok) {
      setError(data.error || dict.kyc.tokenError);
      setToken(null);
      return null;
    }
    setToken(data.token);
    await loadStatus();
    return data.token as string;
  }, [dict.kyc.tokenError, loadStatus]);

  async function startOrResume() {
    await fetchToken();
  }

  const expirationHandler = useCallback(async () => {
    const res = await fetch("/api/kyc/access-token", { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "token");
    return data.token as string;
  }, []);

  const statusLabel =
    info?.kycStatus === "APPROVED"
      ? dict.kyc.statusApproved
      : info?.kycStatus === "PENDING"
        ? dict.kyc.statusPending
        : info?.kycStatus === "REJECTED"
          ? dict.kyc.statusRejected
          : info?.kycStatus === "RESUBMISSION"
            ? dict.kyc.statusResubmit
            : dict.kyc.statusNone;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={dict.kyc.eyebrow}
        title={dict.kyc.title}
        description={
          info?.role === "MODEL" ? dict.kyc.descModel : dict.kyc.descClient
        }
      />

      <div className="surface max-w-3xl space-y-4 rounded-[1.75rem] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-mist">{dict.kyc.currentStatus}</p>
            <p className="mt-1 text-lg font-medium text-cream">{statusLabel}</p>
            {info?.kycRejectLabels ? (
              <p className="mt-2 text-xs text-rose-300">{info.kycRejectLabels}</p>
            ) : null}
          </div>
          {info?.kycStatus === "APPROVED" ? (
            <Link href="/dashboard" className="btn-primary">
              {dict.kyc.goPanel}
            </Link>
          ) : (
            <button
              type="button"
              className="btn-primary"
              disabled={loadingToken || !configured}
              onClick={() => void startOrResume()}
            >
              {loadingToken ? dict.common.loading : dict.kyc.start}
            </button>
          )}
        </div>

        {!configured ? (
          <p className="rounded-2xl bg-ink/50 px-4 py-3 text-sm text-mist">
            {dict.kyc.notConfigured}
          </p>
        ) : null}

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        {token && info?.kycStatus !== "APPROVED" ? (
          <div className="overflow-hidden rounded-2xl bg-ink/30 p-2">
            <SumsubWebSdk
              accessToken={token}
              expirationHandler={expirationHandler}
              config={{
                lang: locale === "en" ? "en" : "es",
                theme: "dark",
              }}
              options={{ addViewportTag: false, adaptIframeHeight: true }}
              onMessage={(type: string) => {
                if (
                  type === "idCheck.onApplicantStatusChanged" ||
                  type === "idCheck.onApplicantSubmitted"
                ) {
                  void loadStatus();
                }
              }}
              onError={() => setError(dict.kyc.sdkError)}
            />
          </div>
        ) : null}

        <p className="text-xs text-mist">{dict.kyc.privacyNote}</p>
      </div>
    </div>
  );
}
