import { createClient } from "@/lib/supabase/server";
import { buildReminderSnapshot } from "@/lib/nudges";
import {
  confidenceSchema,
  copingActionSchema,
  emotionalShiftSchema,
  journalAnalysisSchema,
  sentimentSchema,
  triggerSchema
} from "@/lib/schema";
import type {
  ArchiveListItem,
  EmotionTrendDatum,
  EnergyPatternDatum,
  JournalAnalysis,
  JournalRecord,
  RestorativeInsight,
  TimeRange,
  TriggerFrequencyDatum
} from "@/types/journal";

type JournalEntryRow = {
  id: string;
  user_id: string;
  entry_date: string;
  created_at: string;
  analysis: unknown;
};

function collectValidItems<T>(items: unknown, parser: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } }) {
  if (!Array.isArray(items)) {
    return [] as T[];
  }

  const valid: T[] = [];

  for (const item of items) {
    const result = parser.safeParse(item);
    if (result.success) {
      valid.push(result.data);
    }
  }

  return valid;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.round(value)));
}

function sanitizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function inferEnergyDirection(analysis: Record<string, unknown>): JournalAnalysis["energy_direction"] {
  const existing = analysis.energy_direction;

  if (existing === "draining" || existing === "restorative" || existing === "mixed" || existing === "neutral") {
    return existing;
  }

  const emotionalShift = typeof analysis.emotional_shift === "object" && analysis.emotional_shift ? analysis.emotional_shift : {};
  const direction = (emotionalShift as Record<string, unknown>).direction;
  const copingActions = Array.isArray(analysis.coping_actions) ? analysis.coping_actions : [];
  const energyLevel = clampNumber(analysis.energy_level, 1, 10, 5);
  const moodScore = clampNumber(analysis.mood_score, 1, 10, 5);

  if (energyLevel <= 3) {
    return "draining";
  }

  if (direction === "improved") {
    return "restorative";
  }

  if (direction === "mixed" || (copingActions.length > 0 && moodScore >= 6)) {
    return "mixed";
  }

  return "neutral";
}

function normalizeAnalysis(input: unknown): JournalAnalysis | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const analysis = input as Record<string, unknown>;

  const normalized: JournalAnalysis = {
    raw_text: typeof analysis.raw_text === "string" ? analysis.raw_text : "",
    summary: typeof analysis.summary === "string" ? analysis.summary : "",
    primary_emotion: typeof analysis.primary_emotion === "string" ? analysis.primary_emotion : "reflective",
    secondary_emotions: sanitizeStringArray(analysis.secondary_emotions),
    joy_sources: sanitizeStringArray(analysis.joy_sources),
    gratitude_moments: sanitizeStringArray(analysis.gratitude_moments),
    wins: sanitizeStringArray(analysis.wins),
    what_to_repeat: sanitizeStringArray(analysis.what_to_repeat),
    triggers: collectValidItems(analysis.triggers, triggerSchema),
    coping_actions: collectValidItems(analysis.coping_actions, copingActionSchema),
    sentiment: sentimentSchema
      .catch({
        label: "neutral",
        score: 0
      })
      .parse(analysis.sentiment),
    mood_score: clampNumber(analysis.mood_score, 1, 10, 5),
    stress_level: clampNumber(analysis.stress_level, 1, 10, 5),
    energy_level: clampNumber(analysis.energy_level, 1, 10, 5),
    energy_direction: inferEnergyDirection(analysis),
    emotional_shift: emotionalShiftSchema
      .catch({
        start_state: "unclear",
        end_state: "unclear",
        direction: "unchanged"
      })
      .parse(analysis.emotional_shift),
    themes: sanitizeStringArray(analysis.themes),
    notable_phrases: sanitizeStringArray(analysis.notable_phrases),
    reflection_tags: sanitizeStringArray(analysis.reflection_tags),
    confidence: confidenceSchema
      .catch({
        primary_emotion: 0.5,
        triggers: 0.5,
        coping_actions: 0.5,
        overall: 0.5
      })
      .parse(analysis.confidence)
  };

  const parsed = journalAnalysisSchema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
}

