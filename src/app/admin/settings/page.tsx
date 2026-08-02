"use client";

import { FormEvent, useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Toast } from "@/components/ui/Toast";
import { useLocale } from "@/i18n/LocaleProvider";

type Settings = {
  platformFeePercent: number;
  referralL1Percent: number;
  referralL2Percent: number;
  referralL3Percent: number;
  minEscrowAmount: number;
  cryptoWalletBtc: string;
  cryptoWalletUsdt: string;
  companyFeeWallet: string;
  gasWalletAddress: string;
  gasWalletKeyConfigured: boolean;
  platformNequi: string;
  platformBankName: string;
  platformBankAccount: string;
  platformAccountName: string;
};

export default function AdminSettingsPage() {
  const { dict } = useLocale();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [gasWalletPrivateKey, setGasWalletPrivateKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings));
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!settings) return;
    setError("");
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...settings,
        gasWalletPrivateKey: gasWalletPrivateKey.trim() || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || dict.common.error);
      return;
    }
    setSettings(data.settings);
    setGasWalletPrivateKey("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!settings) {
    return <p className="text-mist">{dict.common.loading}</p>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={dict.admin.overviewEyebrow}
        title={dict.admin.settingsTitle}
        description={dict.admin.settingsDesc}
      />

      <form onSubmit={onSubmit} className="surface max-w-2xl space-y-4 rounded-[1.75rem] p-5 sm:p-6">
        {(
          [
            ["platformFeePercent", dict.admin.fee],
            ["referralL1Percent", dict.admin.l1],
            ["referralL2Percent", dict.admin.l2],
            ["referralL3Percent", dict.admin.l3],
            ["minEscrowAmount", dict.admin.minEscrow],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label className="mb-2 block text-sm text-mist">{label}</label>
            <input
              type="number"
              className="input-field"
              value={settings[key]}
              onChange={(e) =>
                setSettings({ ...settings, [key]: Number(e.target.value) })
              }
            />
          </div>
        ))}

        <div className="border-t border-white/10 pt-4">
          <p className="mb-3 text-sm font-medium text-cream">{dict.admin.companyWalletsTitle}</p>
          <p className="mb-4 text-xs text-mist">{dict.admin.companyWalletsHint}</p>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-mist">{dict.admin.companyFeeWallet}</label>
              <input
                className="input-field font-mono text-sm"
                placeholder="T…"
                value={settings.companyFeeWallet}
                onChange={(e) =>
                  setSettings({ ...settings, companyFeeWallet: e.target.value })
                }
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-mist">{dict.admin.gasWalletAddress}</label>
              <input
                className="input-field font-mono text-sm"
                placeholder="T…"
                value={settings.gasWalletAddress}
                onChange={(e) =>
                  setSettings({ ...settings, gasWalletAddress: e.target.value })
                }
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-mist">{dict.admin.gasWalletKey}</label>
              <input
                type="password"
                autoComplete="off"
                className="input-field font-mono text-sm"
                placeholder={
                  settings.gasWalletKeyConfigured
                    ? dict.admin.gasWalletKeyConfigured
                    : dict.admin.gasWalletKeyPlaceholder
                }
                value={gasWalletPrivateKey}
                onChange={(e) => setGasWalletPrivateKey(e.target.value)}
              />
              <p className="mt-1.5 text-xs text-mist">{dict.admin.gasWalletKeyHint}</p>
            </div>
          </div>
        </div>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <div className="flex items-center gap-4 pt-2">
          <button className="btn-primary">{dict.admin.saveSettings}</button>
        </div>
      </form>
      <Toast open={saved} message={dict.settingsPage.saved} tone="success" />
    </div>
  );
}
