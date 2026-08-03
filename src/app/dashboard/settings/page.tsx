"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, Loader2, UserRound } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CopyButton } from "@/components/ui/CopyButton";
import { Toast } from "@/components/ui/Toast";
import { useLocale } from "@/i18n/LocaleProvider";
import { useSession } from "next-auth/react";

type Profile = {
  name: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  whatsappNotify: boolean;
  city: string | null;
  bio: string | null;
  referralCode: string;
  isVerified: boolean;
  rating: number;
  role: string;
  avatarUrl: string | null;
};

export default function SettingsPage() {
  const { dict } = useLocale();
  const { data: session } = useSession();
  const [user, setUser] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const isModel = session?.user?.role === "MODEL";

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => setUser(d.user));
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: user.name,
        phone: user.phone || "",
        whatsapp: user.whatsapp || "",
        whatsappNotify: user.whatsappNotify,
        city: user.city || "",
        bio: user.bio || "",
      }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setUser((u) => (u ? { ...u, ...data.user } : u));
      setToastMsg(dict.settingsPage.saved);
      setToast(true);
      window.setTimeout(() => setToast(false), 2000);
    }
  }

  async function onAvatarSelected(file: File | null) {
    if (!file || !user) return;
    setUploading(true);
    const form = new FormData();
    form.set("avatar", file);
    const res = await fetch("/api/profile", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) {
      alert(data.error || "No se pudo subir la foto");
      return;
    }
    setUser((u) =>
      u ? { ...u, avatarUrl: data.user?.avatarUrl || u.avatarUrl } : u,
    );
    setToastMsg(dict.settingsPage.saved);
    setToast(true);
    window.setTimeout(() => setToast(false), 2000);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onRemoveAvatar() {
    if (!user?.avatarUrl) return;
    setUploading(true);
    const form = new FormData();
    form.set("action", "remove");
    const res = await fetch("/api/profile", { method: "POST", body: form });
    setUploading(false);
    if (!res.ok) return;
    setUser((u) => (u ? { ...u, avatarUrl: null } : u));
    setToastMsg(dict.settingsPage.saved);
    setToast(true);
    window.setTimeout(() => setToast(false), 2000);
  }

  if (!user) {
    return <p className="text-mist">{dict.common.loading}</p>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={dict.settingsPage.eyebrow}
        title={dict.settingsPage.title}
        description={
          isModel
            ? dict.settingsPage.modelDescription
            : dict.settingsPage.description
        }
      />

      <form onSubmit={onSave} className="surface max-w-2xl space-y-4 rounded-[1.75rem] p-5 sm:p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-line bg-ink/50">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound className="h-10 w-10 text-mist" />
              )}
            </div>
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-ink-soft text-champagne shadow-lg transition hover:bg-champagne/20 disabled:opacity-60"
              aria-label={dict.settingsPage.avatarChange}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
              className="hidden"
              onChange={(e) => onAvatarSelected(e.target.files?.[0] || null)}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-cream">{dict.settingsPage.avatar}</p>
            <p className="mt-1 text-xs text-mist">{dict.settingsPage.avatarHint}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="btn-ghost text-sm"
              >
                {uploading
                  ? dict.settingsPage.avatarUploading
                  : user.avatarUrl
                    ? dict.settingsPage.avatarChange
                    : dict.settingsPage.avatarUpload}
              </button>
              {user.avatarUrl && (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={onRemoveAvatar}
                  className="btn-ghost text-sm text-mist"
                >
                  {dict.settingsPage.avatarRemove}
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm text-mist">{dict.settingsPage.name}</label>
          <input
            className="input-field"
            value={user.name}
            onChange={(e) => setUser({ ...user, name: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-mist">{dict.settingsPage.email}</label>
          <input className="input-field opacity-70" value={user.email} disabled />
        </div>
        <div>
          <label className="mb-2 block text-sm text-mist">{dict.settingsPage.city}</label>
          <input
            className="input-field"
            value={user.city || ""}
            onChange={(e) => setUser({ ...user, city: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-mist">{dict.settingsPage.phone}</label>
          <input
            className="input-field"
            placeholder="+57 300..."
            value={user.phone || ""}
            onChange={(e) => setUser({ ...user, phone: e.target.value })}
          />
        </div>

        {isModel && (
          <>
            <div>
              <label className="mb-2 block text-sm text-mist">
                {dict.settingsPage.whatsapp}
              </label>
              <input
                className="input-field"
                placeholder="+57 300 123 4567"
                value={user.whatsapp || ""}
                onChange={(e) => setUser({ ...user, whatsapp: e.target.value })}
              />
              <p className="mt-2 text-xs text-mist">{dict.settingsPage.whatsappHint}</p>
            </div>
            <label className="flex items-center gap-3 text-sm text-cream">
              <input
                type="checkbox"
                checked={user.whatsappNotify}
                onChange={(e) =>
                  setUser({ ...user, whatsappNotify: e.target.checked })
                }
              />
              {dict.settingsPage.whatsappNotify}
            </label>
          </>
        )}

        {isModel && (
          <div>
            <label className="mb-2 block text-sm text-mist">Bio</label>
            <textarea
              className="input-field min-h-28"
              value={user.bio || ""}
              onChange={(e) => setUser({ ...user, bio: e.target.value })}
            />
          </div>
        )}

        <div className="flex items-center justify-between rounded-2xl bg-ink/40 px-4 py-3.5">
          <div>
            <span className="text-mist">{dict.settingsPage.referral}</span>
            <p className="mt-1 font-medium text-champagne">{user.referralCode}</p>
          </div>
          <CopyButton value={user.referralCode} />
        </div>

        <p className="text-sm text-mist">
          {user.isVerified ? dict.settingsPage.verified : dict.settingsPage.notVerified}
          {" · "}
          {dict.dashboard.rating} {user.rating.toFixed(1)}
        </p>

        <Link href="/dashboard/kyc" className="btn-ghost inline-flex">
          {dict.settingsPage.goKyc}
        </Link>

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? (
            <Loader2 className="mx-auto h-4 w-4 animate-spin" />
          ) : (
            dict.settingsPage.save
          )}
        </button>
      </form>

      <Toast open={toast} message={toastMsg || dict.settingsPage.saved} tone="success" />
    </div>
  );
}
