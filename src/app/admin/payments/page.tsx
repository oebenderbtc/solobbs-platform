import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatCOP, formatDate } from "@/lib/utils";
import { getDictionary } from "@/i18n/server";

export default async function AdminPaymentsPage() {
  const dict = await getDictionary();
  const payments = await prisma.payment.findMany({
    include: {
      user: { select: { name: true, email: true } },
      escrow: { include: { model: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={dict.admin.overviewEyebrow}
        title={dict.admin.paymentsTitle}
        description={dict.admin.paymentsDesc}
      />

      <div className="surface overflow-x-auto rounded-[1.75rem]">
        <table className="min-w-full text-sm">
          <thead className="border-b border-line text-left text-xs uppercase tracking-[0.14em] text-mist">
            <tr>
              <th className="px-5 py-4">Fecha</th>
              <th className="px-5 py-4">Pagador</th>
              <th className="px-5 py-4">Modelo</th>
              <th className="px-5 py-4">Monto</th>
              <th className="px-5 py-4">Método</th>
              <th className="px-5 py-4">Estado</th>
              <th className="px-5 py-4">Ref</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="px-5 py-4 text-mist">{formatDate(p.createdAt)}</td>
                <td className="px-5 py-4">{p.user.name}</td>
                <td className="px-5 py-4">{p.escrow?.model.name || "—"}</td>
                <td className="px-5 py-4">{formatCOP(p.amount)}</td>
                <td className="px-5 py-4"><StatusBadge status={p.method} /></td>
                <td className="px-5 py-4"><StatusBadge status={p.status} /></td>
                <td className="px-5 py-4 font-mono text-xs text-mist">
                  {p.externalId || p.cardLast4 || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
