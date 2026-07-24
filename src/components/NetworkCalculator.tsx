"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { formatCOP } from "@/lib/utils";
import { useLocale } from "@/i18n/LocaleProvider";

type Props = {
  feePercent: number;
  l1Percent: number;
  l2Percent: number;
  l3Percent: number;
  defaultL1?: number;
};

export function NetworkCalculator({
  feePercent,
  l1Percent,
  l2Percent,
  l3Percent,
  defaultL1 = 10,
}: Props) {
  const { dict, t } = useLocale();
  const [l1, setL1] = useState(defaultL1);
  const [l2, setL2] = useState(0);
  const [l3, setL3] = useState(0);
  const [avgGross, setAvgGross] = useState(3000000);

  const result = useMemo(() => {
    const netFactor = 1 - feePercent / 100;
    const avgNet = avgGross * netFactor;

    const fromL1 = l1 * avgNet * (l1Percent / 100);
    const fromL2 = l2 * avgNet * (l2Percent / 100);
    const fromL3 = l3 * avgNet * (l3Percent / 100);
    const monthly = fromL1 + fromL2 + fromL3;

    return {
      avgNet,
      fromL1,
      fromL2,
      fromL3,
      monthly,
      yearly: monthly * 12,
    };
  }, [avgGross, feePercent, l1, l2, l3, l1Percent, l2Percent, l3Percent]);

  const exampleAmount = formatCOP(
    10 * avgGross * (1 - feePercent / 100) * (l1Percent / 100),
  );

  return (
    <div className="surface rounded-[1.75rem] p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-champagne/15 text-champagne">
          <Calculator className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-display text-2xl tracking-tight">{dict.calculator.title}</h2>
          <p className="mt-1 text-sm text-mist">
            {t("calculator.subtitle", {
              fee: feePercent,
              l1: l1Percent,
              l2: l2Percent,
              l3: l3Percent,
            })}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-2 block text-sm text-mist">{dict.calculator.l1}</span>
          <input
            type="number"
            min={0}
            className="input-field"
            value={l1}
            onChange={(e) => setL1(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm text-mist">{dict.calculator.l2}</span>
          <input
            type="number"
            min={0}
            className="input-field"
            value={l2}
            onChange={(e) => setL2(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm text-mist">{dict.calculator.l3}</span>
          <input
            type="number"
            min={0}
            className="input-field"
            value={l3}
            onChange={(e) => setL3(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm text-mist">{dict.calculator.avg}</span>
          <input
            type="number"
            min={0}
            step={100000}
            className="input-field"
            value={avgGross}
            onChange={(e) => setAvgGross(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { label: dict.calculator.presetDirect, l1: 10, l2: 0, l3: 0, avg: 3000000 },
          { label: dict.calculator.presetMid, l1: 10, l2: 20, l3: 30, avg: 3000000 },
          { label: dict.calculator.presetHigh, l1: 20, l2: 40, l3: 60, avg: 5000000 },
        ].map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => {
              setL1(preset.l1);
              setL2(preset.l2);
              setL3(preset.l3);
              setAvgGross(preset.avg);
            }}
            className="rounded-full border border-line px-3 py-1.5 text-xs text-mist transition hover:border-champagne/40 hover:text-cream"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-ink/45 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.14em] text-mist">
            {dict.calculator.netPerGirl}
          </p>
          <p className="mt-1 text-lg font-semibold text-cream">{formatCOP(result.avgNet)}</p>
          <p className="text-xs text-mist">{t("calculator.afterFee", { fee: feePercent })}</p>
        </div>
        <div className="rounded-2xl bg-ink/45 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.14em] text-mist">{dict.calculator.fromL1}</p>
          <p className="mt-1 text-lg font-semibold text-champagne">{formatCOP(result.fromL1)}</p>
        </div>
        <div className="rounded-2xl bg-ink/45 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.14em] text-mist">{dict.calculator.fromL2}</p>
          <p className="mt-1 text-lg font-semibold text-blush">{formatCOP(result.fromL2)}</p>
        </div>
        <div className="rounded-2xl bg-ink/45 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.14em] text-mist">{dict.calculator.fromL3}</p>
          <p className="mt-1 text-lg font-semibold text-cream">{formatCOP(result.fromL3)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-champagne/25 bg-gradient-to-br from-champagne/10 to-blush/10 px-5 py-4">
          <p className="text-xs uppercase tracking-[0.16em] text-mist">{dict.calculator.monthly}</p>
          <p className="mt-1 font-display text-3xl text-champagne">{formatCOP(result.monthly)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-ink/45 px-5 py-4">
          <p className="text-xs uppercase tracking-[0.16em] text-mist">{dict.calculator.yearly}</p>
          <p className="mt-1 font-display text-3xl text-cream">{formatCOP(result.yearly)}</p>
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-mist">
        {t("calculator.example", {
          avg: formatCOP(avgGross),
          amount: exampleAmount,
        })}
      </p>
    </div>
  );
}
