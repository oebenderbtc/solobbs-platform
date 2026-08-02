import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SiteHeader } from "@/components/SiteHeader";
import { StarRating } from "@/components/StarRating";
import { ModelsStoriesRail } from "@/components/ModelsStoriesRail";
import { PriceLabel } from "@/components/PriceLabel";
import { getDictionary } from "@/i18n/server";

export default async function ModelsDirectoryPage() {
  const dict = await getDictionary();
  const now = new Date();

  // Drop expired stories so the rail stays clean
  await prisma.story.deleteMany({ where: { expiresAt: { lt: now } } });

  const models = await prisma.user.findMany({
    where: {
      role: "MODEL",
      isActive: true,
      galleryPublic: true,
    },
    include: {
      galleryImages: {
        where: { isCover: true },
        take: 1,
      },
      stories: {
        where: { expiresAt: { gt: now } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ rating: "desc" }, { totalJobs: "desc" }],
  });

  const storyGroups = models
    .filter((m) => m.stories.length > 0)
    .map((m) => ({
      id: m.id,
      name: m.name,
      referralCode: m.referralCode,
      avatarUrl:
        m.avatarUrl || m.galleryImages[0]?.url || m.stories[0]?.url || null,
      stories: m.stories.map((s) => ({
        id: s.id,
        url: s.url,
        mediaType: s.mediaType,
        caption: s.caption,
        expiresAt: s.expiresAt.toISOString(),
        createdAt: s.createdAt.toISOString(),
      })),
    }));

  return (
    <div className="noise min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-28 sm:px-6">
        <ModelsStoriesRail
          groups={storyGroups}
          title={dict.gallery.storiesTitle}
        />

        <p className="text-[11px] uppercase tracking-[0.22em] text-blush">
          {dict.gallery.directoryEyebrow}
        </p>
        <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
          {dict.gallery.directoryTitle}
        </h1>
        <p className="mt-3 max-w-xl text-[15px] text-mist">
          {dict.gallery.directoryDesc}
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((m) => {
            const cover = m.galleryImages[0]?.url || m.avatarUrl || "/mark.svg";
            return (
              <Link
                key={m.id}
                href={`/m/${m.referralCode}`}
                className="surface group overflow-hidden rounded-[1.75rem] transition hover:border-champagne/30"
              >
                <div className="relative aspect-[4/5]">
                  <Image
                    src={cover}
                    alt={m.name}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width:768px) 100vw, 33vw"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h2 className="font-display text-2xl tracking-tight">
                      {m.name}
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-cream/85">
                      {m.city && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-champagne" />
                          {m.city}
                        </span>
                      )}
                      <StarRating value={m.rating} size="sm" />
                    </div>
                    {m.rateFrom ? (
                      <p className="mt-2 text-sm text-champagne">
                        <PriceLabel
                          amountUsdt={m.rateFrom}
                          prefix={dict.gallery.from}
                        />
                      </p>
                    ) : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {models.length === 0 && (
          <p className="mt-10 text-mist">{dict.gallery.noModels}</p>
        )}

        <footer className="mt-16 border-t border-line pt-6 text-center text-sm text-mist">
          <Link href="/terms" className="text-champagne hover:underline">
            {dict.landing.terms}
          </Link>
          <span className="mx-2">·</span>
          <span>{dict.landing.footer}</span>
        </footer>
      </main>
    </div>
  );
}
