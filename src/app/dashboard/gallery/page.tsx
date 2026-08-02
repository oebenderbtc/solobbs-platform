"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ImagePlus, Loader2, Star, Trash2, Film } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { CopyButton } from "@/components/ui/CopyButton";
import { Toast, ToastTone } from "@/components/ui/Toast";
import { StoryViewer, type StoryItem } from "@/components/StoryViewer";
import { formatDate } from "@/lib/utils";
import { useLocale } from "@/i18n/LocaleProvider";

type GalleryItem = {
  id: string;
  url: string;
  mediaType?: string;
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
  const [images, setImages] = useState<GalleryItem[]>([]);
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [storyUploading, setStoryUploading] = useState(false);
  const [bio, setBio] = useState("");
  const [rateFrom, setRateFrom] = useState("");
  const [viewStories, setViewStories] = useState(false);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    tone: ToastTone;
  }>({ open: false, message: "", tone: "success" });

  function notify(message: string, tone: ToastTone = "success") {
    setToast({ open: true, message, tone });
    window.setTimeout(() => setToast((t) => ({ ...t, open: false })), 2000);
  }

  async function load() {
    const [gRes, sRes] = await Promise.all([
      fetch("/api/gallery"),
      fetch("/api/stories"),
    ]);
    const g = await gRes.json();
    const s = await sRes.json();
    setImages(g.images || []);
    setProfile(g.profile || null);
    setBio(g.profile?.bio || "");
    setRateFrom(g.profile?.rateFrom ? String(g.profile.rateFrom) : "");
    setStories(s.stories || []);
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

  async function onStoryUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setStoryUploading(true);
    const res = await fetch("/api/stories", { method: "POST", body: fd });
    setStoryUploading(false);
    if (!res.ok) {
      const data = await res.json();
      notify(data.error || dict.gallery.uploadError, "error");
      return;
    }
    form.reset();
    notify(dict.gallery.storyUploaded);
    load();
  }

  async function setCover(id: string) {
    const res = await fetch("/api/gallery", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isCover: true }),
    });
    if (!res.ok) {
      const data = await res.json();
      notify(data.error || dict.gallery.uploadError, "error");
      return;
    }
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/gallery?id=${id}`, { method: "DELETE" });
    notify(dict.gallery.deleted);
    load();
  }

  async function removeStory(id: string) {
    await fetch(`/api/stories?id=${id}`, { method: "DELETE" });
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
            <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2">
              <div>
                <h2 className="font-display text-2xl tracking-tight">
                  {dict.gallery.profile}
                </h2>
                <p className="text-sm text-mist">{dict.gallery.profileHint}</p>
              </div>
              <button
                type="button"
                onClick={togglePublic}
                className="rounded-full border border-line px-3 py-1.5 text-xs text-mist hover:text-cream"
              >
                {profile?.galleryPublic
                  ? dict.gallery.publicOn
                  : dict.gallery.publicOff}
              </button>
            </div>
            <label className="block md:col-span-2">
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
              <span className="mb-2 block text-sm text-mist">
                {dict.gallery.rateFrom}
              </span>
              <input
                type="number"
                min={0}
                step={10}
                value={rateFrom}
                onChange={(e) => setRateFrom(e.target.value)}
                className="input-field"
                placeholder="150"
              />
            </label>
            <div className="flex items-end">
              <button className="btn-primary !px-4 !py-2.5 text-sm">
                {dict.common.save}
              </button>
            </div>
          </form>

          {/* Stories */}
          <section className="surface space-y-4 rounded-[1.75rem] p-5 sm:p-6">
            <div>
              <h2 className="font-display text-2xl tracking-tight">
                {dict.gallery.storiesTitle}
              </h2>
              <p className="text-sm text-mist">{dict.gallery.storiesHint}</p>
            </div>
            <form
              onSubmit={onStoryUpload}
              className="flex flex-wrap items-end gap-3"
            >
              <label className="block min-w-[200px] flex-1">
                <span className="mb-2 block text-sm text-mist">
                  {dict.gallery.addStory}
                </span>
                <input
                  name="file"
                  type="file"
                  accept="image/*,video/mp4,video/webm"
                  required
                  className="input-field file:mr-3 file:rounded-lg file:border-0 file:bg-champagne/20 file:px-3 file:py-1.5 file:text-champagne"
                />
              </label>
              <label className="block min-w-[160px] flex-1">
                <span className="mb-2 block text-sm text-mist">
                  {dict.gallery.caption}
                </span>
                <input name="caption" className="input-field" />
              </label>
              <button
                disabled={storyUploading}
                className="btn-primary !px-4 !py-2.5 text-sm"
              >
                {storyUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  dict.gallery.upload
                )}
              </button>
            </form>

            {stories.length === 0 ? (
              <p className="text-sm text-mist">{dict.gallery.storyEmpty}</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {stories.map((s) => (
                  <div
                    key={s.id}
                    className="relative w-28 overflow-hidden rounded-2xl border border-line bg-ink/50"
                  >
                    <button
                      type="button"
                      className="block aspect-[9/16] w-full"
                      onClick={() => setViewStories(true)}
                    >
                      {s.mediaType === "VIDEO" ? (
                        <video
                          src={s.url}
                          className="h-full w-full object-cover"
                          muted
                        />
                      ) : (
                        <Image
                          src={s.url}
                          alt=""
                          width={112}
                          height={200}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStory(s.id)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-cream"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    {s.expiresAt && (
                      <p className="px-1.5 py-1 text-[10px] text-mist">
                        {dict.gallery.storyExpires} {formatDate(s.expiresAt)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Gallery media */}
          <form
            onSubmit={onUpload}
            className="surface flex flex-wrap items-end gap-3 rounded-[1.75rem] p-5 sm:p-6"
          >
            <label className="block min-w-[220px] flex-1">
              <span className="mb-2 block text-sm text-mist">
                {dict.gallery.addPhoto}
              </span>
              <input
                name="file"
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime"
                required
                className="input-field file:mr-3 file:rounded-lg file:border-0 file:bg-champagne/20 file:px-3 file:py-1.5 file:text-champagne"
              />
            </label>
            <label className="block min-w-[180px] flex-1">
              <span className="mb-2 block text-sm text-mist">
                {dict.gallery.caption}
              </span>
              <input name="caption" className="input-field" />
            </label>
            <button
              disabled={uploading}
              className="btn-primary !px-4 !py-2.5 text-sm"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="surface relative overflow-hidden rounded-2xl"
                >
                  <div className="relative aspect-square bg-ink/60">
                    {img.mediaType === "VIDEO" ? (
                      <video
                        src={img.url}
                        className="h-full w-full object-cover"
                        controls
                        playsInline
                      />
                    ) : (
                      <Image
                        src={img.url}
                        alt={img.caption || ""}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    )}
                    {img.mediaType === "VIDEO" && (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-cream">
                        <Film className="h-3 w-3" /> {dict.gallery.videoBadge}
                      </span>
                    )}
                    {img.isCover && (
                      <span className="absolute right-2 top-2 rounded-full bg-champagne/90 px-2 py-0.5 text-[10px] text-ink">
                        {dict.gallery.cover}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 p-3">
                    <p className="line-clamp-1 text-xs text-mist">
                      {img.caption || "—"}
                    </p>
                    <div className="flex gap-1">
                      {img.mediaType !== "VIDEO" && !img.isCover && (
                        <button
                          type="button"
                          onClick={() => setCover(img.id)}
                          className="rounded-lg p-1.5 text-mist hover:text-champagne"
                          title={dict.gallery.setCover}
                        >
                          <Star className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(img.id)}
                        className="rounded-lg p-1.5 text-mist hover:text-rose-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {viewStories && stories.length > 0 && (
        <StoryViewer
          stories={[...stories].reverse()}
          modelName={dict.gallery.storiesTitle}
          onClose={() => setViewStories(false)}
        />
      )}

      <Toast open={toast.open} message={toast.message} tone={toast.tone} />
    </div>
  );
}
