"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { EnergyPatternDatum } from "@/types/journal";

export function EnergyPatternsChart({ data }: { data: EnergyPatternDatum[] }) {
  return (
    <section className="panel chart-panel reveal-panel">
      <div className="section-head">
        <div>
          <p className="section-label">Recovery rhythm</p>
          <h2>Energy Patterns</h2>
        </div>
      </div>

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="energy-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5dd2c1" stopOpacity={0.7} />
                <stop offset="100%" stopColor="#5dd2c1" stopOpacity={0.06} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(195, 203, 255, 0.08)" vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} stroke="#aeb6d9" />
            <YAxis domain={[0, 10]} tickLine={false} axisLine={false} stroke="#aeb6d9" />
            <Tooltip
              contentStyle={{
                background: "#0f1320",
                border: "1px solid rgba(174, 182, 217, 0.18)",
                borderRadius: 18
              }}
            />
            <Area type="monotone" dataKey="energy_level" stroke="#5dd2c1" fill="url(#energy-gradient)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
