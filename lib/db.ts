import { createClient } from "@/lib/supabase/server";
import { buildReminderSnapshot } from "@/lib/nudges";
import {
  confidenceSchema,
  copingActionSchema,
  defaultSafetyAssessment,
  emotionalShiftSchema,
  evidenceSpanSchema,
  journalAnalysisSchema,
  safetyAssessmentSchema,
  sentimentSchema,
  stressorSchema,
  supportSchema,
  triggerSchema
} from "@/lib/schema";
import type {
  ArchiveListItem,
  EntryPatternContext,
  EmotionTrendDatum,
  EnergyPatternDatum,
  JournalAnalysis,
  JournalRecord,
  PatternContextItem,
  RepeatedSignal,
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
  return Array.isArray(value) ? Array.from(new Set(value.filter((item): item is string => typeof item === "string"))) : [];
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

function formatCategoryLabel(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function deriveStressors(
  analysis: Record<string, unknown>,
  triggers: JournalAnalysis["triggers"]
): JournalAnalysis["stressors"] {
  const stressors = collectValidItems(analysis.stressors, stressorSchema);

  if (stressors.length > 0) {
    return stressors;
  }

  return triggers.map((trigger) => ({
    label: trigger.description,
    category: trigger.type,
    evidence: trigger.description,
    intensity: clampNumber(analysis.stress_level, 1, 10, 5)
  }));
}

function deriveSupports(
  analysis: Record<string, unknown>,
  copingActions: JournalAnalysis["coping_actions"]
): JournalAnalysis["supports"] {
  const supports = collectValidItems(analysis.supports, supportSchema);

  if (supports.length > 0) {
    return supports;
  }

  return copingActions
    .filter((action) => action.impact === "helpful")
    .map((action) => ({
      label: action.action,
      category: "routine",
      evidence: action.action,
      impact: "helpful" as const
    }));
}

function deriveEvidenceSpans(
  analysis: Record<string, unknown>,
  customEmotionTerms: string[],
  stressors: JournalAnalysis["stressors"],
  supports: JournalAnalysis["supports"],
  recurringTopics: string[],
  safetyAssessment: JournalAnalysis["safety_assessment"]
): JournalAnalysis["evidence_spans"] {
  const evidenceSpans = collectValidItems(analysis.evidence_spans, evidenceSpanSchema);

  if (evidenceSpans.length > 0) {
    return evidenceSpans;
  }

  return [
    ...customEmotionTerms.slice(0, 3).map((term) => ({
      text: term,
      type: "emotion" as const,
      label: term
    })),
    ...stressors.slice(0, 3).map((item) => ({
      text: item.evidence,
      type: "stressor" as const,
      label: item.label
    })),
    ...supports.slice(0, 3).map((item) => ({
      text: item.evidence,
      type: "support" as const,
      label: item.label
    })),
    ...recurringTopics.slice(0, 3).map((topic) => ({
      text: topic,
      type: "topic" as const,
      label: topic
    })),
    ...safetyAssessment.evidence.slice(0, 2).map((item) => ({
      text: item,
      type: "safety" as const,
      label: "safety"
    }))
  ];
}

function normalizeAnalysis(input: unknown): JournalAnalysis | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const analysis = input as Record<string, unknown>;
  const triggers = collectValidItems(analysis.triggers, triggerSchema);
  const copingActions = collectValidItems(analysis.coping_actions, copingActionSchema);
  const customEmotionTerms = sanitizeStringArray(analysis.custom_emotion_terms);
  const recurringTopics = sanitizeStringArray(analysis.recurring_topics);
  const safetyAssessment = safetyAssessmentSchema.catch(defaultSafetyAssessment).parse(analysis.safety_assessment);
  const stressors = deriveStressors(analysis, triggers);
  const supports = deriveSupports(analysis, copingActions);
  const restorativeSignals = sanitizeStringArray(analysis.restorative_signals);
  const personalKeywords = sanitizeStringArray(analysis.personal_keywords);
  const notableEntities = sanitizeStringArray(analysis.notable_entities);

  const normalized: JournalAnalysis = {
    raw_text: typeof analysis.raw_text === "string" ? analysis.raw_text : "",
    summary: typeof analysis.summary === "string" ? analysis.summary : "",
    primary_emotion: typeof analysis.primary_emotion === "string" ? analysis.primary_emotion : "reflective",
    secondary_emotions: sanitizeStringArray(analysis.secondary_emotions),
    custom_emotion_terms: customEmotionTerms,
    joy_sources: sanitizeStringArray(analysis.joy_sources),
    gratitude_moments: sanitizeStringArray(analysis.gratitude_moments),
    wins: sanitizeStringArray(analysis.wins),
    what_to_repeat: sanitizeStringArray(analysis.what_to_repeat),
    triggers,
    stressors,
    coping_actions: copingActions,
    supports,
    sentiment: sentimentSchema
      .catch({
        label: "neutral",
        score: 0
      })
      .parse(analysis.sentiment),
    user_mood: analysis.user_mood === null ? null : typeof analysis.user_mood === "number" ? clampNumber(analysis.user_mood, 1, 10, 5) : null,
    user_stress: analysis.user_stress === null ? null : typeof analysis.user_stress === "number" ? clampNumber(analysis.user_stress, 1, 10, 5) : null,
    user_energy: analysis.user_energy === null ? null : typeof analysis.user_energy === "number" ? clampNumber(analysis.user_energy, 1, 10, 5) : null,
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
    recurring_topics: recurringTopics.length > 0 ? recurringTopics : sanitizeStringArray(analysis.themes),
    personal_keywords:
      personalKeywords.length > 0
        ? personalKeywords
        : Array.from(
            new Set([
              ...stressors.map((item) => item.label),
              ...supports.map((item) => item.label),
              ...sanitizeStringArray(analysis.notable_phrases)
            ])
          ).slice(0, 8),
    notable_entities:
      notableEntities.length > 0
        ? notableEntities
        : Array.from(new Set([...stressors.map((item) => item.label), ...supports.map((item) => item.label)])).slice(0, 8),
    restorative_signals:
      restorativeSignals.length > 0
        ? restorativeSignals
        : Array.from(new Set([...sanitizeStringArray(analysis.what_to_repeat), ...supports.map((item) => item.label)])).slice(0, 8),
    evidence_spans: deriveEvidenceSpans(
      analysis,
      customEmotionTerms,
      stressors,
      supports,
      recurringTopics.length > 0 ? recurringTopics : sanitizeStringArray(analysis.themes),
      safetyAssessment
    ),
    notable_phrases: sanitizeStringArray(analysis.notable_phrases),
    reflection_tags: sanitizeStringArray(analysis.reflection_tags),
    confidence: confidenceSchema
      .catch({
        primary_emotion: 0.5,
        triggers: 0.5,
        coping_actions: 0.5,
        overall: 0.5
      })
      .parse(analysis.confidence),
    safety_assessment: safetyAssessment
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
      analysis,
      raw_text: analysis.raw_text
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
      analysis: updates.analysis,
      raw_text: updates.analysis.raw_text
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
      const total = item.d90;
      const kinds = Object.entries(item.kindCounts).sort((a, b) => b[1] - a[1]);
      const tones = Object.entries(item.toneCounts).sort((a, b) => b[1] - a[1]);
      const topKind = (kinds[0]?.[0] as PatternContextItem["kind"]) ?? "theme";
      const topTone = (tones[0]?.[0] as PatternContextItem["tone"]) ?? "topic";
      const hasStressAndSupport = item.toneCounts.stress > 0 && item.toneCounts.support > 0;

      const tier: PatternContextItem["tier"] =
        hasStressAndSupport
          ? "mixed"
          : item.d30 >= 4 || item.d90 >= 6
            ? "established"
            : item.d7 >= 2 || item.d30 >= 2
              ? "active"
              : "emerging";

      const relation: PatternContextItem["relation"] =
        hasStressAndSupport
          ? "mixed role"
          : item.d7 > 0 && item.d30 <= 1 && item.d90 >= 3
            ? "shifting"
            : "stable";

      return {
        label: item.label,
        kind: topKind,
        tone: hasStressAndSupport ? "mixed" : topTone,
        tier,
        relation,
        counts: {
          d7: item.d7,
          d30: item.d30,
          d90: total
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

export async function getEntryWithPatternContext(id: string) {
  const entries = await getEntries();
  const entry = entries.find((item) => item.id === id) ?? null;

  if (!entry) {
    return null;
  }

  return {
    entry,
    patternContext: buildEntryPatternContext(entry, entries)
  };
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
    restorativeInsights: buildRestorativeInsights(entries),
    reminderSnapshot: buildReminderSnapshot(allEntries)
  };
}
