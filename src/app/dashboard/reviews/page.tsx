import { Star } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StarRating } from "@/components/StarRating";
import { formatDate } from "@/lib/utils";
import { getDictionary } from "@/i18n/server";
import Link from "next/link";

export default async function ReviewsPage() {
  const dict = await getDictionary();
  const session = await auth();
  const userId = session!.user.id;

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { rating: true, name: true, role: true },
  });

  const [received, given] = await Promise.all([
    prisma.review.findMany({
      where: { targetId: userId },
      include: {
        author: { select: { name: true, role: true } },
        job: { select: { title: true, id: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.review.findMany({
      where: { authorId: userId },
      include: {
        target: { select: { name: true, role: true } },
        job: { select: { title: true, id: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={dict.reviews.eyebrow}
        title={dict.reviews.title}
        description={dict.reviews.description}
        action={
          <div className="flex items-center gap-2 rounded-full border border-line bg-ink/40 px-3 py-2">
            <StarRating value={user.rating} size="sm" />
            <span className="text-sm font-medium text-champagne">{user.rating.toFixed(1)}</span>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/jobs" className="btn-ghost !px-4 !py-2.5 text-sm">
          {dict.shell.modelNav.jobs}
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="surface rounded-[1.75rem] p-5 sm:p-6">
          <h2 className="font-display text-2xl tracking-tight">{dict.reviews.received}</h2>
          <div className="mt-4 space-y-3">
            {received.length === 0 && (
              <EmptyState
                icon={Star}
                title={dict.reviews.empty}
                description={dict.reviews.aboutYou}
                className="!py-8"
              />
            )}
            {received.map((r) => (
              <div key={r.id} className="rounded-2xl bg-ink/45 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{r.author.name}</p>
                  <StarRating value={r.rating} size="sm" />
                </div>
                <p className="mt-1 text-xs text-mist">
                  {r.job.title} · {formatDate(r.createdAt)}
                </p>
                <p className="mt-2 text-sm text-cream/90">
                  {r.comment || dict.reviews.noComment}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="surface rounded-[1.75rem] p-5 sm:p-6">
          <h2 className="font-display text-2xl tracking-tight">{dict.reviews.given}</h2>
          <div className="mt-4 space-y-3">
            {given.length === 0 && (
              <EmptyState
                icon={Star}
                title={dict.reviews.empty}
                description={dict.reviews.youWrote}
                className="!py-8"
              />
            )}
            {given.map((r) => (
              <div key={r.id} className="rounded-2xl bg-ink/45 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{r.target.name}</p>
                  <StarRating value={r.rating} size="sm" />
                </div>
                <p className="mt-1 text-xs text-mist">
                  {r.job.title} · {formatDate(r.createdAt)}
                </p>
                <p className="mt-2 text-sm text-cream/90">
                  {r.comment || dict.reviews.noComment}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
