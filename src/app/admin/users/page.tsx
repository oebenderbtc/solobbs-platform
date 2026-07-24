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

      <div className="surface overflow-x-auto rounded-[1.75rem]">
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
