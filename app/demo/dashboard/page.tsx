import type { Metadata } from "next";

import { AppFrame } from "@/components/AppFrame";
import { DashboardRangeFilter } from "@/components/DashboardRangeFilter";
import { EmotionTrendsChart } from "@/components/EmotionTrendsChart";
import { EnergyPatternsChart } from "@/components/EnergyPatternsChart";
import { NudgePanel } from "@/components/NudgePanel";
import { RestorativeInsights } from "@/components/RestorativeInsights";
import { TriggerSourcesChart } from "@/components/TriggerSourcesChart";
import { getDemoDashboardData } from "@/lib/demo";
import type { TimeRange } from "@/types/journal";

export const metadata: Metadata = {
  title: "Atlas Journal | Demo Dashboard"
};

function getRangeFromSearchParams(range: string | undefined): TimeRange {
  if (range === "7d" || range === "30d" || range === "90d" || range === "all") {
    return range;
  }

  return "all";
}

export default async function DemoDashboardPage({
  searchParams
}: {
  searchParams?: Promise<{ range?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const range = getRangeFromSearchParams(params?.range);
  const { entries, emotionTrends, triggerSources, energyPatterns, recurringEmotions, restorativeInsights, allEntriesCount, reminderSnapshot } =
    await getDemoDashboardData(range);

  return (
    <AppFrame
      title="Dashboard preview"
      description="Start with the clearest product story: recurring emotions, trigger patterns, energy movement, nudges, and restorative signals surfaced from seeded sample entries."
      demoMode
      demoNote="Preview seeded sample entries and insights"
    >
      <section className="overview-grid">
        <article className="panel intro-panel">
          <p className="section-label">Demo flow</p>
          <h2>The most important story appears first</h2>
          <p className="muted-text">
            This showcase begins with the dashboard so visitors can understand the product in seconds, then move into the archive and entry detail views for the underlying journal context.
          </p>
        </article>

        <article className="panel metric-panel">
          <p className="section-label">Entries in range</p>
          <strong>{entries.length}</strong>
          <span className="muted-text">{range === "all" ? "all demo entries" : `from ${allEntriesCount} demo entries`}</span>
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

      <DashboardRangeFilter activeRange={range} basePath="/demo/dashboard" />

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
