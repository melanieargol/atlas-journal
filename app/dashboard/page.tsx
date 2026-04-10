import type { Metadata } from "next";

import { AppFrame } from "@/components/AppFrame";
import { DashboardSignatureHero } from "@/components/DashboardSignatureHero";
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
  const spotlightEntry = entries.find((entry) => entry.analysis.emotional_shift.start_state !== entry.analysis.emotional_shift.end_state) ?? entries[0];

  return (
    <AppFrame
      title="Pattern dashboard"
      description="A calmer view of what repeats over time: where pressure builds, where steadiness returns, and what helps the emotional tone of a day move."
    >
      <DashboardSignatureHero
        eyebrow="Pattern read"
        title="Your entries start to feel legible here."
        description="Atlas Journal keeps the raw writing close to the pattern layer, so the dashboard reads less like analytics and more like a calm, honest map of emotional movement."
        spotlight={{
          label: "Emotional transformation",
          before: spotlightEntry?.analysis.emotional_shift.start_state ?? "unclear",
          after: spotlightEntry?.analysis.emotional_shift.end_state ?? "steady",
          summary:
            spotlightEntry?.analysis.summary ??
            "As entries accumulate, Atlas Journal highlights the moments where a day visibly shifts in tone."
        }}
        metrics={[
          {
            label: "Entries in range",
            value: String(entries.length),
            supporting: range === "all" ? "all stored entries" : `from ${allEntriesCount} total entries`,
            tone: "cool"
          },
          {
            label: "Most common emotion",
            value: recurringEmotions[0]?.emotion ?? "n/a",
            count: recurringEmotions[0]?.count ?? 0,
            suffix: " times",
            supporting: "the feeling that appears most often in this window",
            tone: "warm"
          },
          {
            label: "Most common trigger",
            value: triggerSources[0]?.label ?? "n/a",
            count: triggerSources[0]?.count ?? 0,
            suffix: " times",
            supporting: "the source of strain most likely to repeat here",
            tone: "uplift"
          }
        ]}
        actions={[
          { href: "/journal", label: "Write a new entry", kind: "primary" },
          { href: "/archive", label: "Browse archive", kind: "secondary" }
        ]}
      />

      <DashboardRangeFilter activeRange={range} />

      <NudgePanel snapshot={reminderSnapshot} />

      <section className="charts-grid reveal-group">
        <EmotionTrendsChart data={emotionTrends} />
        <TriggerSourcesChart data={triggerSources} />
        <EnergyPatternsChart data={energyPatterns} />
      </section>

      <RestorativeInsights insights={restorativeInsights} />
    </AppFrame>
  );
}
