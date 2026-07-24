import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatCOP, formatDate } from "@/lib/utils";
import { getDictionary } from "@/i18n/server";

export default async function AdminPage() {
  const dict = await getDictionary();
  const [users, models, escrows, payments, jobs, commissions, allHeld] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "MODEL" } }),
      prisma.escrow.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { model: true },
      }),
      prisma.payment.findMany({ where: { status: "COMPLETED" } }),
      prisma.job.count(),
      prisma.commission.aggregate({ _sum: { amount: true } }),
      prisma.escrow.aggregate({
        where: { status: { in: ["FUNDED", "IN_PROGRESS"] } },
        _sum: { amount: true },
      }),
    ]);

  const volume = payments.reduce((a, p) => a + p.amount, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={dict.admin.overviewEyebrow}
        title={dict.admin.overviewTitle}
        description={dict.admin.overviewDesc}
        action={
          <Link href="/admin/escrows" className="btn-primary !px-4 !py-2.5 text-sm">
            {dict.shell.adminNav.escrows}
          </Link>
        }
      />

      <div className="stat-grid">
        <StatCard
          index={0}
          label={dict.admin.users}
          value={`${users}`}
          hint={`${models} ${dict.admin.models.toLowerCase()}`}
        />
        <StatCard
          index={1}
          label={dict.admin.volume}
          value={formatCOP(volume)}
          tone="champagne"
        />
        <StatCard
          index={2}
          label={dict.admin.inEscrow}
          value={formatCOP(allHeld._sum.amount || 0)}
          tone="blush"
        />
        <StatCard
          index={3}
          label={dict.dashboard.jobs}
          value={`${jobs}`}
          hint={`${dict.dashboard.network}: ${formatCOP(commissions._sum.amount || 0)}`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="surface rounded-[1.75rem] p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl tracking-tight">
              {dict.dashboard.recentEscrows}
            </h2>
            <Link href="/admin/escrows" className="text-sm text-champagne hover:underline">
              {dict.dashboard.viewAll}
            </Link>
          </div>
          <div className="mt-4 space-y-2.5">
            {escrows.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-ink/45 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{e.model.name}</p>
                  <p className="text-xs text-mist">
                    {formatCOP(e.amount)} · {formatDate(e.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <StatusBadge status={e.paymentMethod} />
                  <StatusBadge status={e.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="surface rounded-[1.75rem] p-5 sm:p-6">
          <h2 className="font-display text-2xl tracking-tight">{dict.admin.recent}</h2>
          <ul className="mt-4 space-y-2.5 text-sm text-mist">
            {[
              dict.tips["admin-users"].title,
              dict.tips["admin-escrows"].title,
              dict.tips["admin-settings"].title,
              dict.tips["admin-payments"].title,
            ].map((item) => (
              <li key={item} className="rounded-2xl bg-ink/45 px-4 py-3 text-cream/90">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
