import demoEntries from "@/data/demoEntries.json";
import { buildReminderSnapshot } from "@/lib/nudges";
import { journalDatabaseSchema } from "@/lib/schema";
import type {
  ArchiveListItem,
  EntryPatternContext,
  EmotionTrendDatum,
  EnergyPatternDatum,
  JournalRecord,
  PatternContextItem,
  RepeatedSignal,
  RestorativeInsight,
  TimeRange,
  TriggerFrequencyDatum
} from "@/types/journal";

const demoDatabase = journalDatabaseSchema.parse(demoEntries);

function subtractDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - days);
  return copy;
}

function getRangeStart(range: TimeRange) {
  const today = new Date();

  if (range === "7d") return subtractDays(today, 7);
  if (range === "30d") return subtractDays(today, 30);
  if (range === "90d") return subtractDays(today, 90);
  return null;
}

function filterEntriesByRange(entries: JournalRecord[], range: TimeRange) {
  const start = getRangeStart(range);

  if (!start) {
    return entries;
  }

  return entries.filter((entry) => new Date(`${entry.entry_date}T00:00:00`) >= start);
}

function formatCategoryLabel(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function getBroadStressSignals(entry: JournalRecord) {
  if (entry.analysis.stressors.length > 0) {
    return entry.analysis.stressors.map((item) => item.category);
  }

  return entry.analysis.triggers.map((item) => item.type);
}

function buildEmergingSignals(entries: JournalRecord[]): RepeatedSignal[] {
  const counts = new Map<string, RepeatedSignal>();
  const lowInformationLabels = new Set([
    "situational strain",
    "money",
    "family",
    "manager",
    "dog"
  ]);

  function register(
    label: string,
    category: string,
    kind: RepeatedSignal["kind"],
    tone: RepeatedSignal["tone"]
  ) {
    const normalizedLabel = label.trim();

    if (!normalizedLabel || lowInformationLabels.has(normalizedLabel.toLowerCase())) {
      return;
    }

    const key = `${kind}:${normalizedLabel.toLowerCase()}`;
    const existing = counts.get(key);

    if (existing) {
      existing.count += 1;
      return;
    }

    counts.set(key, {
      label: normalizedLabel,
      category,
      count: 1,
      kind,
      tone
    });
  }

  for (const entry of entries) {
    entry.analysis.personal_keywords.forEach((item) => register(item, "Personal language", "keyword", "topic"));
    entry.analysis.recurring_topics.forEach((item) => register(item, "Recurring topic", "topic", "topic"));
    entry.analysis.restorative_signals.forEach((item) => register(item, "Restorative signal", "restorative", "restorative"));
    entry.analysis.stressors.forEach((item) => register(item.label, formatCategoryLabel(item.category), "stressor", "stress"));
    entry.analysis.supports.forEach((item) => register(item.label, formatCategoryLabel(item.category), "support", "support"));
  }

  return Array.from(counts.values())
    .filter((item) => item.count >= 2)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 8);
}

