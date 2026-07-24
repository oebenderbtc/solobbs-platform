"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { Toast, ToastTone } from "@/components/ui/Toast";
import { formatCOP, formatDate } from "@/lib/utils";
import { useLocale } from "@/i18n/LocaleProvider";

type Escrow = {
  id: string;
  amount: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  model: { name: string };
  client?: { name: string } | null;
  job?: { title: string } | null;
};

export default function AdminEscrowsPage() {
  const { dict } = useLocale();
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [toast, setToast] = useState<{ open: boolean; message: string; tone: ToastTone }>({
    open: false,
    message: "",
    tone: "info",
  });

  async function load() {
    const res = await fetch("/api/escrow");
    const data = await res.json();
    setEscrows(data.escrows || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function act(id: string, action: "release" | "refund" | "dispute") {
    await fetch("/api/escrow", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    setToast({
      open: true,
      message:
        action === "release"
          ? dict.escrowPage.release
          : action === "refund"
            ? dict.escrowPage.refund
            : dict.escrowPage.dispute,
      tone: action === "dispute" ? "info" : "success",
    });
    window.setTimeout(() => setToast((t) => ({ ...t, open: false })), 2000);
    load();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={dict.admin.overviewEyebrow}
        title={dict.admin.escrowsTitle}
        description={dict.admin.escrowsDesc}
      />

      <div className="space-y-3">
        {escrows.map((e) => (
          <div key={e.id} className="surface rounded-[1.5rem] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-medium text-lg">{e.job?.title || "Depósito"}</p>
                <p className="mt-1 text-sm text-mist">
                  {e.model.name} · {e.client?.name || "Cliente"} · {formatCOP(e.amount)}
                </p>
                <p className="text-xs text-mist mt-1">{formatDate(e.createdAt)}</p>
                <div className="mt-3 flex gap-2">
                  <StatusBadge status={e.paymentMethod} />
                  <StatusBadge status={e.status} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(e.status === "FUNDED" || e.status === "IN_PROGRESS" || e.status === "DISPUTED") && (
                  <button onClick={() => act(e.id, "release")} className="btn-primary !py-2 !px-3 text-sm">
                    Liberar
                  </button>
                )}
                {e.status !== "RELEASED" && e.status !== "REFUNDED" && (
                  <button onClick={() => act(e.id, "refund")} className="btn-ghost !py-2 !px-3 text-sm">
                    Reembolsar
                  </button>
                )}
                {e.status !== "DISPUTED" && e.status !== "RELEASED" && (
                  <button onClick={() => act(e.id, "dispute")} className="btn-ghost !py-2 !px-3 text-sm">
                    Marcar disputa
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <Toast open={toast.open} message={toast.message} tone={toast.tone} />
    </div>
  );
}
