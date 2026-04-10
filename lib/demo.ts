import demoEntries from "@/data/demoEntries.json";
import { buildReminderSnapshot } from "@/lib/nudges";
import { journalDatabaseSchema } from "@/lib/schema";
import type {
  ArchiveListItem,
  EmotionTrendDatum,
  EnergyPatternDatum,
  JournalRecord,
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

function buildRestorativeInsights(entries: JournalRecord[]): RestorativeInsight[] {
  const improvedEntries = entries.filter((entry) => {
    const { analysis } = entry;
    return (
      analysis.emotional_shift.direction === "improved" ||
      analysis.energy_direction === "restorative" ||
      (analysis.coping_actions.some((action) => action.impact === "helpful") && analysis.mood_score >= 6)
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

function buildArchiveItems(entries: JournalRecord[]): ArchiveListItem[] {
  return entries.map((entry) => ({
    id: entry.id,
    entry_date: entry.entry_date,
    summary: entry.analysis.summary,
    preview: entry.analysis.raw_text.slice(0, 160).trim(),
    primary_emotion: entry.analysis.primary_emotion,
    themes: entry.analysis.themes,
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

    for (const trigger of entry.analysis.triggers) {
      triggerCounts.set(trigger.type, (triggerCounts.get(trigger.type) ?? 0) + 1);
    }

    emotionTrends.push({
      date: entry.entry_date,
      mood_score: entry.analysis.mood_score,
      stress_level: entry.analysis.stress_level,
      primary_emotion: entry.analysis.primary_emotion
    });

    energyPatterns.push({
      date: entry.entry_date,
      energy_level: entry.analysis.energy_level
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
    emotionCloud: getDemoEmotionCloud(entries),
    restorativeInsights: buildRestorativeInsights(entries),
    reminderSnapshot: buildReminderSnapshot(allEntries)
  };
}