function buildRestorativeInsights(entries: JournalRecord[]): RestorativeInsight[] {
  const improvedEntries = entries.filter((entry) => {
    const { analysis } = entry;
    return (
      analysis.emotional_shift.direction === "improved" ||
      analysis.energy_direction === "restorative" ||
      (analysis.coping_actions.some((action) => action.impact === "helpful") && (analysis.user_mood ?? analysis.mood_score) >= 6)
    );
  });

  const copingCounts = new Map<string, number>();
  const themeCounts = new Map<string, number>();
  const emotionPairs = new Map<string, number>();

  for (const entry of improvedEntries) {
    for (const action of entry.analysis.coping_actions) {
      if (action.impact === "helpful") {
        copingCounts.set(action.action, (copingCounts.get(action.action) ?? 0) + 1);
      }
    }

    for (const theme of entry.analysis.themes) {
      themeCounts.set(theme, (themeCounts.get(theme) ?? 0) + 1);
    }

    const pair = `${entry.analysis.emotional_shift.start_state} -> ${entry.analysis.emotional_shift.end_state}`;
    emotionPairs.set(pair, (emotionPairs.get(pair) ?? 0) + 1);
  }

  const topCoping = Array.from(copingCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const topThemes = Array.from(themeCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const topPairs = Array.from(emotionPairs.entries()).sort((a, b) => b[1] - a[1]).slice(0, 2);

  const insights: RestorativeInsight[] = [];

  if (topCoping.length > 0) {
    insights.push({
      title: "Helpful actions that tend to coincide with steadier outcomes",
      description: `Across the demo entries, ${topCoping.map(([action]) => action).join(", ")} show up most often when the emotional direction improves or feels more restorative.`,
      supportingSignals: topCoping.map(([action, count]) => `${action} appears in ${count} restorative ${count === 1 ? "entry" : "entries"}`)
    });
  }

  if (topThemes.length > 0) {
    insights.push({
      title: "Themes that appear around recovery",
      description: `A few themes repeat when the tone becomes more manageable: ${topThemes.map(([theme]) => theme).join(", ")}.`,
      supportingSignals: topThemes.map(([theme, count]) => `${theme} appears ${count} ${count === 1 ? "time" : "times"}`)
    });
  }

  if (topPairs.length > 0) {
    insights.push({
      title: "Common shifts in emotional direction",
      description: "Some entries suggest a repeated arc from pressure toward steadier states, helping showcase how Atlas Journal surfaces change over time.",
      supportingSignals: topPairs.map(([pair, count]) => `${pair} appears in ${count} ${count === 1 ? "entry" : "entries"}`)
    });
  }

  return insights;
}

function collectPatternSignals(entry: JournalRecord) {
  return [
    ...entry.analysis.stressors.map((item) => ({
      label: item.label,
      kind: "stressor" as const,
      tone: "stress" as const
    })),
    ...entry.analysis.supports.map((item) => ({
      label: item.label,
      kind: "support" as const,
      tone: "support" as const
    })),
    ...entry.analysis.coping_actions.map((item) => ({
      label: item.action,
      kind: "coping" as const,
      tone: item.impact === "helpful" ? ("support" as const) : ("topic" as const)
    })),
    ...entry.analysis.restorative_signals.map((item) => ({
      label: item,
      kind: "restorative" as const,
      tone: "restorative" as const
    })),
    ...entry.analysis.themes.map((item) => ({
      label: item,
      kind: "theme" as const,
      tone: "topic" as const
    })),
    ...entry.analysis.personal_keywords.map((item) => ({
      label: item,
      kind: "keyword" as const,
      tone: "topic" as const
    }))
  ];
}

function buildEntryPatternContext(entry: JournalRecord, allEntries: JournalRecord[]): EntryPatternContext {
  const currentLabels = new Set(collectPatternSignals(entry).map((item) => item.label.toLowerCase()));
  const otherEntries = allEntries.filter((candidate) => candidate.id !== entry.id);
  const now = new Date(`${entry.entry_date}T00:00:00`);
  const cutoffs = {
    d7: subtractDays(now, 7),
    d30: subtractDays(now, 30),
    d90: subtractDays(now, 90)
  };

  const aggregate = new Map<
    string,
    {
      label: string;
      kindCounts: Record<PatternContextItem["kind"], number>;
      toneCounts: Record<PatternContextItem["tone"], number>;
      d7: number;
      d30: number;
      d90: number;
    }
  >();

  for (const candidate of otherEntries) {
    const candidateDate = new Date(`${candidate.entry_date}T00:00:00`);

    for (const signal of collectPatternSignals(candidate)) {
      if (!currentLabels.has(signal.label.toLowerCase())) {
        continue;
      }

      const key = signal.label.toLowerCase();
      const existing =
        aggregate.get(key) ??
        {
          label: signal.label,
          kindCounts: { theme: 0, keyword: 0, stressor: 0, support: 0, coping: 0, restorative: 0 },
          toneCounts: { stress: 0, support: 0, mixed: 0, topic: 0, restorative: 0 },
          d7: 0,
          d30: 0,
          d90: 0
        };

      existing.kindCounts[signal.kind] += 1;
      existing.toneCounts[signal.tone] += 1;
      if (candidateDate >= cutoffs.d7) existing.d7 += 1;
      if (candidateDate >= cutoffs.d30) existing.d30 += 1;
      if (candidateDate >= cutoffs.d90) existing.d90 += 1;

      aggregate.set(key, existing);
    }
  }

  const items: PatternContextItem[] = Array.from(aggregate.values())
    .map((item) => {
      const kinds = Object.entries(item.kindCounts).sort((a, b) => b[1] - a[1]);
      const tones = Object.entries(item.toneCounts).sort((a, b) => b[1] - a[1]);
      const topKind = (kinds[0]?.[0] as PatternContextItem["kind"]) ?? "theme";
      const topTone = (tones[0]?.[0] as PatternContextItem["tone"]) ?? "topic";
      const hasStressAndSupport = item.toneCounts.stress > 0 && item.toneCounts.support > 0;

      return {
        label: item.label,
        kind: topKind,
        tone: hasStressAndSupport ? ("mixed" as const) : topTone,
        tier:
          hasStressAndSupport
            ? ("mixed" as const)
            : item.d30 >= 4 || item.d90 >= 6
              ? ("established" as const)
              : item.d7 >= 2 || item.d30 >= 2
                ? ("active" as const)
                : ("emerging" as const),
        relation:
          hasStressAndSupport
            ? ("mixed role" as const)
            : item.d7 > 0 && item.d30 <= 1 && item.d90 >= 3
              ? ("shifting" as const)
              : ("stable" as const),
        counts: {
          d7: item.d7,
          d30: item.d30,
          d90: item.d90
        }
      };
    })
    .filter((item) => item.counts.d90 >= 2)
    .sort((a, b) => b.counts.d30 - a.counts.d30 || b.counts.d90 - a.counts.d90 || a.label.localeCompare(b.label))
    .slice(0, 6);

  return {
    items,
    windows: {
      short: "7d",
      main: "30d",
      long: "90d"
    }
  };
}

function buildArchiveItems(entries: JournalRecord[]): ArchiveListItem[] {
  return entries.map((entry) => ({
    id: entry.id,
    entry_date: entry.entry_date,
    summary: entry.analysis.summary,
    preview: entry.analysis.raw_text.slice(0, 160).trim(),
    primary_emotion: entry.analysis.primary_emotion,
    themes: entry.analysis.themes,
    tags: Array.from(new Set([...entry.analysis.themes, ...entry.analysis.reflection_tags])),
    search_terms: Array.from(
      new Set([
        ...entry.analysis.themes,
        ...entry.analysis.reflection_tags,
        ...entry.analysis.recurring_topics,
        ...entry.analysis.personal_keywords,
        ...entry.analysis.supports.map((item) => item.label),
        ...entry.analysis.stressors.map((item) => item.label)
      ])
    ),
    energy_direction: entry.analysis.energy_direction
  }));
}

export function getEmotionColor(emotion: string) {
  const key = emotion.toLowerCase();

  if (["proud", "capable", "connected", "hopeful", "relieved", "calmer"].includes(key)) {
    return "#5dd2c1";
  }

  if (["overwhelmed", "anxious", "tense", "uneasy", "stressed"].includes(key)) {
    return "#f2a84b";
  }

  if (["drained", "tired", "heavy", "slow"].includes(key)) {
    return "#7db2ff";
  }

  return "#c68cff";
}

export function getDemoEmotionCloud(entries: JournalRecord[]) {
  const counts = new Map<string, number>();

  for (const entry of entries) {
    counts.set(entry.analysis.primary_emotion, (counts.get(entry.analysis.primary_emotion) ?? 0) + 1);

    for (const emotion of entry.analysis.secondary_emotions) {
      counts.set(emotion, (counts.get(emotion) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([emotion, count]) => ({
      emotion,
      count,
      color: getEmotionColor(emotion)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 16);
}

export async function getDemoEntries() {
  return [...demoDatabase.entries].sort((a, b) => b.entry_date.localeCompare(a.entry_date));
}

export async function getDemoEntryById(id: string) {
  const entries = await getDemoEntries();
  return entries.find((entry) => entry.id === id) ?? null;
}

export async function getDemoEntryWithPatternContext(id: string) {
  const entries = await getDemoEntries();
  const entry = entries.find((item) => item.id === id) ?? null;

  if (!entry) {
    return null;
  }

  return {
    entry,
    patternContext: buildEntryPatternContext(entry, entries)
  };
}

export async function getDemoArchiveEntries() {
  const entries = await getDemoEntries();
  return buildArchiveItems(entries);
}

export async function getDemoDashboardData(range: TimeRange = "all") {
  const allEntries = await getDemoEntries();
  return buildDemoDashboardData(allEntries, range);
}

export function buildDemoDashboardData(allEntries: JournalRecord[], range: TimeRange = "all") {
  const entries = filterEntriesByRange(allEntries, range);

  const emotionCounts = new Map<string, number>();
  const triggerCounts = new Map<string, number>();

  const emotionTrends: EmotionTrendDatum[] = [];
  const energyPatterns: EnergyPatternDatum[] = [];

  for (const entry of [...entries].reverse()) {
    emotionCounts.set(entry.analysis.primary_emotion, (emotionCounts.get(entry.analysis.primary_emotion) ?? 0) + 1);

    for (const signal of getBroadStressSignals(entry)) {
      triggerCounts.set(signal, (triggerCounts.get(signal) ?? 0) + 1);
    }

    emotionTrends.push({
      date: entry.entry_date,
      mood_score: entry.analysis.user_mood ?? entry.analysis.mood_score,
      stress_level: entry.analysis.user_stress ?? entry.analysis.stress_level,
      primary_emotion: entry.analysis.primary_emotion
    });

    energyPatterns.push({
      date: entry.entry_date,
      energy_level: entry.analysis.user_energy ?? entry.analysis.energy_level
    });
  }

  const triggerSources: TriggerFrequencyDatum[] = Array.from(triggerCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  const recurringEmotions = Array.from(emotionCounts.entries())
    .map(([emotion, count]) => ({ emotion, count }))
    .sort((a, b) => b.count - a.count);

  return {
    range,
    allEntriesCount: allEntries.length,
    entries,
    emotionTrends,
    triggerSources,
    energyPatterns,
    recurringEmotions,
    emergingSignals: buildEmergingSignals(entries),
    emotionCloud: getDemoEmotionCloud(entries),
    restorativeInsights: buildRestorativeInsights(entries),
    reminderSnapshot: buildReminderSnapshot(allEntries)
  };
}
