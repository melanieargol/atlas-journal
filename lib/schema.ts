import { z } from "zod";

export const sentimentSchema = z.object({
  label: z.enum(["positive", "neutral", "negative", "mixed"]),
  score: z.number().min(-1).max(1)
});

export const optionalCheckInSchema = z.number().int().min(1).max(10).nullable().default(null);

export const defaultSafetyAssessment: {
  level: "none" | "low" | "moderate" | "high";
  concerns: string[];
  evidence: string[];
  recommended_action: string;
} = {
  level: "none",
  concerns: [],
  evidence: [],
  recommended_action: ""
};

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

export const stressorSchema = z.object({
  label: z.string().min(1),
  category: z.string().min(1),
  evidence: z.string().min(1),
  intensity: z.number().int().min(1).max(10)
});

export const supportSchema = z.object({
  label: z.string().min(1),
  category: z.string().min(1),
  evidence: z.string().min(1),
  impact: z.enum(["helpful", "grounding", "energizing", "validating", "mixed"])
});

export const evidenceSpanSchema = z.object({
  text: z.string().min(1),
  type: z.enum(["emotion", "stressor", "support", "coping", "restorative", "topic", "keyword", "safety"]),
  label: z.string().min(1)
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

export const safetyAssessmentSchema = z.object({
  level: z.enum(["none", "low", "moderate", "high"]),
  concerns: z.array(z.string()).default([]),
  evidence: z.array(z.string()).default([]),
  recommended_action: z.string().default("")
});

export const journalAnalysisSchema = z
  .object({
    raw_text: z.string().min(1),
    summary: z.string().min(1),
    primary_emotion: z.string().min(1),
    secondary_emotions: z.array(z.string()).default([]),
    custom_emotion_terms: z.array(z.string()).default([]),
    joy_sources: z.array(z.string()).default([]),
    gratitude_moments: z.array(z.string()).default([]),
    wins: z.array(z.string()).default([]),
    what_to_repeat: z.array(z.string()).default([]),
    triggers: z.array(triggerSchema).default([]),
    stressors: z.array(stressorSchema).default([]),
    coping_actions: z.array(copingActionSchema).default([]),
    supports: z.array(supportSchema).default([]),
    sentiment: sentimentSchema,
    user_mood: optionalCheckInSchema,
    user_stress: optionalCheckInSchema,
    user_energy: optionalCheckInSchema,
    mood_score: z.number().int().min(1).max(10),
    stress_level: z.number().int().min(1).max(10),
    energy_level: z.number().int().min(1).max(10),
    energy_direction: z.enum(["draining", "restorative", "mixed", "neutral"]),
    emotional_shift: emotionalShiftSchema,
    themes: z.array(z.string()).default([]),
    recurring_topics: z.array(z.string()).default([]),
    personal_keywords: z.array(z.string()).default([]),
    notable_entities: z.array(z.string()).default([]),
    restorative_signals: z.array(z.string()).default([]),
    evidence_spans: z.array(evidenceSpanSchema).default([]),
    notable_phrases: z.array(z.string()).default([]),
    reflection_tags: z.array(z.string()).default([]),
    confidence: confidenceSchema,
    safety_assessment: safetyAssessmentSchema.default(defaultSafetyAssessment)
  })
  .strict();

export const analyzeEntryInputSchema = z.object({
  raw_text: z.string().min(20, "Write a little more so Atlas Journal has enough context to analyze."),
  entry_date: z.string().date().optional(),
  user_mood: optionalCheckInSchema.optional(),
  user_stress: optionalCheckInSchema.optional(),
  user_energy: optionalCheckInSchema.optional()
});

export const demoAnalyzeEntryInputSchema = z.object({
  raw_text: z
    .string()
    .min(20, "Write a little more so Atlas Journal has enough context to analyze.")
    .max(3000, "Demo entries are limited to 3,000 characters so the sandbox stays quick and private."),
  user_mood: optionalCheckInSchema.optional(),
  user_stress: optionalCheckInSchema.optional(),
  user_energy: optionalCheckInSchema.optional()
});

export const updateEntryInputSchema = z.object({
  raw_text: z.string().min(20, "Write a little more so Atlas Journal has enough context to analyze."),
  entry_date: z.string().date(),
  reanalyze: z.boolean().optional(),
  user_mood: optionalCheckInSchema.optional(),
  user_stress: optionalCheckInSchema.optional(),
  user_energy: optionalCheckInSchema.optional()
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
