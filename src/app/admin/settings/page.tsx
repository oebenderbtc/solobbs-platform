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
  platformNequi: string;
  platformBankName: string;
  platformBankAccount: string;
  platformAccountName: string;
};

export default function AdminSettingsPage() {
  const { dict } = useLocale();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings));
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!settings) return;
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
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
        <div>
          <label className="mb-2 block text-sm text-mist">{dict.admin.walletUsdt}</label>
          <input
            className="input-field"
            value={settings.cryptoWalletUsdt}
            onChange={(e) => setSettings({ ...settings, cryptoWalletUsdt: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-mist">{dict.admin.walletBtc}</label>
          <input
            className="input-field"
            value={settings.cryptoWalletBtc}
            onChange={(e) => setSettings({ ...settings, cryptoWalletBtc: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-mist">Nequi plataforma</label>
          <input
            className="input-field"
            value={settings.platformNequi}
            onChange={(e) => setSettings({ ...settings, platformNequi: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-mist">Titular cuenta</label>
          <input
            className="input-field"
            value={settings.platformAccountName}
            onChange={(e) =>
              setSettings({ ...settings, platformAccountName: e.target.value })
            }
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-mist">Banco</label>
          <input
            className="input-field"
            value={settings.platformBankName}
            onChange={(e) => setSettings({ ...settings, platformBankName: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-mist">Cuenta bancaria</label>
          <input
            className="input-field"
            value={settings.platformBankAccount}
            onChange={(e) =>
              setSettings({ ...settings, platformBankAccount: e.target.value })
            }
          />
        </div>
        <div className="flex items-center gap-4 pt-2">
          <button className="btn-primary">{dict.admin.saveSettings}</button>
        </div>
      </form>
      <Toast open={saved} message={dict.settingsPage.saved} tone="success" />
    </div>
  );
}
