import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/StatCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { NetworkCalculator } from "@/components/NetworkCalculator";
import { Network } from "lucide-react";
import { formatCOP, formatDate } from "@/lib/utils";
import { getDictionary, t } from "@/i18n/server";

export default async function NetworkPage() {
  const dict = await getDictionary();
  const session = await auth();
  if (session?.user.role === "CLIENT") redirect("/dashboard");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session!.user.id } });
  const settings = await prisma.platformSettings.findUnique({ where: { id: "default" } });

  const feePercent = settings?.platformFeePercent ?? 8;
  const l1Percent = settings?.referralL1Percent ?? 10;
  const l2Percent = settings?.referralL2Percent ?? 5;
  const l3Percent = settings?.referralL3Percent ?? 2;

  const level1 = await prisma.user.findMany({
    where: { referredById: user.id },
    orderBy: { createdAt: "desc" },
  });

  const level1Ids = level1.map((u) => u.id);
  const level2 = await prisma.user.findMany({
    where: { referredById: { in: level1Ids } },
  });
  const level2Ids = level2.map((u) => u.id);
  const level3 = await prisma.user.findMany({
    where: { referredById: { in: level2Ids } },
  });

  const commissions = await prisma.commission.findMany({
    where: { earnerId: user.id },
    include: { source: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const totalNetwork = level1.length + level2.length + level3.length;
  const totalCommission = commissions.reduce((a, c) => a + c.amount, 0);
  const invitePath = `/register?ref=${user.referralCode}`;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={dict.networkPage.eyebrow}
        title={dict.networkPage.title}
        description={t(dict, "networkPage.description", {
          l1: l1Percent,
          l2: l2Percent,
          l3: l3Percent,
        })}
      />

      <div className="stat-grid">
        <StatCard
          label={dict.networkPage.totalNetwork}
          value={`${totalNetwork}`}
          hint={dict.networkPage.girlsUnder}
          tone="blush"
        />
        <StatCard label={dict.networkPage.level1} value={`${level1.length}`} />
        <StatCard label={dict.networkPage.level2} value={`${level2.length}`} />
        <StatCard
          label={dict.networkPage.commissions}
          value={formatCOP(totalCommission)}
          tone="champagne"
        />
      </div>

      <NetworkCalculator
        feePercent={feePercent}
        l1Percent={l1Percent}
        l2Percent={l2Percent}
        l3Percent={l3Percent}
        defaultL1={Math.max(level1.length, 10)}
      />

      <div className="surface rounded-[1.75rem] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl tracking-tight">{dict.networkPage.inviteTitle}</h2>
            <p className="mt-1 text-sm text-mist">{dict.networkPage.inviteHint}</p>
          </div>
          <CopyButton value={invitePath} label={dict.networkPage.copyLink} />
        </div>
        <p className="mt-4 break-all rounded-2xl bg-ink/50 px-4 py-3.5 font-mono text-sm text-champagne">
          {invitePath}
        </p>
        <p className="mt-3 text-sm text-mist">
          {dict.networkPage.codeLabel} <span className="text-cream">{user.referralCode}</span>
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {[
          { title: `${dict.networkPage.level1} · ${l1Percent}%`, users: level1 },
          {
            title: `${t(dict, "common.level", { n: 2 })} · ${l2Percent}%`,
            users: level2,
          },
          {
            title: `${t(dict, "common.level", { n: 3 })} · ${l3Percent}%`,
            users: level3,
          },
        ].map((col) => (
          <div key={col.title} className="surface rounded-[1.75rem] p-5">
            <h3 className="font-display text-xl tracking-tight">{col.title}</h3>
            <div className="mt-4 space-y-2.5">
              {col.users.map((u) => (
                <div key={u.id} className="rounded-2xl bg-ink/45 px-3.5 py-3">
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-mist">
                    {u.city || dict.networkPage.noCity} · {formatCOP(u.totalEarned)}
                  </p>
                </div>
              ))}
              {col.users.length === 0 && (
                <EmptyState
                  icon={Network}
                  title={dict.common.empty}
                  description={dict.networkPage.emptyLevel}
                  className="!py-8"
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="surface rounded-[1.75rem] p-5 sm:p-6">
        <h2 className="font-display text-2xl tracking-tight">{dict.networkPage.history}</h2>
        <div className="mt-4 space-y-2.5">
          {commissions.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-ink/45 px-4 py-3"
            >
              <div>
                <p className="text-sm">{c.description}</p>
                <p className="text-xs text-mist">{formatDate(c.createdAt)}</p>
              </div>
              <p className="shrink-0 text-champagne">+{formatCOP(c.amount)}</p>
            </div>
          ))}
          {commissions.length === 0 && (
            <p className="text-sm text-mist">{dict.networkPage.noCommissions}</p>
          )}
        </div>
      </div>
    </div>
  );
}
