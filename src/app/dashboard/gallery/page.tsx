"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { CopyButton } from "@/components/ui/CopyButton";
import { Toast, ToastTone } from "@/components/ui/Toast";
import { formatCOP } from "@/lib/utils";
import { useLocale } from "@/i18n/LocaleProvider";

type GalleryImage = {
  id: string;
  url: string;
  caption: string | null;
  isCover: boolean;
};

type Profile = {
  galleryPublic: boolean;
  rateFrom: number | null;
  bio: string | null;
  referralCode: string;
};

export default function GalleryPage() {
  const { dict } = useLocale();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [bio, setBio] = useState("");
  const [rateFrom, setRateFrom] = useState("");
  const [toast, setToast] = useState<{ open: boolean; message: string; tone: ToastTone }>({
    open: false,
    message: "",
    tone: "success",
  });

  function notify(message: string, tone: ToastTone = "success") {
    setToast({ open: true, message, tone });
    window.setTimeout(() => setToast((t) => ({ ...t, open: false })), 2000);
  }

  async function load() {
    const res = await fetch("/api/gallery");
    const data = await res.json();
    setImages(data.images || []);
    setProfile(data.profile || null);
    setBio(data.profile?.bio || "");
    setRateFrom(data.profile?.rateFrom ? String(data.profile.rateFrom) : "");
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function onUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setUploading(true);
    const res = await fetch("/api/gallery", { method: "POST", body: fd });
    setUploading(false);
    if (!res.ok) {
      const data = await res.json();
      notify(data.error || dict.gallery.uploadError, "error");
      return;
    }
    form.reset();
    notify(dict.gallery.uploaded);
    load();
  }

  async function setCover(id: string) {
    await fetch("/api/gallery", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isCover: true }),
    });
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/gallery?id=${id}`, { method: "DELETE" });
    notify(dict.gallery.deleted);
    load();
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/gallery", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bio,
        rateFrom: rateFrom ? Number(rateFrom) : null,
        galleryPublic: profile?.galleryPublic ?? true,
      }),
    });
    if (res.ok) {
      notify(dict.settingsPage.saved);
      load();
    }
  }

  async function togglePublic() {
    if (!profile) return;
    await fetch("/api/gallery", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ galleryPublic: !profile.galleryPublic }),
    });
    load();
  }

  const publicUrl = profile ? `/m/${profile.referralCode}` : "";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={dict.gallery.eyebrow}
        title={dict.gallery.title}
        description={dict.gallery.description}
        action={
          publicUrl ? (
            <div className="flex items-center gap-2">
              <Link href={publicUrl} className="btn-ghost !px-3 !py-2 text-sm">
                {dict.gallery.viewPublic}
              </Link>
              <CopyButton value={publicUrl} label={dict.gallery.copyLink} />
            </div>
          ) : undefined
        }
      />

      {loading ? (
        <p className="text-mist">{dict.common.loading}</p>
      ) : (
        <>
          <form
            onSubmit={saveProfile}
            className="surface grid gap-4 rounded-[1.75rem] p-5 sm:p-6 md:grid-cols-2"
          >
            <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl tracking-tight">{dict.gallery.profile}</h2>
                <p className="text-sm text-mist">{dict.gallery.profileHint}</p>
              </div>
              <button
                type="button"
                onClick={togglePublic}
                className="rounded-full border border-line px-3 py-1.5 text-xs text-mist hover:text-cream"
              >
                {profile?.galleryPublic ? dict.gallery.publicOn : dict.gallery.publicOff}
              </button>
            </div>
            <label className="md:col-span-2 block">
              <span className="mb-2 block text-sm text-mist">Bio</span>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={500}
                className="input-field min-h-[90px] resize-y"
                placeholder={dict.gallery.bioPlaceholder}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-mist">{dict.gallery.rateFrom}</span>
              <input
                type="number"
                min={0}
                step={50000}
                value={rateFrom}
                onChange={(e) => setRateFrom(e.target.value)}
                className="input-field"
                placeholder="650000"
              />
            </label>
            <div className="flex items-end">
              <button className="btn-primary !px-4 !py-2.5 text-sm">{dict.common.save}</button>
            </div>
          </form>

          <form
            onSubmit={onUpload}
            className="surface flex flex-wrap items-end gap-3 rounded-[1.75rem] p-5 sm:p-6"
          >
            <label className="block min-w-[220px] flex-1">
              <span className="mb-2 block text-sm text-mist">{dict.gallery.addPhoto}</span>
              <input
                name="file"
                type="file"
                accept="image/*"
                required
                className="input-field file:mr-3 file:rounded-lg file:border-0 file:bg-champagne/20 file:px-3 file:py-1.5 file:text-champagne"
              />
            </label>
            <label className="block min-w-[180px] flex-1">
              <span className="mb-2 block text-sm text-mist">{dict.gallery.caption}</span>
              <input name="caption" className="input-field" placeholder="Opcional" />
            </label>
            <button disabled={uploading} className="btn-primary !px-4 !py-2.5 text-sm">
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {dict.common.loading}
                </>
              ) : (
                <>
                  <ImagePlus className="h-4 w-4" /> {dict.gallery.upload}
                </>
              )}
            </button>
          </form>

          {images.length === 0 ? (
            <EmptyState
              icon={ImagePlus}
              title={dict.gallery.emptyTitle}
              description={dict.gallery.emptyBody}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((img) => (
                <div key={img.id} className="surface overflow-hidden rounded-[1.5rem]">
                  <div className="relative aspect-[4/5]">
                    <Image
                      src={img.url}
                      alt={img.caption || "Gallery"}
                      fill
                      className="object-cover"
                      sizes="(max-width:768px) 100vw, 33vw"
                      unoptimized
                    />
                    {img.isCover && (
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] text-champagne">
                        <Star className="h-3 w-3 fill-champagne" /> {dict.gallery.cover}
                      </span>
                    )}
                  </div>
                  <div className="space-y-3 p-4">
                    <p className="text-sm text-mist">{img.caption || dict.reviews.noComment}</p>
                    <div className="flex flex-wrap gap-2">
                      {!img.isCover && (
                        <button
                          type="button"
                          onClick={() => setCover(img.id)}
                          className="btn-ghost !px-3 !py-1.5 text-xs"
                        >
                          {dict.gallery.setCover}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(img.id)}
                        className="btn-ghost !px-3 !py-1.5 text-xs text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> {dict.common.cancel}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {profile?.rateFrom ? (
            <p className="text-sm text-mist">
              {dict.gallery.rateFrom}:{" "}
              <span className="text-champagne">{formatCOP(profile.rateFrom)}</span>
            </p>
          ) : null}
        </>
      )}

      <Toast open={toast.open} message={toast.message} tone={toast.tone} />
    </div>
  );
}
