import { z } from "zod";

export const sentimentSchema = z.object({
  label: z.enum(["positive", "neutral", "negative", "mixed"]),
  score: z.number().min(-1).max(1)
});

export const triggerSchema = z.object({
  type: z.enum([
    "relationship",
    "work",
    "finance",
    "family",
    "self-worth",
    "health",
    "environment",
    "uncertainty",
    "grief",
    "conflict",
    "other"
  ]),
  description: z.string().min(1)
});

export const copingActionSchema = z.object({
  action: z.string().min(1),
  impact: z.enum(["helpful", "neutral", "harmful", "unclear"])
});

export const emotionalShiftSchema = z.object({
  start_state: z.string().min(1),
  end_state: z.string().min(1),
  direction: z.enum(["improved", "worsened", "unchanged", "mixed"])
});

export const confidenceSchema = z.object({
  primary_emotion: z.number().min(0).max(1),
  triggers: z.number().min(0).max(1),
  coping_actions: z.number().min(0).max(1),
  overall: z.number().min(0).max(1)
});

export const journalAnalysisSchema = z
  .object({
    raw_text: z.string().min(1),
    summary: z.string().min(1),
    primary_emotion: z.string().min(1),
    secondary_emotions: z.array(z.string()),
    joy_sources: z.array(z.string()),
    gratitude_moments: z.array(z.string()),
    wins: z.array(z.string()),
    what_to_repeat: z.array(z.string()),
    triggers: z.array(triggerSchema),
    coping_actions: z.array(copingActionSchema),
    sentiment: sentimentSchema,
    mood_score: z.number().int().min(1).max(10),
    stress_level: z.number().int().min(1).max(10),
    energy_level: z.number().int().min(1).max(10),
    energy_direction: z.enum(["draining", "restorative", "mixed", "neutral"]),
    emotional_shift: emotionalShiftSchema,
    themes: z.array(z.string()),
    notable_phrases: z.array(z.string()),
    reflection_tags: z.array(z.string()),
    confidence: confidenceSchema
  })
  .strict();

export const analyzeEntryInputSchema = z.object({
  raw_text: z.string().min(20, "Write a little more so Atlas Journal has enough context to analyze."),
  entry_date: z.string().date().optional()
});

export const updateEntryInputSchema = z.object({
  raw_text: z.string().min(20, "Write a little more so Atlas Journal has enough context to analyze."),
  entry_date: z.string().date(),
  reanalyze: z.boolean().optional()
});

export const journalRecordSchema = z.object({
  id: z.string().min(1),
  entry_date: z.string().date(),
  created_at: z.string().datetime(),
  analysis: journalAnalysisSchema
});

export const journalDatabaseSchema = z.object({
  entries: z.array(journalRecordSchema)
});
