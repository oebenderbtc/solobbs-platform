"use client";

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
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f2a7b0" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#f2a7b0" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="name"
            stroke="#cbbfc8"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#cbbfc8"
            fontSize={12}
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
