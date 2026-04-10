"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { TriggerFrequencyDatum } from "@/types/journal";

const colors = ["#f2a84b", "#7db2ff", "#5dd2c1", "#d08cff", "#ff7ea8"];

export function TriggerSourcesChart({ data }: { data: TriggerFrequencyDatum[] }) {
  return (
    <section className="panel chart-panel reveal-panel">
      <div className="section-head">
        <div>
          <p className="section-label">Recurring sources</p>
          <h2>Trigger Sources</h2>
        </div>
      </div>

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="#aeb6d9" />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} stroke="#aeb6d9" />
            <Tooltip
              contentStyle={{
                background: "#0f1320",
                border: "1px solid rgba(174, 182, 217, 0.18)",
                borderRadius: 18
              }}
            />
            <Bar dataKey="count" radius={[10, 10, 0, 0]}>
              {data.map((item, index) => (
                <Cell key={item.label} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
