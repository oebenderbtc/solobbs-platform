import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/SiteHeader";
import { StarRating } from "@/components/StarRating";
import { ContactModelForm } from "@/components/ContactModelForm";
import { formatCOP } from "@/lib/utils";
import { getDictionary } from "@/i18n/server";

export default async function ModelPublicPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const dict = await getDictionary();

  const model = await prisma.user.findFirst({
    where: {
      referralCode: code.toUpperCase(),
      role: "MODEL",
      isActive: true,
      galleryPublic: true,
    },
    include: {
      galleryImages: {
        orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      },
      reviewsReceived: {
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true } }, job: { select: { title: true } } },
      },
      _count: { select: { jobsAsModel: true, reviewsReceived: true } },
    },
  });

  if (!model) notFound();

  const cover =
    model.galleryImages.find((i) => i.isCover)?.url ||
    model.avatarUrl ||
    "/mark.svg";

  return (
    <div className="noise min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-28 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-line sm:aspect-[5/4]">
              <Image
                src={cover}
                alt={model.name}
                fill
                className="object-cover"
                sizes="(max-width:1024px) 100vw, 60vw"
                priority
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                <p className="text-[11px] uppercase tracking-[0.22em] text-blush">
                  {dict.gallery.publicProfile}
                </p>
                <h1 className="mt-2 font-display text-4xl tracking-tight sm:text-5xl">
                  {model.name}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-cream/85">
                  {model.city && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-champagne" />
                      {model.city}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <StarRating value={model.rating} size="sm" />
                    {model.rating.toFixed(1)}
                  </span>
                  {model.isVerified && (
                    <span className="inline-flex items-center gap-1 text-champagne">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {dict.settingsPage.verified}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {model.galleryImages.length > 1 && (
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {model.galleryImages.map((img) => (
                  <div
                    key={img.id}
                    className="relative aspect-square overflow-hidden rounded-2xl border border-line"
                  >
                    <Image
                      src={img.url}
                      alt={img.caption || model.name}
                      fill
                      className="object-cover"
                      sizes="150px"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="surface rounded-[1.75rem] p-5 sm:p-6">
              <h2 className="font-display text-2xl tracking-tight">{dict.gallery.about}</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-mist">
                {model.bio || dict.gallery.noBio}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-ink/45 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-mist">
                    {dict.dashboard.jobs}
                  </p>
                  <p className="mt-1 text-xl text-cream">{model._count.jobsAsModel}</p>
                </div>
                <div className="rounded-2xl bg-ink/45 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-mist">
                    {dict.gallery.rateFrom}
                  </p>
                  <p className="mt-1 text-xl text-champagne">
                    {model.rateFrom ? formatCOP(model.rateFrom) : "—"}
                  </p>
                </div>
              </div>
            </div>

            <ContactModelForm
              modelCode={model.referralCode}
              modelName={model.name}
              defaultAmount={model.rateFrom}
            />

            {model.reviewsReceived.length > 0 && (
              <div className="surface rounded-[1.75rem] p-5 sm:p-6">
                <h2 className="font-display text-2xl tracking-tight">{dict.reviews.received}</h2>
                <div className="mt-4 space-y-3">
                  {model.reviewsReceived.map((r) => (
                    <div key={r.id} className="rounded-2xl bg-ink/45 px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{r.author.name}</p>
                        <StarRating value={r.rating} size="sm" />
                      </div>
                      <p className="mt-2 text-sm text-mist">
                        {r.comment || dict.reviews.noComment}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Link href="/models" className="inline-block text-sm text-champagne hover:underline">
              ← {dict.gallery.browseModels}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
