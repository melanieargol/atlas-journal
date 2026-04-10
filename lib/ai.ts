import { promises as fs } from "fs";
import path from "path";

import sampleEntries from "@/data/sampleEntries.json";
import { validateAnalysis } from "@/lib/validators";
import type { JournalAnalysis } from "@/types/journal";

const promptPath = path.join(process.cwd(), "analyzeEntry.prompt.txt");

const mockAnalysis = sampleEntries.entries[0].analysis;

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function buildHeuristicAnalysis(rawText: string): JournalAnalysis {
  const text = rawText.toLowerCase();
  const primaryEmotion = includesAny(text, ["overwhelmed", "anxious", "drained"])
    ? "overwhelmed"
    : includesAny(text, ["tense", "pressure", "stress"])
      ? "tense"
      : includesAny(text, ["tired", "heavy", "sleep"])
        ? "drained"
        : includesAny(text, ["grateful", "relieved", "calm"])
          ? "calm"
          : "reflective";

  const triggers = [
    {
      type: includesAny(text, ["money", "bills", "budget"])
        ? "finance"
        : includesAny(text, ["meeting", "deadline", "work", "manager"])
          ? "work"
          : includesAny(text, ["sleep", "body", "tired"])
            ? "health"
            : includesAny(text, ["family", "mom", "dad", "sister"])
              ? "family"
              : "other",
      description: includesAny(text, ["money", "bills", "budget"])
        ? "Financial pressure appears to be contributing to the entry."
        : includesAny(text, ["meeting", "deadline", "work", "manager"])
          ? "Work demands appear to be shaping the emotional tone."
          : includesAny(text, ["sleep", "body", "tired"])
            ? "Physical strain or fatigue appears to be affecting the day."
            : "The entry suggests a situational stressor, though it is not fully explicit."
    }
  ] as const;

  const copingActions = [
    text.includes("walk")
      ? { action: "went for a walk", impact: "helpful" as const }
      : null,
    text.includes("breathe") || text.includes("breathing")
      ? { action: "used breathing to regulate", impact: "helpful" as const }
      : null,
    text.includes("stretch")
      ? { action: "stretched", impact: "helpful" as const }
      : null,
    text.includes("tea")
      ? { action: "made tea", impact: "helpful" as const }
      : null
  ].filter(Boolean) as JournalAnalysis["coping_actions"];

  const joySources = [
    text.includes("walk") ? "being outside or walking" : null,
    text.includes("dog") ? "time with the dog" : null,
    text.includes("friend") || text.includes("together") ? "meaningful connection" : null,
    text.includes("music") ? "music" : null,
    text.includes("sun") || text.includes("window") ? "light or a calmer environment" : null
  ].filter(Boolean) as string[];

  const gratitudeMoments = [
    text.includes("grateful") ? "a moment of gratitude is named directly" : null,
    text.includes("calmer") || text.includes("better") ? "relief after a harder stretch" : null,
    text.includes("helped") ? "something in the day felt supportive" : null
  ].filter(Boolean) as string[];

  const wins = [
    text.includes("left") ? "noticed discomfort and left the situation" : null,
    text.includes("walk") ? "made space for a regulating activity" : null,
    text.includes("breathe") || text.includes("breathing") ? "paused to regulate before continuing" : null,
    text.includes("stretch") ? "followed through on a small caring routine" : null
  ].filter(Boolean) as string[];

  const whatToRepeat = [
    copingActions.length > 0 ? copingActions[0].action : null,
    joySources[0] ?? null,
    text.includes("helped") ? "the supportive action described in the entry" : null
  ].filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index);

  const positiveWeight = ["calm", "calmer", "grateful", "hopeful", "steady", "better"].filter((word) =>
    text.includes(word)
  ).length;
  const negativeWeight = ["overwhelmed", "anxious", "drained", "sad", "tense", "heavy"].filter((word) =>
    text.includes(word)
  ).length;
  const sentimentScore = clamp((positiveWeight - negativeWeight) * 0.18, -1, 1);

  const phrases = rawText
    .split(/[.!?]/)
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 3);

  return validateAnalysis({
    raw_text: rawText,
    summary:
      sentimentScore < -0.2
        ? "The entry reflects a difficult emotional stretch with limited relief."
        : sentimentScore > 0.2
          ? "The entry shows a steadier emotional tone with signs of recovery."
          : "The entry reflects a mixed emotional pattern with both strain and regulation present.",
    primary_emotion: primaryEmotion,
    secondary_emotions: Array.from(
      new Set(
        ["hopeful", "anxious", "calmer", "self-critical", "tired", "grateful"].filter((word) => text.includes(word))
      )
    ),
    joy_sources: joySources,
    gratitude_moments: gratitudeMoments,
    wins,
    what_to_repeat: whatToRepeat,
    triggers,
    coping_actions: copingActions,
    sentiment: {
      label: positiveWeight > 0 && negativeWeight > 0 ? "mixed" : sentimentScore > 0.2 ? "positive" : sentimentScore < -0.2 ? "negative" : "neutral",
      score: Number(sentimentScore.toFixed(2))
    },
    mood_score: clamp(Math.round(6 + sentimentScore * 4), 1, 10),
    stress_level: clamp(Math.round(5 + negativeWeight), 1, 10),
    energy_level: clamp(text.includes("drained") || text.includes("tired") ? 3 : text.includes("energized") ? 8 : 5, 1, 10),
    energy_direction:
      text.includes("drained") || text.includes("tired")
        ? "draining"
        : copingActions.length > 0 && positiveWeight > 0
          ? "restorative"
          : positiveWeight > 0 && negativeWeight > 0
            ? "mixed"
            : "neutral",
    emotional_shift: {
      start_state: text.includes("hopeful") ? "hopeful" : text.includes("tired") ? "tired" : "tense",
      end_state: text.includes("calm") || text.includes("calmer") ? "calmer" : text.includes("steady") ? "steadier" : primaryEmotion,
      direction: positiveWeight > 0 && negativeWeight > 0 ? "mixed" : sentimentScore > 0.2 ? "improved" : sentimentScore < -0.2 ? "worsened" : "unchanged"
    },
    themes: Array.from(
      new Set([
        triggers[0].type === "other" ? "emotional processing" : `${triggers[0].type} stress`,
        copingActions.length > 0 ? "self-regulation" : "unprocessed tension",
        text.includes("tired") || text.includes("drained") ? "low energy" : "reflection"
      ])
    ),
    notable_phrases: phrases,
    reflection_tags: Array.from(new Set([primaryEmotion, triggers[0].type, copingActions.length > 0 ? "recovery attempt" : "active strain"])),
    confidence: {
      primary_emotion: primaryEmotion === "reflective" ? 0.68 : 0.86,
      triggers: triggers[0].type === "other" ? 0.58 : 0.84,
      coping_actions: copingActions.length > 0 ? 0.9 : 0.54,
      overall: 0.78
    }
  });
}

async function callOpenAI(rawText: string): Promise<{ analysis: JournalAnalysis; mode: "mock" | "openai" }> {
  const prompt = await getPromptText();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { analysis: buildMockAnalysis(rawText), mode: "mock" };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: prompt
        },
        {
          role: "user",
          content: rawText
        }
      ]
    })
  });

  if (!response.ok) {
    return { analysis: buildMockAnalysis(rawText), mode: "mock" };
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  const parsed = typeof content === "string" ? JSON.parse(content) : content;

  return {
    analysis: validateAnalysis(parsed),
    mode: "openai"
  };
}

export async function getPromptText() {
  return fs.readFile(promptPath, "utf8");
}

export function buildMockAnalysis(rawText: string): JournalAnalysis {
  if (rawText.trim().toLowerCase() === mockAnalysis.raw_text.toLowerCase()) {
    return validateAnalysis({
      ...mockAnalysis,
      raw_text: rawText
    });
  }

  return buildHeuristicAnalysis(rawText);
}

export async function analyzeEntry(rawText: string): Promise<{ analysis: JournalAnalysis; mode: "mock" | "openai" }> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      analysis: buildMockAnalysis(rawText),
      mode: "mock"
    };
  }

  return callOpenAI(rawText);
}
