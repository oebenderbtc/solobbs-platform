import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { EarningsChart } from "@/components/EarningsChart";
import { PageHeader } from "@/components/ui/PageHeader";
import { CopyButton } from "@/components/ui/CopyButton";
import { StarRating } from "@/components/StarRating";
import { formatCOP, formatDate } from "@/lib/utils";
import { getDictionary, t } from "@/i18n/server";

export default async function DashboardPage() {
  const dict = await getDictionary();
  const session = await auth();
  const userId = session!.user.id;
  const isClient = session!.user.role === "CLIENT";

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  if (isClient) {
    const jobs = await prisma.job.findMany({
      where: { clientId: userId },
      include: {
        model: { select: { name: true, rating: true } },
        reviews: true,
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    });
    const pendingReviews = jobs.filter(
      (j) =>
        j.status === "COMPLETED" && !j.reviews.some((r) => r.authorId === userId),
    ).length;
    const received = await prisma.review.count({ where: { targetId: userId } });

    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow={dict.shell.clientAccount}
          title={t(dict, "dashboard.hello", { name: user.name.split(" ")[0] })}
          description={dict.reviews.description}
          action={
            <div className="flex items-center gap-2 rounded-full border border-line bg-ink/40 px-3 py-2">
              <StarRating value={user.rating} size="sm" />
              <span className="text-sm font-medium text-champagne">
                {user.rating.toFixed(1)}
              </span>
            </div>
          }
        />

        <div className="stat-grid">
          <StatCard label={dict.dashboard.jobs} value={`${jobs.length}`} tone="blush" />
          <StatCard
            label={dict.reviews.pending}
            value={`${pendingReviews}`}
            tone="champagne"
          />
          <StatCard label={dict.reviews.received} value={`${received}`} />
          <StatCard
            label={dict.dashboard.rating}
            value={user.rating.toFixed(1)}
            hint={dict.reviews.aboutYou}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/jobs" className="btn-primary !py-2.5 !px-4 text-sm">
            {dict.shell.clientNav.jobs}
          </Link>
          <Link href="/dashboard/reviews" className="btn-ghost !py-2.5 !px-4 text-sm">
            {dict.shell.clientNav.reviews}
          </Link>
        </div>

        <div className="surface rounded-[1.75rem] p-5 sm:p-6">
          <h2 className="font-display text-2xl tracking-tight">{dict.dashboard.recentJobs}</h2>
          <div className="mt-4 space-y-2.5">
            {jobs.length === 0 && (
              <p className="text-sm text-mist">{dict.dashboard.noJobs}</p>
            )}
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-ink/45 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{job.title}</p>
                  <p className="text-xs text-mist">
                    {job.model.name} · {formatCOP(job.amount)}
                  </p>
                </div>
                <StatusBadge status={job.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const jobs = await prisma.job.findMany({
    where: { modelId: userId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const escrows = await prisma.escrow.findMany({
    where: { modelId: userId },
    orderBy: { createdAt: "desc" },
    take: 4,
  });
  const commissions = await prisma.commission.findMany({
    where: { earnerId: userId },
  });
  const referrals = await prisma.user.count({ where: { referredById: userId } });
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  const dayKeys = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;
  const chartData = dayKeys.map((key, i) => ({
    name: dict.days[key],
    value: Math.round(
      user.totalEarned * [0.08, 0.11, 0.09, 0.14, 0.18, 0.22, 0.18][i],
    ),
  }));

  const networkEarnings = commissions.reduce((a, c) => a + c.amount, 0);
  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={dict.dashboard.eyebrow}
        title={t(dict, "dashboard.hello", { name: firstName })}
        description={dict.dashboard.subtitle}
        action={
          <div className="flex items-center gap-2 rounded-full border border-line bg-ink/40 px-3 py-2">
            <span className="text-xs text-mist">{dict.common.code}</span>
            <span className="text-sm font-medium text-champagne">{user.referralCode}</span>
            <CopyButton value={user.referralCode} />
          </div>
        }
      />

      <div className="stat-grid">
        <StatCard
          index={0}
          label={dict.dashboard.wallet}
          value={formatCOP(user.walletBalance)}
          hint={dict.dashboard.available}
          tone="champagne"
        />
        <StatCard
          index={1}
          label={dict.dashboard.inEscrow}
          value={formatCOP(user.escrowHeld)}
          hint="Escrow P2P"
          tone="blush"
        />
        <StatCard
          index={2}
          label={dict.dashboard.totalEarned}
          value={formatCOP(user.totalEarned)}
          hint={`${user.totalJobs} ${dict.dashboard.jobs.toLowerCase()}`}
        />
        <StatCard
          index={3}
          label={dict.dashboard.network}
          value={`${referrals}`}
          hint={`${formatCOP(networkEarnings)} · ${dict.dashboard.networkEarn}`}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/escrow" className="btn-primary !py-2.5 !px-4 text-sm">
          {dict.dashboard.newEscrow}
        </Link>
        <Link href="/dashboard/reviews" className="btn-ghost !py-2.5 !px-4 text-sm">
          {dict.shell.modelNav.reviews}
        </Link>
        <Link href="/dashboard/network" className="btn-ghost !py-2.5 !px-4 text-sm">
          {dict.shell.modelNav.network}
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <div className="surface rounded-[1.75rem] p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl tracking-tight">{dict.dashboard.chartWeek}</h2>
            <span className="text-xs uppercase tracking-[0.16em] text-mist">7d</span>
          </div>
          <EarningsChart data={chartData} />
        </div>

        <div className="surface rounded-[1.75rem] p-5 sm:p-6">
          <h2 className="font-display text-2xl tracking-tight">{dict.dashboard.notifications}</h2>
          <div className="mt-4 space-y-2.5">
            {notifications.length === 0 && (
              <p className="text-sm text-mist">{dict.dashboard.noNotifs}</p>
            )}
            {notifications.map((n) => (
              <div
                key={n.id}
                className="rounded-2xl border border-transparent bg-ink/45 px-3.5 py-3 transition hover:border-line"
              >
                <p className="text-sm font-medium">{n.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-mist">{n.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="surface rounded-[1.75rem] p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl tracking-tight">{dict.dashboard.recentJobs}</h2>
            <Link href="/dashboard/jobs" className="text-sm text-champagne hover:underline">
              {dict.dashboard.viewAll}
            </Link>
          </div>
          <div className="mt-4 space-y-2.5">
            {jobs.length === 0 && (
              <p className="text-sm text-mist">{dict.dashboard.noJobs}</p>
            )}
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-ink/45 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{job.title}</p>
                  <p className="text-xs text-mist">
                    {job.city || "—"} · {formatCOP(job.amount)}
                  </p>
                </div>
                <StatusBadge status={job.status} />
              </div>
            ))}
          </div>
        </div>
        <div className="surface rounded-[1.75rem] p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl tracking-tight">{dict.dashboard.recentEscrows}</h2>
            <Link href="/dashboard/escrow" className="text-sm text-champagne hover:underline">
              {dict.dashboard.viewAll}
            </Link>
          </div>
          <div className="mt-4 space-y-2.5">
            {escrows.length === 0 && (
              <p className="text-sm text-mist">{dict.dashboard.noEscrows}</p>
            )}
            {escrows.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-ink/45 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{formatCOP(e.amount)}</p>
                  <p className="text-xs text-mist">{formatDate(e.createdAt)}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <StatusBadge status={e.paymentMethod} />
                  <StatusBadge status={e.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
