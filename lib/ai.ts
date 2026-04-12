import { promises as fs } from "fs";
import path from "path";

import sampleEntries from "@/data/sampleEntries.json";
import { validateAnalysis } from "@/lib/validators";
import type { JournalAnalysis } from "@/types/journal";

const promptPath = path.join(process.cwd(), "analyzeEntry.prompt.txt");

const mockAnalysis = sampleEntries.entries[0].analysis;
const sentenceSplitter = /(?<=[.!?])\s+/;

const emotionLexicon = [
  { label: "overwhelmed", words: ["overwhelmed", "flooded", "too much"], tone: -3 },
  { label: "anxious", words: ["anxious", "nervous", "panicky", "on edge"], tone: -2 },
  { label: "tense", words: ["tense", "pressure", "stressed", "tight"], tone: -2 },
  { label: "angry", words: ["angry", "furious", "rage", "resentful", "hostile"], tone: -3 },
  { label: "frustrated", words: ["frustrated", "annoyed", "irritated"], tone: -2 },
  { label: "drained", words: ["drained", "exhausted", "spent", "wiped"], tone: -2 },
  { label: "sad", words: ["sad", "down", "heavy", "low"], tone: -2 },
  { label: "numb", words: ["numb", "flat", "blank", "shut down"], tone: -2 },
  { label: "grieving", words: ["grief", "grieving", "mourning", "loss"], tone: -3 },
  { label: "ashamed", words: ["ashamed", "embarrassed", "humiliated"], tone: -2 },
  { label: "calm", words: ["calm", "calmer", "settled", "grounded"], tone: 2 },
  { label: "steady", words: ["steady", "steadier", "stable"], tone: 2 },
  { label: "hopeful", words: ["hopeful", "optimistic", "encouraged"], tone: 2 },
  { label: "grateful", words: ["grateful", "thankful", "appreciative"], tone: 2 },
  { label: "relieved", words: ["relieved", "lighter", "eased"], tone: 2 },
  { label: "satisfied", words: ["satisfied", "proud", "accomplished"], tone: 2 },
  { label: "reflective", words: ["reflective", "processing", "thinking through"], tone: 1 }
] as const;

const nonliteralMarkers = [
  "lol",
  "lmao",
  "haha",
  "kidding",
  "dramatic",
  "dramatically",
  "basically died",
  "my villain origin story",
  "chaos goblin",
  "the universe said no",
  "i'm dead",
  "literally died"
];

const conflictMarkers = [
  "yelled",
  "screamed",
  "threatened",
  "threat",
  "fight",
  "fighting",
  "argued",
  "argument",
  "retaliate",
  "retaliation",
  "insult",
  "insulted",
  "hostile",
  "violent",
  "violence",
  "hit",
  "shoved",
  "rage",
  "furious",
  "angry at",
  "wanted to hurt",
  "destroy"
] as const;

const restorativeOutcomeMarkers = [
  "felt calmer",
  "feel calmer",
  "felt better",
  "feel better",
  "felt steadier",
  "feel steadier",
  "felt lighter",
  "feel lighter",
  "helped",
  "grounded",
  "settled",
  "relieved",
  "eased",
  "soothed",
  "reset"
] as const;

const supportIntentMarkers = [
  "to calm down",
  "to clear my head",
  "to reset",
  "to steady myself",
  "to feel better",
  "to take care of myself",
  "to slow down"
] as const;

const likelyIncidentalMovementMarkers = [
  "walked to",
  "drove to",
  "ran to",
  "went to",
  "headed to"
] as const;

const positiveExperienceMarkers = [
  "fun",
  "nice",
  "good",
  "beautiful",
  "laughed",
  "enjoyed",
  "felt good",
  "felt lighter",
  "felt better",
  "comfortable",
  "cozy",
  "easy",
  "relief",
  "relieved",
  "resolved",
  "finally worked",
  "finally got",
  "glad"
] as const;

const accomplishmentMarkers = [
  "finished",
  "completed",
  "got it done",
  "wrapped up",
  "followed through",
  "made progress",
  "crossed off",
  "cleaned",
  "submitted",
  "figured it out",
  "solved"
] as const;

const disruptionMarkers = [
  "weird",
  "off",
  "awkward",
  "uncomfortable",
  "scared",
  "creepy",
  "unsafe",
  "uncertain",
  "unexpected",
  "suddenly",
  "wrong",
  "alarm",
  "disrupted",
  "thrown off",
  "shaken up"
] as const;

