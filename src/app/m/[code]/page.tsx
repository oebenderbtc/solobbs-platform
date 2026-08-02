"use client";

import { FormEvent, use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ChevronLeft,
  ChevronRight,
  Film,
  Loader2,
  MessageSquare,
  Send,
} from "lucide-react";
import { StoryRing, StoryViewer, type StoryItem } from "@/components/StoryViewer";
import { PriceLabel } from "@/components/PriceLabel";
import { CurrencySwitcher } from "@/components/CurrencySwitcher";
import { Toast, ToastTone } from "@/components/ui/Toast";
import { useLocale } from "@/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

type GalleryItem = {
  id: string;
  url: string;
  mediaType?: string;
  caption: string | null;
  isCover: boolean;
};

type Model = {
  id: string;
  name: string;
  referralCode: string;
  bio: string | null;
  rateFrom: number | null;
  avatarUrl: string | null;
  gallery: GalleryItem[];
};

export default function PublicModelPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();
  const { dict } = useLocale();
  const [model, setModel] = useState<Model | null>(null);
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [message, setMessage] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [bookAmount, setBookAmount] = useState("");
  const [bookNote, setBookNote] = useState("");
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<"message" | "book">("message");
  const [viewStories, setViewStories] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    tone: ToastTone;
  }>({ open: false, message: "", tone: "success" });

  const isClient = session?.user?.role === "CLIENT";
  const isGuest = !session?.user;
  const blockedAsNonClient =
    status === "authenticated" && session?.user && !isClient;
  const canContact = !blockedAsNonClient;

  function notify(msg: string, tone: ToastTone = "success") {
    setToast({ open: true, message: msg, tone });
    window.setTimeout(() => setToast((t) => ({ ...t, open: false })), 2200);
  }

  function requireClientAuth() {
    const callback = `/m/${model?.referralCode || code}`;
    notify(dict.gallery.loginToContact, "error");
    router.push(
      `/register?role=CLIENT&callbackUrl=${encodeURIComponent(callback)}`,
    );
  }

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/gallery?code=${encodeURIComponent(code)}`);
      if (!res.ok) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setModel(data.model);
      const gallery: GalleryItem[] = data.model?.gallery || [];
      const coverItem =
        gallery.find((g) => g.isCover && g.mediaType !== "VIDEO") ||
        gallery.find((g) => g.mediaType !== "VIDEO") ||
        gallery[0] ||
        null;
      setActiveId(coverItem?.id ?? null);
      if (data.model?.rateFrom) setBookAmount(String(data.model.rateFrom));
      const sRes = await fetch(
        `/api/stories?modelCode=${encodeURIComponent(code)}`,
      );
      if (sRes.ok) {
        const sData = await sRes.json();
        setStories(sData.stories || []);
      }
      setLoading(false);
    }
    load();
  }, [code]);

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    if (!model || !message.trim()) return;
    if (!session?.user) {
      requireClientAuth();
      return;
    }
    if (!isClient) {
      notify(dict.gallery.clientsOnly, "error");
      return;
    }
    setSending(true);
    const res = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modelId: model.id,
        modelCode: model.referralCode || code,
        body: message.trim(),
      }),
    });
    setSending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      notify(data.error || dict.gallery.contactError, "error");
      return;
    }
    setMessage("");
    notify(dict.gallery.messageSent);
  }

  async function sendBooking(e: FormEvent) {
    e.preventDefault();
    if (!model) return;
    if (!session?.user) {
      requireClientAuth();
      return;
    }
    if (!isClient) {
      notify(dict.gallery.clientsOnly, "error");
      return;
    }
    setSending(true);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modelCode: model.referralCode || code,
        title: bookTitle,
        amount: Number(bookAmount),
        paymentMethod: "CRYPTO",
        notes: bookNote || undefined,
      }),
    });
    setSending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      notify(data.error || dict.gallery.bookError, "error");
      return;
    }
    setBookTitle("");
    setBookNote("");
    notify(dict.gallery.bookSent);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink text-mist">
        {dict.common.loading}
      </div>
    );
  }

  if (notFound || !model) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink px-4 text-center">
        <p className="font-display text-3xl text-cream">404</p>
        <p className="text-mist">{dict.gallery.noModels}</p>
        <Link href="/models" className="btn-primary">
          {dict.gallery.browseModels}
        </Link>
      </div>
    );
  }

  const gallery = model.gallery;
  const cover =
    gallery.find((g) => g.isCover && g.mediaType !== "VIDEO") ||
    gallery.find((g) => g.mediaType !== "VIDEO") ||
    gallery[0] ||
    null;

  const active =
    (activeId ? gallery.find((g) => g.id === activeId) : null) ||
    cover ||
    gallery[0] ||
    null;

  const activeIndex = active
    ? Math.max(0, gallery.findIndex((g) => g.id === active.id))
    : 0;

  function goGallery(delta: number) {
    if (gallery.length < 2) return;
    const next = (activeIndex + delta + gallery.length) % gallery.length;
    setActiveId(gallery[next].id);
  }

  return (
    <div className="min-h-screen bg-ink text-cream">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(212,175,106,0.12),_transparent_55%)]" />
      <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="font-display text-2xl tracking-[0.14em]">
            Solo<span className="text-champagne">BBs</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <CurrencySwitcher />
            <Link href="/models" className="text-sm text-mist hover:text-cream">
              {dict.gallery.browseModels}
            </Link>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div
              className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-line bg-panel"
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  goGallery(-1);
                }
                if (e.key === "ArrowRight") {
                  e.preventDefault();
                  goGallery(1);
                }
              }}
              tabIndex={gallery.length > 1 ? 0 : undefined}
              role="region"
              aria-label={dict.gallery.title}
            >
              {active ? (
                active.mediaType === "VIDEO" ? (
                  <video
                    key={active.id}
                    src={active.url}
                    className="h-full w-full object-cover"
                    controls
                    playsInline
                    autoPlay
                  />
                ) : (
                  <Image
                    key={active.id}
                    src={active.url}
                    alt={active.caption || model.name}
                    fill
                    className="object-cover"
                    unoptimized
                    priority
                  />
                )
              ) : (
                <div className="flex h-full items-center justify-center text-mist">
                  {dict.gallery.emptyTitle}
                </div>
              )}

              {gallery.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => goGallery(-1)}
                    className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-line bg-ink/70 p-2 text-cream backdrop-blur transition hover:bg-ink/90"
                    aria-label={dict.common.prev}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goGallery(1)}
                    className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-line bg-ink/70 p-2 text-cream backdrop-blur transition hover:bg-ink/90"
                    aria-label={dict.common.next}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-ink/70 px-3 py-1 font-mono text-xs text-cream backdrop-blur">
                    {activeIndex + 1} / {gallery.length}
                  </div>
                </>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {gallery.map((img) => {
                  const selected = img.id === active?.id;
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setActiveId(img.id)}
                      aria-label={img.caption || model.name}
                      aria-pressed={selected}
                      className={cn(
                        "relative aspect-square overflow-hidden rounded-xl border transition",
                        selected
                          ? "border-champagne ring-2 ring-champagne/50"
                          : "border-line hover:border-champagne/50",
                      )}
                    >
                      {img.mediaType === "VIDEO" ? (
                        <>
                          <video
                            src={img.url}
                            className="h-full w-full object-cover"
                            muted
                            playsInline
                            preload="metadata"
                          />
                          <span className="pointer-events-none absolute left-1 top-1 rounded bg-black/60 p-0.5">
                            <Film className="h-3 w-3 text-cream" />
                          </span>
                        </>
                      ) : (
                        <Image
                          src={img.url}
                          alt={img.caption || model.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <StoryRing
                hasStories={stories.length > 0}
                avatarUrl={model.avatarUrl || cover?.url}
                name={model.name}
                size="lg"
                onClick={() => stories.length > 0 && setViewStories(true)}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-[0.2em] text-champagne">
                  {dict.gallery.publicProfile}
                </p>
                <h1 className="mt-1 truncate font-display text-3xl tracking-tight sm:text-4xl">
                  {model.name}
                </h1>
                <p className="mt-1 font-mono text-sm text-mist">
                  {model.referralCode}
                  {stories.length > 0 ? (
                    <span className="text-mist/70">
                      {" "}
                      · {stories.length} {dict.gallery.storiesTitle.toLowerCase()}
                    </span>
                  ) : null}
                </p>
                {model.rateFrom != null && (
                  <p className="mt-2 text-base text-champagne sm:text-lg">
                    <PriceLabel
                      amountUsdt={model.rateFrom}
                      prefix={dict.gallery.from}
                    />
                  </p>
                )}
              </div>
            </div>

            <div className="surface rounded-2xl p-5">
              <h2 className="font-display text-xl">{dict.gallery.about}</h2>
              <p className="mt-2 text-sm leading-relaxed text-mist">
                {model.bio || dict.gallery.noBio}
              </p>
            </div>

            {!canContact ? (
              <div className="surface rounded-2xl p-5 text-sm text-mist">
                {dict.gallery.clientsOnly}
              </div>
            ) : (
              <div className="surface rounded-2xl p-5">
                <div className="mb-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTab("message")}
                    className={`rounded-full px-3 py-1.5 text-xs ${
                      tab === "message"
                        ? "bg-champagne/20 text-champagne"
                        : "text-mist"
                    }`}
                  >
                    <MessageSquare className="mr-1 inline h-3.5 w-3.5" />
                    {dict.gallery.tabMessage}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("book")}
                    className={`rounded-full px-3 py-1.5 text-xs ${
                      tab === "book"
                        ? "bg-champagne/20 text-champagne"
                        : "text-mist"
                    }`}
                  >
                    {dict.gallery.tabBook}
                  </button>
                </div>

                {tab === "message" ? (
                  <form onSubmit={sendMessage} className="space-y-3">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      required
                      className="input-field min-h-[100px] resize-y"
                      placeholder={dict.gallery.messagePlaceholder}
                    />
                    <button
                      disabled={sending}
                      className="btn-primary w-full !py-3"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-4 w-4" /> {dict.gallery.sendMessage}
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={sendBooking} className="space-y-3">
                    <input
                      value={bookTitle}
                      onChange={(e) => setBookTitle(e.target.value)}
                      required
                      className="input-field"
                      placeholder={dict.gallery.bookTitle}
                    />
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={bookAmount}
                      onChange={(e) => setBookAmount(e.target.value)}
                      required
                      className="input-field"
                      placeholder="USDT"
                    />
                    <textarea
                      value={bookNote}
                      onChange={(e) => setBookNote(e.target.value)}
                      rows={2}
                      className="input-field resize-y"
                      placeholder="Nota (opcional)"
                    />
                    <button
                      disabled={sending}
                      className="btn-primary w-full !py-3"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        dict.gallery.requestBook
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {viewStories && stories.length > 0 && (
        <StoryViewer
          stories={stories}
          modelName={model.name}
          onClose={() => setViewStories(false)}
        />
      )}

      <Toast open={toast.open} message={toast.message} tone={toast.tone} />
    </div>
  );
}
