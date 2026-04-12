import type { Metadata } from "next";

import { AppFrame } from "@/components/AppFrame";
import { DashboardSignatureHero } from "@/components/DashboardSignatureHero";
import { DashboardRangeFilter } from "@/components/DashboardRangeFilter";
import { DemoRecentEntries } from "@/components/DemoRecentEntries";
import { EmotionTrendsChart } from "@/components/EmotionTrendsChart";
import { EnergyPatternsChart } from "@/components/EnergyPatternsChart";
import { NudgePanel } from "@/components/NudgePanel";
import { RepeatedSignalsPanel } from "@/components/RepeatedSignalsPanel";
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
  const { entries, emotionTrends, triggerSources, energyPatterns, recurringEmotions, emergingSignals, restorativeInsights, allEntriesCount, reminderSnapshot } =
    await getDemoDashboardData(range);
  const spotlightEntry = entries.find((entry) => entry.analysis.emotional_shift.start_state !== entry.analysis.emotional_shift.end_state) ?? entries[0];

  return (
    <AppFrame
      title="Pattern dashboard"
      description="See the strongest product story first: emotional movement, recurring strain, restorative signals, and the journal entries behind them."
      demoMode
      demoNote="sample data"
    >
      <DashboardSignatureHero
        eyebrow="Try this"
        title="One entry becomes a visible emotional pattern."
        description="The dashboard is the fastest way to understand Atlas Journal: recurring feelings, repeated trigger sources, and moments where the tone of an entry visibly shifts."
        spotlight={{
          label: "Signature moment",
          before: spotlightEntry?.analysis.emotional_shift.start_state ?? "tense",
          after: spotlightEntry?.analysis.emotional_shift.end_state ?? "reflective",
          summary:
            spotlightEntry?.analysis.summary ??
            "Open any entry next and you can see the original language sitting beside the structured insight."
        }}
        metrics={[
          {
            label: "Entries in range",
            value: String(entries.length),
            supporting: range === "all" ? "all demo entries" : `from ${allEntriesCount} demo entries`,
            tone: "cool"
          },
          {
            label: "Most common emotion",
            value: recurringEmotions[0]?.emotion ?? "n/a",
            count: recurringEmotions[0]?.count ?? 0,
            suffix: " times",
            supporting: "the feeling that appears most often in this sample",
            tone: "warm"
          },
          {
            label: "Most common trigger",
            value: triggerSources[0]?.label ?? "n/a",
            count: triggerSources[0]?.count ?? 0,
            suffix: " times",
            supporting: "the pressure source that repeats most in the demo",
            tone: "uplift"
          }
        ]}
        actions={[
          { href: "#recent-entries", label: "Open a recent entry", kind: "primary" },
          { href: "/demo/archive", label: "Explore archive", kind: "secondary" }
        ]}
      />

      <DashboardRangeFilter activeRange={range} basePath="/demo/dashboard" />

      <div id="recent-entries">
        <DemoRecentEntries entries={entries.slice(0, 3)} />
      </div>

      <NudgePanel snapshot={reminderSnapshot} />

      <RepeatedSignalsPanel signals={emergingSignals} />

      <section id="demo-charts" className="charts-grid reveal-group">
        <EmotionTrendsChart data={emotionTrends} />
        <TriggerSourcesChart data={triggerSources} />
        <EnergyPatternsChart data={energyPatterns} />
      </section>

      <RestorativeInsights insights={restorativeInsights} />
    </AppFrame>
  );
}