function normalizeRecord(input: unknown): JournalRecord | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const record = input as Record<string, unknown>;
  const analysis = normalizeAnalysis(record.analysis);

  if (!analysis) {
    return null;
  }

  const entryDate =
    typeof record.entry_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(record.entry_date)
      ? record.entry_date
      : new Date().toISOString().slice(0, 10);

  const createdAt =
    typeof record.created_at === "string" && !Number.isNaN(Date.parse(record.created_at))
      ? new Date(record.created_at).toISOString()
      : new Date().toISOString();

  return {
    id: typeof record.id === "string" && record.id.length > 0 ? record.id : `entry_${Date.now()}`,
    entry_date: entryDate,
    created_at: createdAt,
    analysis
  };
}

async function getScopedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!user) {
    throw new Error("Authentication required.");
  }

  return { supabase, user };
}

function mapRowsToRecords(rows: JournalEntryRow[] | null | undefined) {
  if (!rows) {
    return [] as JournalRecord[];
  }

  return rows.map(normalizeRecord).filter((entry): entry is JournalRecord => entry !== null);
}

async function fetchEntriesForUser() {
  const { supabase, user } = await getScopedClient();
  const { data, error } = await supabase
    .from("journal_entries")
    .select("id, user_id, entry_date, created_at, analysis")
    .eq("user_id", user.id)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load journal entries: ${error.message}`);
  }

  return mapRowsToRecords((data ?? []) as JournalEntryRow[]);
}

export async function getEntries() {
  return fetchEntriesForUser();
}

export async function saveEntry(analysis: JournalAnalysis, entryDate: string) {
  const { supabase, user } = await getScopedClient();
  const createdAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("journal_entries")
    .insert({
      user_id: user.id,
      entry_date: entryDate,
      created_at: createdAt,
      analysis
    })
    .select("id, user_id, entry_date, created_at, analysis")
    .single();

  if (error) {
    throw new Error(`Unable to save journal entry: ${error.message}`);
  }

  const normalized = normalizeRecord(data);

  if (!normalized) {
    throw new Error("Saved journal entry did not match the expected record shape.");
  }

  return normalized;
}

export async function updateEntry(id: string, updates: { analysis: JournalAnalysis; entry_date: string }) {
  const { supabase, user } = await getScopedClient();
  const { data, error } = await supabase
    .from("journal_entries")
    .update({
      entry_date: updates.entry_date,
      analysis: updates.analysis
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, user_id, entry_date, created_at, analysis")
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to update journal entry: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const normalized = normalizeRecord(data);

  if (!normalized) {
    throw new Error("Updated journal entry did not match the expected record shape.");
  }

  return normalized;
}

export async function deleteEntry(id: string) {
  const { supabase, user } = await getScopedClient();
  const { data, error } = await supabase
    .from("journal_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to delete journal entry: ${error.message}`);
  }

  return Boolean(data);
}

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
      description: `Across the entries in this range, ${topCoping.map(([action]) => action).join(", ")} show up most often when the emotional direction improves or feels more restorative.`,
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
      description: "Some entries suggest a repeated arc from strain toward steadier states, which may be worth noticing with curiosity rather than pressure.",
      supportingSignals: topPairs.map(([pair, count]) => `${pair} appears in ${count} ${count === 1 ? "entry" : "entries"}`)
    });
  }

  if (insights.length === 0) {
    insights.push({
      title: "Patterns will become clearer with more entries",
      description: "There is not enough restorative signal in the current range to make a grounded pattern claim yet, but the archive is ready to surface it as more entries accumulate.",
      supportingSignals: ["Try comparing a longer time range to widen the sample."]
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

export async function getEntryById(id: string) {
  const { supabase, user } = await getScopedClient();
  const { data, error } = await supabase
    .from("journal_entries")
    .select("id, user_id, entry_date, created_at, analysis")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load journal entry: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return normalizeRecord(data);
}

export async function getArchiveEntries() {
  const entries = await getEntries();
  return buildArchiveItems(entries);
}

export async function getDashboardData(range: TimeRange = "all") {
  const allEntries = await getEntries();
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
    restorativeInsights: buildRestorativeInsights(entries),
    reminderSnapshot: buildReminderSnapshot(allEntries)
  };
}