const stressorPatterns = [
  { category: "finance", regex: /\brefund call\b/i },
  { category: "finance", regex: /\b(talking about money|talked about money|money conversation|budget|bills?|rent|refund)\b/i },
  { category: "work", regex: /\b(deadline|meeting|work|manager|shift)\b/i },
  { category: "health", regex: /\b(rough night of sleep|didn't sleep|did not sleep|sleep|sick|pain|migraine)\b/i },
  { category: "family", regex: /\b(family|mom|dad|sister|brother|parent)\b/i },
  { category: "conflict", regex: /\b(argument|argued|fight|fighting|yelled|screamed|threatened|insulted|hostile|retaliation)\b/i },
  { category: "relationship", regex: /\b(tone|partner|boyfriend|girlfriend|husband|wife|friend)\b/i },
  { category: "uncertainty", regex: /\b(uncertain|waiting|unknown|not sure|unsettled)\b/i }
] as const;

type SentenceSignal = {
  sentence: string;
  normalized: string;
  positionWeight: number;
  nonliteral: boolean;
  emotionalWeight: number;
  conflict: boolean;
  restorativeCue: boolean;
  centralCue: boolean;
};

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function unique(items: Array<string | null | undefined>) {
  return Array.from(new Set(items.filter((item): item is string => Boolean(item && item.trim())).map((item) => item.trim())));
}

function splitSentences(rawText: string) {
  return rawText
    .split(sentenceSplitter)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function isLikelyNonliteral(sentence: string) {
  const normalized = sentence.toLowerCase();
  return nonliteralMarkers.some((marker) => normalized.includes(marker));
}

function getSentenceSignals(rawText: string): SentenceSignal[] {
  const sentences = splitSentences(rawText);

  return sentences.map((sentence, index) => {
    const normalized = sentence.toLowerCase();
    const hasCentralCue = /(felt|feeling|was|am|after|before|because|helped|steadier|calmer|drained|anxious|overwhelmed|hopeful)/i.test(sentence);
    const positionWeight = index === 0 || index === sentences.length - 1 ? 1.15 : 1;
    const nonliteral = isLikelyNonliteral(sentence);
    const conflict = conflictMarkers.some((marker) => normalized.includes(marker));
    const restorativeCue =
      restorativeOutcomeMarkers.some((marker) => normalized.includes(marker)) ||
      supportIntentMarkers.some((marker) => normalized.includes(marker));

    return {
      sentence,
      normalized,
      positionWeight: hasCentralCue ? positionWeight * 1.1 : positionWeight,
      nonliteral,
      emotionalWeight: nonliteral ? 0.45 : 1,
      conflict,
      restorativeCue,
      centralCue: hasCentralCue
    };
  });
}

function findMatchedText(sentence: string, regex: RegExp) {
  const match = sentence.match(regex);
  return match?.[0]?.trim() ?? "";
}

function hasRestorativeOutcome(sentence: SentenceSignal) {
  return sentence.restorativeCue || /(enjoyed|good to|get some air|clear my head|felt okay again|felt more okay)/i.test(sentence.sentence);
}

function hasNegativeContext(sentence: SentenceSignal) {
  return sentence.conflict || /(annoyed|angry|furious|resentful|threat|harm|insult|lash out|retaliat|shut down)/i.test(sentence.sentence);
}

function hasPositiveExperience(sentence: SentenceSignal) {
  return (
    positiveExperienceMarkers.some((marker) => sentence.normalized.includes(marker)) ||
    accomplishmentMarkers.some((marker) => sentence.normalized.includes(marker)) ||
    /(coffee with|dinner with|lunch with|hung out with|spent time with|went out with|sat with|talked with)/i.test(sentence.sentence)
  );
}

function hasDisruptionSignal(sentence: SentenceSignal) {
  return (
    disruptionMarkers.some((marker) => sentence.normalized.includes(marker)) ||
    /(didn't expect|did not expect|caught me off guard|felt unsafe|felt exposed|something was wrong|something felt wrong|got weird|went wrong|broke down|missed the train|flat tire|car trouble)/i.test(
      sentence.sentence
    )
  );
}

function scoreSentenceStrength(sentence: SentenceSignal) {
  const base = sentence.positionWeight * sentence.emotionalWeight;
  return sentence.centralCue ? base * 1.1 : base;
}

function getCentralSentences(sentences: SentenceSignal[]) {
  return [...sentences]
    .map((sentence) => ({
      ...sentence,
      score:
        scoreSentenceStrength(sentence) +
        (sentence.restorativeCue ? 0.6 : 0) +
        (sentence.conflict ? 0.8 : 0) +
        (/(overwhelmed|anxious|drained|angry|sad|numb|relieved|grateful|hopeful|steady|steadier|ashamed|frustrated)/i.test(sentence.sentence) ? 0.45 : 0)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function classifySupportImpact(sentence: SentenceSignal): JournalAnalysis["supports"][number]["impact"] {
  if (/(energized|energising|energizing|momentum)/i.test(sentence.sentence)) {
    return "energizing";
  }

  if (/(seen|supported|validated|understood)/i.test(sentence.sentence)) {
    return "validating";
  }

  if (/(grounded|steady|steadier|settled|calmer|breathe|breathing)/i.test(sentence.sentence)) {
    return "grounding";
  }

  if (/(helped|better|lighter|relieved|eased)/i.test(sentence.sentence)) {
    return "helpful";
  }

  return "mixed";
}

function scoreEmotionMap(sentences: SentenceSignal[]) {
  const scores = new Map<string, number>();

  for (const sentence of sentences) {
    for (const entry of emotionLexicon) {
      const hits = entry.words.filter((word) => sentence.normalized.includes(word)).length;
      if (hits > 0) {
        const weight = hits * sentence.positionWeight * sentence.emotionalWeight;
        scores.set(entry.label, (scores.get(entry.label) ?? 0) + weight);
      }
    }
  }

  return scores;
}

function getTopEmotion(scores: Map<string, number>) {
  return Array.from(scores.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "reflective";
}

function getSecondaryEmotions(scores: Map<string, number>, primaryEmotion: string) {
  return Array.from(scores.entries())
    .filter(([label, score]) => label !== primaryEmotion && score >= 0.8)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label]) => label);
}

function getRankedEmotions(scores: Map<string, number>) {
  return Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
}

function derivePrimaryEmotion(
  scores: Map<string, number>,
  toneScore: number,
  stressors: JournalAnalysis["stressors"],
  supports: JournalAnalysis["supports"],
  conflictHeavy: boolean
) {
  const ranked = getRankedEmotions(scores);
  const topLabel = ranked[0]?.[0];
  const topScore = ranked[0]?.[1] ?? 0;
  const secondScore = ranked[1]?.[1] ?? 0;

  if (topLabel && topLabel !== "reflective" && topScore >= 0.7) {
    return topLabel;
  }

  if (topLabel === "reflective" && secondScore >= 0.65) {
    return ranked[1]?.[0] ?? topLabel;
  }

  if (conflictHeavy) {
    return toneScore < -0.45 ? "angry" : "tense";
  }

  if (stressors.length > 0 && supports.length > 0) {
    return "mixed";
  }

  if (supports.length > 0 && toneScore > 0.15) {
    return supports.some((item) => item.impact === "grounding") ? "steady" : "relieved";
  }

  if (stressors.length > 0) {
    if (toneScore < -0.45) return "overwhelmed";
    if (toneScore < -0.2) return "tense";
  }

  if (toneScore > 0.2) {
    return "steady";
  }

  return topLabel ?? "mixed";
}

function scoreOverallTone(sentences: SentenceSignal[]) {
  let positive = 0;
  let negative = 0;

  for (const sentence of sentences) {
    for (const entry of emotionLexicon) {
      const hits = entry.words.filter((word) => sentence.normalized.includes(word)).length;
      if (hits > 0) {
        const contribution = hits * sentence.positionWeight * sentence.emotionalWeight;
        if (entry.tone > 0) positive += contribution * entry.tone;
        if (entry.tone < 0) negative += contribution * Math.abs(entry.tone);
      }
    }

    if (hasRestorativeOutcome(sentence) && !hasNegativeContext(sentence)) {
      positive += 1.2 * sentence.positionWeight;
    }

    if (hasPositiveExperience(sentence) && !hasNegativeContext(sentence)) {
      positive += 0.9 * sentence.positionWeight * sentence.emotionalWeight;
    }

    if (/(overwhelmed|anxious|hopeless|drained|tense|heavy)/i.test(sentence.sentence)) {
      negative += 1.2 * sentence.positionWeight * sentence.emotionalWeight;
    }

    if (hasNegativeContext(sentence)) {
      negative += 1.5 * sentence.positionWeight * sentence.emotionalWeight;
    }

    if (hasDisruptionSignal(sentence)) {
      negative += 1.1 * sentence.positionWeight * sentence.emotionalWeight;
    }
  }

  return { positive, negative, score: clamp((positive - negative) / 8, -1, 1) };
}

function extractStressors(_rawText: string, sentences: SentenceSignal[]) {
  const found: Array<JournalAnalysis["stressors"][number] & { weight: number }> = [];

  for (const sentence of sentences) {
    const matches = stressorPatterns
      .map((pattern) => {
        const label = findMatchedText(sentence.sentence, pattern.regex);
        if (!label) return null;

        const intensityBase =
          /(overwhelmed|anxious|panic|hopeless|furious|rage)/i.test(sentence.sentence)
            ? 8
            : /(tense|pressure|drained|heavy|argument|fight|yelled|threatened)/i.test(sentence.sentence)
              ? 7
              : 5;

        return {
          label,
          category: pattern.category,
          evidence: sentence.sentence,
          intensity: clamp(Math.round(intensityBase * sentence.emotionalWeight), 1, 10),
          weight: scoreSentenceStrength(sentence)
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    for (const match of matches) {
      const existing = found.find((item) => item.label.toLowerCase() === match.label.toLowerCase() && item.category === match.category);
      if (existing) {
        existing.weight = Math.max(existing.weight, match.weight);
        existing.intensity = Math.max(existing.intensity, match.intensity);
        continue;
      }

      found.push(match);
    }
  }

  if (found.length > 0) {
    return found
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 4)
      .map(({ weight, ...item }) => item);
  }

  const eventSentence = sentences.find((sentence) => hasDisruptionSignal(sentence) || /(stuck|late|upset|nervous|uncomfortable|unsafe|scared)/i.test(sentence.sentence));

  if (eventSentence) {
    return [
      {
        label:
          findMatchedText(
            eventSentence.sentence,
            /didn't expect|did not expect|caught me off guard|felt unsafe|felt exposed|something was wrong|something felt wrong|got weird|went wrong|broke down|missed the train|flat tire|car trouble|uncomfortable|unsafe|scared|awkward/i
          ) || "disruptive situation",
        category: /(unsafe|scared|exposed|wrong)/i.test(eventSentence.sentence) ? "uncertainty" : "other",
        evidence: eventSentence.sentence,
        intensity: /(unsafe|scared|wrong|off guard)/i.test(eventSentence.sentence) ? 7 : 5
      }
    ];
  }

  const fallbackSentence = sentences.find((sentence) => /(annoyed|stuck|late|off|weird|hard|messy|awkward|tense|upset)/i.test(sentence.sentence));

  if (!fallbackSentence) {
    return [] as JournalAnalysis["stressors"];
  }

  return [
    {
      label: "situational strain",
      category: "other",
      evidence: fallbackSentence.sentence,
      intensity: 4
    }
  ];
}

function getSupportCandidate(sentence: SentenceSignal): JournalAnalysis["supports"][number] | null {
  if (hasNegativeContext(sentence) && !hasRestorativeOutcome(sentence)) {
    return null;
  }

  const sentenceText = sentence.sentence;
  const normalized = sentence.normalized;
  const explicitRelief = hasRestorativeOutcome(sentence);

  if ((/took .*dog.*walk|walked the dog|walk with .*dog|dog for a walk/i.test(sentenceText) || (normalized.includes("walk") && normalized.includes("dog"))) && !hasNegativeContext(sentence)) {
    return {
      label: "walk with the dog",
      category: "routine",
      evidence: sentenceText,
      impact: classifySupportImpact(sentence)
    };
  }

  if ((/went for a walk|took a walk|went outside for a walk|walked outside/i.test(sentenceText) || (normalized.includes("walk") && !likelyIncidentalMovementMarkers.some((marker) => normalized.includes(marker)))) && explicitRelief && !hasNegativeContext(sentence)) {
    return {
      label: findMatchedText(sentenceText, /went for a walk|took a walk|went outside for a walk|walked outside/i) || "walk",
      category: "routine",
      evidence: sentenceText,
      impact: classifySupportImpact(sentence)
    };
  }

  if (/(deep breath|deep breaths|breathing|breathed|took a breath|took a few breaths)/i.test(sentenceText) && (explicitRelief || /pause|paused|moment/i.test(sentenceText))) {
    return {
      label: findMatchedText(sentenceText, /deep breath|deep breaths|breathing|breathed|took a breath|took a few breaths/i) || "breathing",
      category: "self-regulation",
      evidence: sentenceText,
      impact: classifySupportImpact(sentence)
    };
  }

  if (/(stretch|stretching|stretched)/i.test(sentenceText) && explicitRelief) {
    return {
      label: findMatchedText(sentenceText, /stretch|stretching|stretched/i) || "stretching",
      category: "body care",
      evidence: sentenceText,
      impact: classifySupportImpact(sentence)
    };
  }

  if (/(sat outside|went outside|opened the window|sunlight|sun|fresh air)/i.test(sentenceText) && explicitRelief) {
    return {
      label: findMatchedText(sentenceText, /sat outside|went outside|opened the window|sunlight|sun|fresh air/i) || "outside time",
      category: "environment",
      evidence: sentenceText,
      impact: classifySupportImpact(sentence)
    };
  }

  if (/(talked with|talked to|called|texted|spent time with)/i.test(sentenceText) && /(friend|partner|mom|dad|sister|brother|family)/i.test(sentenceText) && explicitRelief) {
    return {
      label: findMatchedText(sentenceText, /talked with|talked to|called|texted|spent time with/i) || "connection",
      category: "connection",
      evidence: sentenceText,
      impact: classifySupportImpact(sentence)
    };
  }

  if (
    /(coffee with|dinner with|lunch with|hung out with|spent time with|went out with|sat with|talked with|talked to|called|texted)/i.test(sentenceText) &&
    /(friend|partner|mom|dad|sister|brother|family|coworker)/i.test(sentenceText) &&
    (hasPositiveExperience(sentence) || !hasNegativeContext(sentence))
  ) {
    return {
      label: findMatchedText(sentenceText, /coffee with|dinner with|lunch with|hung out with|spent time with|went out with|sat with|talked with|talked to|called|texted/i) || "social connection",
      category: "connection",
      evidence: sentenceText,
      impact: hasPositiveExperience(sentence) ? "validating" : classifySupportImpact(sentence)
    };
  }

  if (
    /(walk|run|ran|worked out|gym|hike|danced|dancing|bike|biked|swam|swimming)/i.test(sentenceText) &&
    !likelyIncidentalMovementMarkers.some((marker) => normalized.includes(marker)) &&
    (explicitRelief || hasPositiveExperience(sentence)) &&
    !hasNegativeContext(sentence)
  ) {
    return {
      label: findMatchedText(sentenceText, /walk|run|ran|worked out|gym|hike|danced|dancing|bike|biked|swam|swimming/i) || "movement",
      category: "movement",
      evidence: sentenceText,
      impact: /(energized|energising|energizing|alive)/i.test(sentenceText) ? "energizing" : "helpful"
    };
  }

  if (
    accomplishmentMarkers.some((marker) => normalized.includes(marker)) &&
    !hasNegativeContext(sentence)
  ) {
    return {
      label: findMatchedText(sentenceText, /finished|completed|got it done|wrapped up|followed through|made progress|crossed off|cleaned|submitted|figured it out|solved/i) || "accomplishment",
      category: "accomplishment",
      evidence: sentenceText,
      impact: "helpful"
    };
  }

  if (
    /(finally|ended up|turned out|worked out|resolved|sorted out|got fixed)/i.test(sentenceText) &&
    (explicitRelief || hasPositiveExperience(sentence)) &&
    !hasNegativeContext(sentence)
  ) {
    return {
      label: findMatchedText(sentenceText, /finally|ended up|turned out|worked out|resolved|sorted out|got fixed/i) || "resolution",
      category: "resolution",
      evidence: sentenceText,
      impact: "helpful"
    };
  }

  if (
    hasPositiveExperience(sentence) &&
    /(music|sun|sunlight|outside|coffee|meal|breakfast|dinner|lunch|movie|show|book|game)/i.test(sentenceText) &&
    !hasNegativeContext(sentence)
  ) {
    return {
      label: findMatchedText(sentenceText, /music|sun|sunlight|outside|coffee|meal|breakfast|dinner|lunch|movie|show|book|game/i) || "positive experience",
      category: "comfort",
      evidence: sentenceText,
      impact: classifySupportImpact(sentence) === "mixed" ? "helpful" : classifySupportImpact(sentence)
    };
  }

  return null;
}

function extractSupports(_rawText: string, sentences: SentenceSignal[]) {
  const matches: Array<JournalAnalysis["supports"][number] & { weight: number }> = [];

  for (const sentence of sentences) {
    const candidate = getSupportCandidate(sentence);

    if (!candidate) {
      continue;
    }

    const existing = matches.find((item) => item.label.toLowerCase() === candidate.label.toLowerCase());
    const weight = scoreSentenceStrength(sentence) + (hasRestorativeOutcome(sentence) ? 0.9 : 0);

    if (existing) {
      existing.weight = Math.max(existing.weight, weight);
      continue;
    }

    matches.push({
      ...candidate,
      weight
    });
  }

  return matches
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4)
    .map(({ weight, ...item }) => item) as JournalAnalysis["supports"];
}

function deriveShift(sentences: SentenceSignal[], primaryEmotion: string, supportCount: number, toneScore: number): JournalAnalysis["emotional_shift"] {
  const third = Math.max(1, Math.ceil(sentences.length / 3));
  const startSlice = sentences.slice(0, third).length > 0 ? sentences.slice(0, third) : sentences;
  const middleSlice = sentences.slice(third, third * 2).length > 0 ? sentences.slice(third, third * 2) : sentences;
  const endSlice = sentences.slice(third * 2).length > 0 ? sentences.slice(third * 2) : sentences;
  const startScores = scoreEmotionMap(startSlice);
  const middleScores = scoreEmotionMap(middleSlice);
  const endScores = scoreEmotionMap(endSlice);

  const startTone = scoreOverallTone(startSlice).score;
  const middleTone = scoreOverallTone(middleSlice).score;
  const endTone = scoreOverallTone(endSlice).score;
  const startState = derivePrimaryEmotion(startScores, startTone, [], [], startSlice.some((sentence) => sentence.conflict));
  const endState = derivePrimaryEmotion(endScores, endTone, [], [], endSlice.some((sentence) => sentence.conflict));
  const middleState = derivePrimaryEmotion(middleScores, middleTone, [], [], middleSlice.some((sentence) => sentence.conflict));
  const delta = endTone - startTone;

  const direction =
    Math.abs(delta) < 0.18
      ? supportCount > 0 && toneScore > -0.1
        ? "mixed"
        : middleState !== startState || middleState !== endState
          ? "mixed"
          : "unchanged"
      : delta > 0.18
        ? "improved"
        : delta < -0.18
          ? "worsened"
          : "mixed";

  return {
    start_state: startState || primaryEmotion,
    end_state: endState || primaryEmotion,
    direction
  };
}

function buildSummary(
  toneScore: number,
  stressors: JournalAnalysis["stressors"],
  supports: JournalAnalysis["supports"],
  shift: JournalAnalysis["emotional_shift"],
  lowSignal: boolean,
  playfulTone: boolean,
  conflictHeavy: boolean,
  primaryEmotion: string,
  centralSentences: SentenceSignal[]
) {
  const topStressor = stressors[0]?.label;
  const topSupport = supports[0]?.label;
  const centralEvidence = centralSentences[0]?.sentence ?? "";

  if (lowSignal) {
    return playfulTone
      ? "The entry feels light and expressive, with only a small amount of clear emotional signal."
      : "The entry is fairly low-signal, so the interpretation stays light and grounded in what is clearly present.";
  }

  if (conflictHeavy && !topSupport) {
    return topStressor
      ? `The entry is shaped mostly by conflict or sharp strain around ${topStressor}, and there is little sign of relief in the writing.`
      : "The entry is dominated by conflict or sharp strain, without much evidence of relief or recovery.";
  }

  if (topStressor && topSupport && (shift.direction === "mixed" || shift.direction === "improved")) {
    return `There is clear strain around ${topStressor}, but ${topSupport} seems to bring some steadiness back into the entry by the end.`;
  }

  if (topStressor && topSupport && shift.direction === "unchanged") {
    return `${topStressor} stands out as the main difficulty, even though ${topSupport} adds a steadier or more workable note to the day.`;
  }

  if (topSupport && !topStressor && toneScore >= 0) {
    return `${topSupport} stands out as a clear source of steadiness or relief in the overall experience.`;
  }

  if (topStressor && toneScore < -0.2) {
    return `${topStressor} appears to be the clearest strain in the entry, and the overall tone stays more ${primaryEmotion} than relieved.`;
  }

  if (topSupport && toneScore > 0.2) {
    return `The entry leans steadier than strained overall, with ${topSupport} standing out as a meaningful support.`;
  }

  if (centralEvidence && primaryEmotion !== "mixed" && primaryEmotion !== "reflective") {
    return `The overall tone centers on feeling ${primaryEmotion}, with the strongest signal coming through in "${centralEvidence}".`;
  }

  return toneScore < -0.15
    ? topStressor
      ? `${topStressor} seems to shape the hardest part of the entry, and the overall tone stays more strained than settled.`
      : "The entry carries more strain than relief overall, though the interpretation stays close to what is clearly supported in the writing."
    : toneScore > 0.15
      ? topSupport
        ? `${topSupport} seems to anchor the entry, and the overall tone lands steadier than strained.`
        : "The entry feels broadly steady or restorative overall, with support signals outweighing strain."
      : "The entry holds both strain and steadier moments, with neither side fully taking over the overall tone.";
}

function deriveRecurringTopics(
  rawText: string,
  stressors: JournalAnalysis["stressors"],
  supports: JournalAnalysis["supports"],
  notableEntities: string[]
) {
  const text = rawText.toLowerCase();

  return unique([
    ...stressors
      .map((item) => item.label)
      .filter((label) => !["situational strain"].includes(label.toLowerCase()))
      .slice(0, 3),
    ...supports.map((item) => item.label).slice(0, 2),
    text.includes("laundromat") ? "laundromat" : null,
    text.includes("refund call") ? "refund call" : null,
    text.includes("money") ? "money" : null,
    text.includes("meeting") ? "meeting" : null,
    text.includes("sleep") ? "sleep" : null,
    text.includes("dog") && supports.some((item) => item.label === "walk with the dog") ? "walk with the dog" : null,
    ...notableEntities
  ]).slice(0, 8);
}

function deriveThemes(
  rawText: string,
  stressors: JournalAnalysis["stressors"],
  supports: JournalAnalysis["supports"],
  conflictHeavy: boolean
) {
  const text = rawText.toLowerCase();

  return unique([
    ...stressors.map((item) => (item.category === "other" ? item.label : `${item.category} strain`)),
    ...supports.map((item) => `${item.category} support`),
    conflictHeavy ? "conflict" : null,
    text.includes("tired") || text.includes("drained") ? "low energy" : null,
    /processing|thinking through|trying to make sense/i.test(rawText) ? "processing" : null
  ]).slice(0, 8);
}

function firstSentenceContaining(rawText: string, phrases: string[]) {
  const sentences = rawText
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return (
    sentences.find((sentence) => {
      const normalized = sentence.toLowerCase();
      return phrases.some((phrase) => normalized.includes(phrase));
    }) ?? ""
  );
}

function detectSafetyAssessment(rawText: string): JournalAnalysis["safety_assessment"] {
  const text = rawText.toLowerCase();

  const highRiskPhrases = [
    "kill myself",
    "end my life",
    "want to die",
    "suicidal",
    "suicide",
    "hurt myself",
    "harm myself",
    "plan to",
    "overdose"
  ];

  const moderateRiskPhrases = [
    "don't want to be here",
    "do not want to be here",
    "wish i wasn't here",
    "wish i was not here",
    "wish i could disappear",
    "want to disappear",
    "better off without me",
    "not wake up",
    "vanish"
  ];

  const lowRiskPhrases = [
    "hopeless",
    "worthless",
    "what's the point",
    "shut down",
    "empty",
    "numb",
    "can't do this anymore",
    "i'm a burden",
    "i am a burden"
  ];

  if (highRiskPhrases.some((phrase) => text.includes(phrase))) {
    return {
      level: "high",
      concerns: ["Possible explicit self-harm or suicide intent"],
      evidence: unique([firstSentenceContaining(rawText, highRiskPhrases)]),
      recommended_action:
        "Seek immediate support now. Contact 988 in the U.S. and territories, Samaritans at 116 123 in the UK and Ireland, or local emergency services if there is immediate danger."
    };
  }

  if (moderateRiskPhrases.some((phrase) => text.includes(phrase))) {
    return {
      level: "moderate",
      concerns: ["Possible indirect self-harm or suicide risk language"],
      evidence: unique([firstSentenceContaining(rawText, moderateRiskPhrases)]),
      recommended_action:
        "Reach out for support as soon as possible. Contact 988 in the U.S. and territories, Samaritans at 116 123 in the UK and Ireland, or a trusted person or local emergency service if safety feels urgent."
    };
  }

  const lowConcernHits = lowRiskPhrases.filter((phrase) => text.includes(phrase));

  if (lowConcernHits.length > 0) {
    return {
      level: "low",
      concerns: ["The entry includes heavier hopeless or shutdown language"],
      evidence: unique([firstSentenceContaining(rawText, lowConcernHits)]),
      recommended_action: "The entry sounds heavy. Gentle support, rest, and closer check-ins may help."
    };
  }

  return {
    level: "none",
    concerns: [],
    evidence: [],
    recommended_action: ""
  };
}

function buildHeuristicAnalysis(rawText: string): JournalAnalysis {
  const text = rawText.toLowerCase();
  const sentences = getSentenceSignals(rawText);
  const emotionScores = scoreEmotionMap(sentences);
  const stressors = extractStressors(rawText, sentences);
  const supports = extractSupports(rawText, sentences);
  const conflictHeavy = sentences.filter((sentence) => sentence.conflict).length >= 1 && supports.length === 0;
  const tone = scoreOverallTone(sentences);
  const positiveWeight = tone.positive;
  const negativeWeight = tone.negative;
  const sentimentScore = tone.score;
  const primaryEmotion = derivePrimaryEmotion(emotionScores, sentimentScore, stressors, supports, conflictHeavy);
  const secondaryEmotions = getSecondaryEmotions(emotionScores, primaryEmotion);
  const centralSentences = getCentralSentences(sentences);

  const joySources = [
    supports.some((item) => ["movement", "routine"].includes(item.category)) ? "being outside or moving around" : null,
    supports.some((item) => item.label === "walk with the dog") ? "time with the dog" : null,
    /(friend|together|with my sister|with my mom|with my dad)/i.test(rawText) && supports.some((item) => item.category === "connection")
      ? "feeling supported through connection"
      : null,
    supports.some((item) => item.label.toLowerCase() === "music") ? "music" : null,
    supports.some((item) => item.category === "environment") ? "light or a calmer environment" : null
  ].filter(Boolean) as string[];

  const gratitudeMoments = [
    text.includes("grateful") ? "a moment of gratitude is named directly" : null,
    /(calmer|better|relieved|lighter)/i.test(rawText) ? "relief after a harder stretch" : null,
    supports.length > 0 ? "something in the day felt supportive" : null
  ].filter(Boolean) as string[];

  const wins = [
    text.includes("left") ? "noticed discomfort and left the situation" : null,
    supports.some((item) => ["movement", "routine"].includes(item.category)) ? "made space for a regulating activity" : null,
    supports.some((item) => item.category === "self-regulation") ? "paused to regulate before continuing" : null,
    supports.some((item) => item.category === "body care") ? "followed through on a small caring routine" : null,
    supports.some((item) => item.category === "accomplishment") ? "finished something that mattered" : null,
    supports.some((item) => item.category === "resolution") ? "got through a situation that could have lingered" : null
  ].filter(Boolean) as string[];

  const whatToRepeat = [
    supports[0]?.label ?? null,
    joySources[0] ?? null,
    /(helped|steadier|calmer|better|lighter)/i.test(rawText) && supports[0] ? supports[0].label : null
  ].filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index);

  const personalKeywords = unique([
    text.includes("refund call") ? "refund call" : null,
    /mike'?s tone/i.test(rawText) ? "Mike's tone" : text.includes("mike") ? "Mike" : null,
    text.includes("laundromat") ? "laundromat" : null,
    ...stressors.map((item) => item.label),
    ...supports.map((item) => item.label)
  ]);

  const notableEntities = unique([
    findMatchedText(rawText, /\bmike\b/i) || null,
    text.includes("dog") ? "dog" : null,
    text.includes("laundromat") ? "laundromat" : null,
    text.includes("manager") ? "manager" : null,
    text.includes("family") ? "family" : null
  ]);
  const recurringTopics = deriveRecurringTopics(rawText, stressors, supports, notableEntities);
  const themes = deriveThemes(rawText, stressors, supports, conflictHeavy);

  const phrases = rawText
    .split(/[.!?]/)
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 3);

  const customEmotionTerms = unique([
    ...sentences
      .filter((sentence) => /(felt|feeling|heavy|steady|calm|drained|anxious|hopeful|relieved|numb|low|angry|frustrated|scared|unsafe|good|fun)/i.test(sentence.sentence))
      .map((sentence) => sentence.sentence),
    text.includes("shaky") ? "shaky" : null,
    text.includes("lighter") ? "lighter" : null,
    text.includes("steadier") ? "steadier" : null
  ]).slice(0, 6);

  const restorativeSignals = unique([
    ...supports.map((item) => item.label),
    text.includes("steadier afterward") ? "felt steadier afterward" : null,
    text.includes("calmer") ? "felt calmer afterward" : null,
    ...whatToRepeat
  ]);

  const safetyAssessment = detectSafetyAssessment(rawText);
  const playfulTone = sentences.some((sentence) => sentence.nonliteral);
  const lowSignal = emotionScores.size === 0 && stressors.length === 0 && supports.length === 0;
  const emotionalShift = deriveShift(sentences, primaryEmotion, supports.length, sentimentScore);
  const triggers: JournalAnalysis["triggers"] = stressors.map((item) => ({
    type:
      item.category === "relationship" || item.category === "work" || item.category === "finance" || item.category === "family" || item.category === "health"
        ? item.category
        : "other",
    description: item.evidence
  }));
  const copingActions: JournalAnalysis["coping_actions"] = supports.map((item) => ({
    action: item.label,
    impact: item.impact === "mixed" ? "neutral" : "helpful"
  }));

  return validateAnalysis({
    raw_text: rawText,
    summary: buildSummary(sentimentScore, stressors, supports, emotionalShift, lowSignal, playfulTone, conflictHeavy, primaryEmotion, centralSentences),
    primary_emotion: primaryEmotion,
    secondary_emotions: secondaryEmotions,
    custom_emotion_terms: customEmotionTerms,
    joy_sources: joySources,
    gratitude_moments: gratitudeMoments,
    wins,
    what_to_repeat: whatToRepeat,
    triggers,
    stressors,
    coping_actions: copingActions,
    supports,
    sentiment: {
      label:
        positiveWeight > 0 && negativeWeight > 0
          ? "mixed"
          : conflictHeavy || sentimentScore < -0.2
            ? "negative"
            : sentimentScore > 0.2
              ? "positive"
              : "neutral",
      score: Number(sentimentScore.toFixed(2))
    },
    user_mood: null,
    user_stress: null,
    user_energy: null,
    mood_score: clamp(Math.round(6 + sentimentScore * 4), 1, 10),
    stress_level: clamp(Math.round(5 + negativeWeight + (conflictHeavy ? 1 : 0)), 1, 10),
    energy_level: clamp(text.includes("drained") || text.includes("tired") ? 3 : text.includes("energized") ? 8 : supports.some((item) => item.impact === "energizing") ? 7 : 5, 1, 10),
    energy_direction:
      conflictHeavy || negativeWeight - positiveWeight > 2.5
        ? "draining"
        : supports.length > 0 && positiveWeight >= negativeWeight
          ? "restorative"
          : positiveWeight > 0 && negativeWeight > 0
            ? "mixed"
            : "neutral",
    emotional_shift: emotionalShift,
    themes,
    recurring_topics: recurringTopics,
    personal_keywords: personalKeywords,
    notable_entities: notableEntities,
    restorative_signals: restorativeSignals,
    evidence_spans: [
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
      ...centralSentences.slice(0, 2).map((item) => ({
        text: item.sentence,
        type: "emotion" as const,
        label: primaryEmotion
      })),
      ...recurringTopics.slice(0, 2).map((item) => ({
        text: item,
        type: "topic" as const,
        label: item
      })),
      ...safetyAssessment.evidence.map((item) => ({
        text: item,
        type: "safety" as const,
        label: "safety"
      }))
    ],
    notable_phrases: phrases,
    reflection_tags: Array.from(new Set([primaryEmotion, ...stressors.map((item) => item.category), supports.length > 0 ? "recovery attempt" : "active strain"])),
    confidence: {
      primary_emotion: lowSignal ? 0.46 : playfulTone ? 0.58 : primaryEmotion === "mixed" ? 0.64 : 0.84,
      triggers: stressors.length > 0 ? (stressors[0]?.category === "other" ? 0.62 : 0.84) : 0.35,
      coping_actions: supports.length > 0 ? (supports.some((item) => item.impact !== "mixed") ? 0.84 : 0.62) : 0.42,
      overall: lowSignal ? 0.44 : playfulTone ? 0.55 : supports.length > 0 && stressors.length > 0 ? 0.76 : 0.82
    },
    safety_assessment: safetyAssessment
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
