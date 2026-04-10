import type { Metadata } from "next";

import { AppFrame } from "@/components/AppFrame";
import { DashboardRangeFilter } from "@/components/DashboardRangeFilter";
import { EmotionTrendsChart } from "@/components/EmotionTrendsChart";
import { EnergyPatternsChart } from "@/components/EnergyPatternsChart";
import { NudgePanel } from "@/components/NudgePanel";
import { RestorativeInsights } from "@/components/RestorativeInsights";
import { TriggerSourcesChart } from "@/components/TriggerSourcesChart";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/db";
import type { TimeRange } from "@/types/journal";

export const metadata: Metadata = {
  title: "Atlas Journal | Dashboard"
};

function getRangeFromSearchParams(range: string | undefined): TimeRange {
  if (range === "7d" || range === "30d" || range === "90d" || range === "all") {
    return range;
  }

  return "all";
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams?: Promise<{ range?: string }>;
}) {
  await requireUser();
  const params = searchParams ? await searchParams : undefined;
  const range = getRangeFromSearchParams(params?.range);
  const { entries, emotionTrends, triggerSources, energyPatterns, recurringEmotions, restorativeInsights, allEntriesCount, reminderSnapshot } =
    await getDashboardData(range);

  return (
    <AppFrame
      title="Pattern dashboard"
      description="A clearer view of what repeats over time: how mood and stress move together, which triggers keep appearing, and what tends to support steadier emotional outcomes."
    >
      <section className="overview-grid">
        <article className="panel metric-panel">
          <p className="section-label">Entries in range</p>
          <strong>{entries.length}</strong>
          <span className="muted-text">{range === "all" ? "all stored entries" : `from ${allEntriesCount} total entries`}</span>
        </article>

        <article className="panel metric-panel">
          <p className="section-label">Most common emotion</p>
          <strong>{recurringEmotions[0]?.emotion ?? "n/a"}</strong>
          <span className="muted-text">{recurringEmotions[0]?.count ?? 0} times</span>
        </article>

        <article className="panel metric-panel">
          <p className="section-label">Most common trigger</p>
          <strong>{triggerSources[0]?.label ?? "n/a"}</strong>
          <span className="muted-text">{triggerSources[0]?.count ?? 0} times</span>
        </article>
      </section>

      <DashboardRangeFilter activeRange={range} />

      <NudgePanel snapshot={reminderSnapshot} />

      <section className="charts-grid">
        <EmotionTrendsChart data={emotionTrends} />
        <TriggerSourcesChart data={triggerSources} />
        <EnergyPatternsChart data={energyPatterns} />
      </section>

      <RestorativeInsights insights={restorativeInsights} />
    </AppFrame>
  );
}
