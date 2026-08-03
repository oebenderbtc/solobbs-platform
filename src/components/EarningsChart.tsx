"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCOP } from "@/lib/utils";

export function EarningsChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <div className="h-56 overflow-hidden sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: narrow ? 0 : 4, bottom: 0 }}
        >
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f2a7b0" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#f2a7b0" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="name"
            stroke="#cbbfc8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            hide={narrow}
            width={36}
            stroke="#cbbfc8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
          />
          <Tooltip
            contentStyle={{
              background: "#1a161c",
              border: "1px solid rgba(232,196,168,0.2)",
              borderRadius: 12,
            }}
            formatter={(v) => [formatCOP(Number(v)), "Ingreso"]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#e8c4a8"
            fill="url(#g)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
