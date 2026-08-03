import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatCOP, formatDate } from "@/lib/utils";
import { getDictionary } from "@/i18n/server";

export default async function AdminUsersPage() {
  const dict = await getDictionary();
  const users = await prisma.user.findMany({
    include: {
      referredBy: { select: { name: true, referralCode: true } },
      _count: { select: { referrals: true, jobsAsModel: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={dict.admin.overviewEyebrow}
        title={dict.admin.usersTitle}
        description={dict.admin.usersDesc}
      />

      <div className="space-y-3 md:hidden">
        {users.map((u) => (
          <div key={u.id} className="surface rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{u.name}</p>
                <p className="truncate text-xs text-mist">{u.email}</p>
              </div>
              <span className="shrink-0 rounded-full bg-ink/50 px-2.5 py-1 text-[11px] text-champagne">
                {u.role}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-mist">
              <div>
                <dt>Ciudad</dt>
                <dd className="text-cream">{u.city || "—"}</dd>
              </div>
              <div>
                <dt>Ganado</dt>
                <dd className="text-cream">{formatCOP(u.totalEarned)}</dd>
              </div>
              <div>
                <dt>Red</dt>
                <dd className="text-cream">{u._count.referrals}</dd>
              </div>
              <div>
                <dt>Referida por</dt>
                <dd className="truncate text-cream">{u.referredBy?.name || "—"}</dd>
              </div>
            </dl>
            <p className="mt-3 text-[11px] text-mist">{formatDate(u.createdAt)}</p>
          </div>
        ))}
      </div>

      <div className="surface hidden overflow-x-auto rounded-[1.75rem] md:block">
        <table className="min-w-full text-sm">
          <thead className="border-b border-line text-left text-xs uppercase tracking-[0.14em] text-mist">
            <tr>
              <th className="px-5 py-4">Usuario</th>
              <th className="px-5 py-4">Rol</th>
              <th className="px-5 py-4">Ciudad</th>
              <th className="px-5 py-4">Ganado</th>
              <th className="px-5 py-4">Red</th>
              <th className="px-5 py-4">Referida por</th>
              <th className="px-5 py-4">Alta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-5 py-4">
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-mist">{u.email}</p>
                </td>
                <td className="px-5 py-4">{u.role}</td>
                <td className="px-5 py-4">{u.city || "—"}</td>
                <td className="px-5 py-4">{formatCOP(u.totalEarned)}</td>
                <td className="px-5 py-4">{u._count.referrals}</td>
                <td className="px-5 py-4">{u.referredBy?.name || "—"}</td>
                <td className="px-5 py-4 text-mist">{formatDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
