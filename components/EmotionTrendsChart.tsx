"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { EmotionTrendDatum } from "@/types/journal";

export function EmotionTrendsChart({ data }: { data: EmotionTrendDatum[] }) {
  return (
    <section className="panel chart-panel">
      <div className="section-head">
        <div>
          <p className="section-label">Chart 1</p>
          <h2>Emotion Trends</h2>
        </div>
      </div>

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data}>
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
            <Line type="monotone" dataKey="mood_score" stroke="#f2a84b" strokeWidth={3} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="stress_level" stroke="#7db2ff" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
