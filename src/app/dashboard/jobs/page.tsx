import { Briefcase } from "lucide-react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReviewForm } from "@/components/ReviewForm";
import { StarRating } from "@/components/StarRating";
import { formatCOP, formatDate } from "@/lib/utils";
import { getDictionary } from "@/i18n/server";

export default async function JobsPage() {
  const dict = await getDictionary();
  const session = await auth();
  const userId = session!.user.id;
  const role = session!.user.role;
  const isClient = role === "CLIENT";

  const jobs = await prisma.job.findMany({
    where: isClient ? { clientId: userId } : { modelId: userId },
    include: {
      escrow: true,
      client: { select: { id: true, name: true, rating: true } },
      model: { select: { id: true, name: true, rating: true } },
      reviews: {
        include: {
          author: { select: { id: true, name: true, role: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={dict.jobsPage.eyebrow}
        title={isClient ? dict.shell.clientNav.jobs : dict.jobsPage.title}
        description={dict.jobsPage.description}
        action={
          !isClient ? (
            <Link href="/dashboard/escrow" className="btn-primary !px-4 !py-2.5 text-sm">
              {dict.dashboard.newEscrow}
            </Link>
          ) : undefined
        }
      />

      {jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={dict.jobsPage.emptyTitle}
          description={dict.jobsPage.emptyBody}
          action={
            !isClient ? (
              <Link href="/dashboard/escrow" className="btn-primary">
                {dict.dashboard.newEscrow}
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const myReview = job.reviews.find((r) => r.authorId === userId);
            const theirReview = job.reviews.find((r) => r.authorId !== userId);
            const counterpart = isClient ? job.model : job.client;
            const canReview =
              job.status === "COMPLETED" && !!job.clientId && !myReview && !!counterpart;

            return (
              <div key={job.id} className="surface rounded-[1.75rem] p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xl tracking-tight">{job.title}</p>
                    <p className="mt-1 text-sm text-mist">
                      {job.city || "—"} · {formatCOP(job.amount)} ·{" "}
                      {job.scheduledAt
                        ? formatDate(job.scheduledAt)
                        : formatDate(job.createdAt)}
                    </p>
                    <p className="mt-2 text-sm text-cream/90">
                      {isClient ? job.model.name : job.client?.name || "—"}
                      {counterpart && (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs text-mist">
                          <StarRating value={counterpart.rating} size="sm" />
                          {counterpart.rating.toFixed(1)}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={job.status} />
                    {job.escrow && <StatusBadge status={job.escrow.status} />}
                  </div>
                </div>

                {(myReview || theirReview) && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {myReview && (
                      <div className="rounded-2xl bg-ink/45 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-mist">
                          {dict.reviews.yours}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <StarRating value={myReview.rating} size="sm" />
                          <span className="text-sm text-cream">{myReview.rating}/5</span>
                        </div>
                        <p className="mt-2 text-sm text-mist">
                          {myReview.comment || dict.reviews.noComment}
                        </p>
                      </div>
                    )}
                    {theirReview && (
                      <div className="rounded-2xl bg-ink/45 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.14em] text-mist">
                          {dict.reviews.theirs}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <StarRating value={theirReview.rating} size="sm" />
                          <span className="text-sm text-cream">{theirReview.rating}/5</span>
                        </div>
                        <p className="mt-2 text-sm text-mist">
                          {theirReview.comment || dict.reviews.noComment}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {canReview && counterpart && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs uppercase tracking-[0.14em] text-champagne">
                      {dict.reviews.pending}
                    </p>
                    <ReviewForm
                      jobId={job.id}
                      targetName={counterpart.name}
                      targetRole={isClient ? "MODEL" : "CLIENT"}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
