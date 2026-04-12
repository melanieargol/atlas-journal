import { z } from "zod";

import { analyzeEntryInputSchema, journalAnalysisSchema, journalRecordSchema } from "@/lib/schema";

export type AnalyzeEntryInput = z.infer<typeof analyzeEntryInputSchema>;
export type JournalAnalysis = z.infer<typeof journalAnalysisSchema>;
export type JournalRecord = z.infer<typeof journalRecordSchema>;
export type TimeRange = "7d" | "30d" | "90d" | "all";

export type EmotionTrendDatum = {
  date: string;
  mood_score: number;
  stress_level: number;
  primary_emotion: string;
};

export type TriggerFrequencyDatum = {
  label: string;
  count: number;
};

export type EnergyPatternDatum = {
  date: string;
  energy_level: number;
};

export type ArchiveListItem = {
  id: string;
  entry_date: string;
  summary: string;
  preview: string;
  primary_emotion: string;
  themes: string[];
  energy_direction: JournalAnalysis["energy_direction"];
};

export type RestorativeInsight = {
  title: string;
  description: string;
  supportingSignals: string[];
};

export type NudgeItem = {
  id: string;
  label: string;
  message: string;
};

export type ReminderSnapshot = {
  daysSinceLastEntry: number | null;
  entriesInLast7Days: number;
  recentReflectionLiftRatio: number;
  nudges: NudgeItem[];
};

export type RepeatedSignal = {
  label: string;
  category: string;
  count: number;
  kind: "keyword" | "stressor" | "support" | "topic" | "restorative";
  tone: "stress" | "support" | "topic" | "restorative";
};
