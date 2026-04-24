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
  { label: "sad", words: ["sad", "down", "heavy", "heartbroken", "felt sad"], tone: -2 },
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

const explicitEmotionLexicon = [
  { label: "overwhelmed", regex: /\boverwhelmed|flooded|too much\b/i, tone: "negative", score: 2.2 },
  { label: "anxious", regex: /\banxious|nervous|panicky|on edge|wired\b/i, tone: "negative", score: 2 },
  { label: "tense", regex: /\btense|pressure|tight|stressed\b/i, tone: "negative", score: 1.8 },
  { label: "angry", regex: /\bangry|furious|rage|resentful|hostile\b/i, tone: "negative", score: 2.2 },
  { label: "frustrated", regex: /\bfrustrated|annoyed|irritated\b/i, tone: "negative", score: 1.8 },
  { label: "sad", regex: /\bsad|heartbroken|felt sad|a little down|heavy\b/i, tone: "negative", score: 1.8 },
  { label: "grieving", regex: /\bgrief|grieving|mourning|loss\b/i, tone: "negative", score: 2.4 },
  { label: "ashamed", regex: /\bashamed|embarrassed|humiliated\b/i, tone: "negative", score: 2 },
  { label: "numb", regex: /\bnumb|flat|blank|shut down\b/i, tone: "negative", score: 1.9 },
  { label: "drained", regex: /\bdrained|exhausted|spent|wiped\b/i, tone: "negative", score: 1.9 },
  { label: "scattered", regex: /\bscattered|all over the place|can't focus|couldn't focus\b/i, tone: "negative", score: 1.7 },
  { label: "unsettled", regex: /\bunsettled|off|uneasy\b/i, tone: "liminal", score: 1.8 },
  { label: "tender", regex: /\btender|raw\b/i, tone: "liminal", score: 1.6 },
  { label: "present", regex: /\bpresent\b/i, tone: "grounded", score: 1.7 },
  { label: "steady", regex: /\bsteady|steadier|stable\b/i, tone: "grounded", score: 1.9 },
  { label: "grounded", regex: /\bgrounded|settled\b/i, tone: "grounded", score: 2 },
  { label: "accepting", regex: /\baccepting|enough\b/i, tone: "grounded", score: 1.7 },
  { label: "calm", regex: /\bcalm|calmer\b/i, tone: "positive", score: 1.8 },
  { label: "relieved", regex: /\brelieved|lighter|eased\b/i, tone: "positive", score: 1.9 },
  { label: "hopeful", regex: /\bhopeful|optimistic|encouraged\b/i, tone: "positive", score: 1.8 },
  { label: "grateful", regex: /\bgrateful|thankful|appreciative\b/i, tone: "positive", score: 1.8 },
  { label: "satisfied", regex: /\bsatisfied|proud|accomplished\b/i, tone: "positive", score: 1.8 }
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

const liminalMarkers = [
  "in between",
  "in-between",
  "between versions",
  "transition",
  "transitional",
  "becoming",
  "not there yet",
  "emerging",
  "threshold",
  "maybe that's enough",
  "didn't solve anything but felt more present"
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
  index: number;
};

type EventSignal = {
  label: string;
  category: string;
  evidence: string;
  kind: "support" | "stressor" | "neutral";
  weight: number;
  positive: number;
  negative: number;
  index: number;
};

type StateSignal = {
  label: string;
  tone: "positive" | "negative" | "grounded" | "liminal" | "neutral";
  evidence: string;
  weight: number;
  index: number;
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
      index,
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

function findMatch(sentence: string, regex: RegExp) {
  return findMatchedText(sentence, regex);
}

function hasAny(sentence: SentenceSignal, markers: readonly string[]) {
  return markers.some((marker) => sentence.normalized.includes(marker));
}

function isConflict(sentence: SentenceSignal) {
  return sentence.conflict || /(argued|argument|fight|fighting|hostile|insulted|retaliat|threat|yelled|screamed)/i.test(sentence.sentence);
}

function hasGentleRegulation(sentence: SentenceSignal) {
  if (hasNegativeContext(sentence)) {
    return false;
  }

  return (
    /(didn't rush|did not rush|took my time|slowed down|slowly|quietly|sat with|sat quietly|noticed|listened to|watched the light|watched the sunlight|watched the trees|felt more present|more present|breathed|breathing|steady myself|be here|maybe that's enough)/i.test(
      sentence.sentence
    ) ||
    (/(coffee|tea|window|light|sunlight|sound|birds|wind|body|breath)/i.test(sentence.sentence) && !hasDisruptionSignal(sentence))
  );
}

function hasNegatedConcept(sentence: SentenceSignal, regex: RegExp) {
  const match = sentence.sentence.match(regex);
  if (!match || typeof match.index !== "number") {
    return false;
  }

  const before = sentence.sentence.slice(Math.max(0, match.index - 20), match.index).toLowerCase();
  return /\b(no|not|never|without|isn't|isnt|wasn't|wasnt|didn't|didnt|doesn't|doesnt|nothing)\s+$/.test(before);
}

function hasQualifiedConcept(sentence: SentenceSignal, regex: RegExp) {
  const match = sentence.sentence.match(regex);
  if (!match || typeof match.index !== "number") {
    return false;
  }

  const before = sentence.sentence.slice(Math.max(0, match.index - 28), match.index).toLowerCase();
  return /\b(not exactly|not really|less like|more like|didn't feel like|did not feel like)\s+$/.test(before);
}

function isNegatedOrQualified(sentence: SentenceSignal, regex: RegExp) {
  return hasNegatedConcept(sentence, regex) || hasQualifiedConcept(sentence, regex);
}

function indicatesActualStrain(sentence: SentenceSignal) {
  return (
    /(overwhelmed|anxious|scared|afraid|unsafe|pressure|burden|heavy|drained|exhausted|too much|overload|panicky|rage|furious|shame|worthless|hopeless|tense)/i.test(
      sentence.sentence
    ) ||
    (hasDisruptionSignal(sentence) && !isNegatedOrQualified(sentence, /\b(unsafe|wrong|alarm|scared|awkward|uncomfortable|off)\b/i))
  );
}

function isMeaningfulDiscomfort(sentence: SentenceSignal) {
  return (
    /(uncomfortable|hard|difficult|tender|raw|still|quiet|dangerous|unfamiliar|truth|honest|clarity|clearer)/i.test(sentence.sentence) &&
    !indicatesActualStrain(sentence) &&
    !isConflict(sentence)
  );
}

function normalizeConceptLabel(label: string) {
  const normalized = label.trim().toLowerCase();

  if (/(didn't rush|did not rush|took my time|slowed down|slowly|quietly|let it be)/i.test(label)) return "intentional slowing";
  if (/(more present|present|noticed the environment|noticed|light|sunlight|sound|birds|wind|window|breath|body)/i.test(label)) return "presence";
  if (/(made coffee slowly|coffee|tea)/i.test(label)) return "small ritual";
  if (/(accepting|maybe that's enough|let it be|enough)/i.test(label)) return "acceptance";
  if (/(transition|in between|in-between|between versions|becoming|emerging)/i.test(label)) return "transition";
  if (/(uncertain but grounded|uncertain but steadier|mixed recovery)/i.test(label)) return "emerging steadiness";
  if (/(walk with the dog|movement|run|walk|stretch|gym|hike)/i.test(label)) return "movement";
  if (/(social connection|talked to|talked with|called|texted|spent time with|coffee with|dinner with)/i.test(label)) return "social connection";
  if (/(refund call|money conversation|budget|bills|rent)/i.test(label)) return "money stress";
  if (/(manager|meeting|deadline|work)/i.test(label)) return "work pressure";
  if (/(pain|migraine|sleep|rough night of sleep)/i.test(label)) return "physical strain";

  return normalized;
}

function shouldPromoteTopic(label: string) {
  const normalized = normalizeConceptLabel(label);
  return ![
    "slowly",
    "quietly",
    "off",
    "awkward",
    "alarm",
    "wrong",
    "uncomfortable",
    "pressure",
    "movement",
    "coffee",
    "tea"
  ].includes(normalized);
}

function isEvidenceLabelMatch(label: string, evidence: string) {
  const normalizedLabel = normalizeConceptLabel(label);
  const normalizedEvidence = evidence.toLowerCase();

  if (normalizedLabel === "presence") {
    return /(present|noticed|light|sunlight|sound|birds|wind|window|breath|body|sat with|slowed down|didn't rush|did not rush)/i.test(evidence);
  }

  if (normalizedLabel === "acceptance") {
    return /(enough|let it be|accept|allow)/i.test(evidence);
  }

  if (normalizedLabel === "transition") {
    return /(in between|in-between|between versions|transition|transitional|becoming|emerging)/i.test(evidence);
  }

  if (normalizedLabel === "emerging steadiness") {
    return /(more present|steadier|grounded|clearer|less defended)/i.test(evidence);
  }

  return normalizedEvidence.includes(normalizedLabel.replace(/\s+/g, " "));
}

function dedupeByLabelAndEvidence<T extends { label: string; evidence: string }>(items: T[]) {
  return unique(items.map((item) => JSON.stringify({ label: item.label, evidence: item.evidence }))).map((item) => {
    const parsed = JSON.parse(item) as { label: string; evidence: string };
    return items.find((candidate) => candidate.label === parsed.label && candidate.evidence === parsed.evidence)!;
  });
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
  const text = sentence.sentence;

  if (/(energized|energising|energizing|momentum|excited|stoked)/i.test(text)) {
    return "energizing";
  }

  if (/(seen|supported|validated|understood|safe|familiar|comforting|care)/i.test(text)) {
    return "validating";
  }

  if (/(grounded|steady|steadier|settled|calmer|breathe|breathing|quiet|still|meaningful|present|soft)/i.test(text)) {
    return "grounding";
  }

  if (/(helped|better|lighter|relieved|eased|enjoyable|delicious|proud|felt good|felt a lot better after)/i.test(text)) {
    return "helpful";
  }

  return "helpful";
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
    const candidate = inferSupportCandidateFromSentence(sentence);

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

function extractEvents(entry: string) {
  const sentences = getSentenceSignals(entry);
  const events: EventSignal[] = [];

  for (const sentence of sentences) {
    const gentleRegulation = hasGentleRegulation(sentence);
    const explicitRelief = hasRestorativeOutcome(sentence);
    const positiveExperience = hasPositiveExperience(sentence);
    const negativeContext = hasNegativeContext(sentence);
    const liminalWithoutDistress =
      liminalMarkers.some((marker) => sentence.normalized.includes(marker)) &&
      !negativeContext &&
      !hasDisruptionSignal(sentence) &&
      !/(panic|terrified|unsafe|argument|fight|threat|rage|furious)/i.test(sentence.sentence);

    if (/(made|brewed).*(coffee|tea)|(coffee|tea).*(slowly|quietly|didn't rush|did not rush|took my time)/i.test(sentence.sentence) && !negativeContext) {
      events.push({
        label: "made coffee slowly",
        category: "routine",
        evidence: sentence.sentence,
        kind: "support",
        weight: scoreSentenceStrength(sentence) + 0.8,
        positive: 2.3,
        negative: 0,
        index: sentence.index
      });
    }

    if (/(noticed|watched|listened to|heard|felt).*(light|sunlight|sound|birds|wind|body|breath|window)/i.test(sentence.sentence)) {
      events.push({
        label: "noticed the environment",
        category: "presence",
        evidence: sentence.sentence,
        kind: gentleRegulation ? "support" : "neutral",
        weight: scoreSentenceStrength(sentence) + 0.5,
        positive: gentleRegulation ? 1.8 : 0.3,
        negative: 0,
        index: sentence.index
      });
    }

    if (/(didn't rush|did not rush|took my time|slowed down|slowly|quietly|maybe that's enough|more present|sat with it|let it be)/i.test(sentence.sentence) && !negativeContext) {
      events.push({
        label: findMatch(sentence.sentence, /didn't rush|did not rush|took my time|slowed down|slowly|quietly|maybe that's enough|more present|sat with it|let it be/i) || "intentional slowing",
        category: "presence",
        evidence: sentence.sentence,
        kind: "support",
        weight: scoreSentenceStrength(sentence) + 0.8,
        positive: 2,
        negative: 0,
        index: sentence.index
      });
    }

    if (/(coffee with|dinner with|lunch with|hung out with|spent time with|went out with|talked with|talked to|called|texted)/i.test(sentence.sentence) && /(friend|partner|mom|dad|sister|brother|family|coworker)/i.test(sentence.sentence)) {
      events.push({
        label: findMatch(sentence.sentence, /coffee with|dinner with|lunch with|hung out with|spent time with|went out with|talked with|talked to|called|texted/i) || "social connection",
        category: "connection",
        evidence: sentence.sentence,
        kind: positiveExperience || explicitRelief ? "support" : "neutral",
        weight: scoreSentenceStrength(sentence) + 0.7,
        positive: positiveExperience || explicitRelief ? 2.1 : 0.8,
        negative: 0,
        index: sentence.index
      });
    }

    if (/(walked|went for a walk|took a walk|ran|run|hiked|stretch(ed|ing)?|worked out|gym|bike(d)?|swam)/i.test(sentence.sentence) && !likelyIncidentalMovementMarkers.some((marker) => sentence.normalized.includes(marker))) {
      events.push({
        label: findMatch(sentence.sentence, /walked the dog|went for a walk|took a walk|run|ran|hiked|stretch(ed|ing)?|worked out|gym|bike(d)?|swam/i) || "movement",
        category: "movement",
        evidence: sentence.sentence,
        kind: explicitRelief || positiveExperience || gentleRegulation ? "support" : "neutral",
        weight: scoreSentenceStrength(sentence) + 0.5,
        positive: explicitRelief || positiveExperience || gentleRegulation ? 1.8 : 0.6,
        negative: 0,
        index: sentence.index
      });
    }

    if (hasAny(sentence, accomplishmentMarkers) && !negativeContext) {
      events.push({
        label: findMatch(sentence.sentence, /finished|completed|got it done|wrapped up|followed through|made progress|crossed off|cleaned|submitted|figured it out|solved/i) || "accomplishment",
        category: "accomplishment",
        evidence: sentence.sentence,
        kind: "support",
        weight: scoreSentenceStrength(sentence) + 0.6,
        positive: 1.9,
        negative: 0,
        index: sentence.index
      });
    }

    if (/(finally|ended up|turned out|worked out|resolved|sorted out|got fixed)/i.test(sentence.sentence) && !hasNegativeContext(sentence)) {
      events.push({
        label: findMatch(sentence.sentence, /finally|ended up|turned out|worked out|resolved|sorted out|got fixed/i) || "resolution",
        category: "resolution",
        evidence: sentence.sentence,
        kind: "support",
        weight: scoreSentenceStrength(sentence) + 0.7,
        positive: 2,
        negative: 0,
        index: sentence.index
      });
    }

    const explicitStressorMatch =
      /(refund call|money conversation|deadline|manager|meeting|migraine|pain|rough night of sleep|pressure|overloaded|overload)/i.test(sentence.sentence) &&
      !isNegatedOrQualified(sentence, /\b(refund call|money conversation|deadline|manager|meeting|migraine|pain|rough night of sleep|pressure|overloaded|overload)\b/i);

    if (!liminalWithoutDistress && (isConflict(sentence) || explicitStressorMatch || (hasDisruptionSignal(sentence) && indicatesActualStrain(sentence)))) {
      const category = isConflict(sentence)
        ? "conflict"
        : /(refund|money|budget|bills?|rent)/i.test(sentence.sentence)
          ? "finance"
          : /(deadline|manager|meeting|work)/i.test(sentence.sentence)
            ? "work"
            : /(migraine|pain|sleep|sick)/i.test(sentence.sentence)
              ? "health"
              : /(pressure|overloaded|overload)/i.test(sentence.sentence)
                ? "pressure"
                : "disruption";
      const label =
        findMatch(
          sentence.sentence,
          /argument|argued|fight|fighting|yelled|screamed|threatened|hostile|insulted|refund call|money conversation|deadline|manager|meeting|migraine|pain|rough night of sleep|pressure|overloaded|overload|caught me off guard|felt unsafe|something was wrong|got weird|went wrong|flat tire|car trouble|missed the train|alarm|uncomfortable|unsafe|scared|awkward/i
        ) || category;

      if (!isNegatedOrQualified(sentence, new RegExp(`\\b${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"))) {
        events.push({
          label,
          category,
          evidence: sentence.sentence,
          kind: "stressor",
          weight: scoreSentenceStrength(sentence) + (isConflict(sentence) ? 1 : 0.7),
          positive: 0,
          negative: isConflict(sentence) ? 2.4 : 1.9,
          index: sentence.index
        });
      }
    }
  }

  return { sentences, events };
}

function extractStateSignals(entry: string) {
  const sentences = getSentenceSignals(entry);
  const signals: StateSignal[] = [];

  for (const sentence of sentences) {
    for (const descriptor of explicitEmotionLexicon) {
      if (descriptor.regex.test(sentence.sentence)) {
        signals.push({
          label: descriptor.label,
          tone: descriptor.tone,
          evidence: sentence.sentence,
          weight: descriptor.score * scoreSentenceStrength(sentence),
          index: sentence.index
        });
      }
    }

    if (liminalMarkers.some((marker) => sentence.normalized.includes(marker))) {
      signals.push({
        label: sentence.normalized.includes("maybe that's enough") ? "accepting" : "transitional",
        tone: sentence.normalized.includes("maybe that's enough") ? "grounded" : "liminal",
        evidence: sentence.sentence,
        weight: 2.2 * scoreSentenceStrength(sentence),
        index: sentence.index
      });
    }

    if (hasGentleRegulation(sentence) && !hasNegativeContext(sentence)) {
      signals.push({
        label: "present",
        tone: "grounded",
        evidence: sentence.sentence,
        weight: 1.4 * scoreSentenceStrength(sentence),
        index: sentence.index
      });
    }

    if (/(didn't solve anything but felt more present|did not solve anything but felt more present|still unsure but steadier|uncertain but grounded|uncertain but steadier)/i.test(sentence.sentence)) {
      signals.push({
        label: "mixed recovery",
        tone: "grounded",
        evidence: sentence.sentence,
        weight: 2 * scoreSentenceStrength(sentence),
        index: sentence.index
      });
    }
  }

  return { sentences, signals };
}

function detectSupportsAndCoping(_entry: string, eventsResult: ReturnType<typeof extractEvents>, stateResult: ReturnType<typeof extractStateSignals>) {
  const supportCandidates: JournalAnalysis["supports"] = eventsResult.events
    .filter((event) => event.kind === "support")
    .filter((event) => !eventsResult.events.some((other) => other.kind === "stressor" && other.evidence === event.evidence && other.weight >= event.weight))
    .filter((event) => !isConflict({ ...eventsResult.sentences[event.index], sentence: event.evidence, normalized: event.evidence.toLowerCase() }))
    .sort((a, b) => b.weight - a.weight)
    .map((event) => ({
      label: event.label,
      category: event.category,
      evidence: event.evidence,
      impact:
        event.category === "presence" || event.label === "made coffee slowly" || /present|steady|enough|calm|clearer|let it be/i.test(event.evidence)
          ? "grounding"
          : event.category === "connection"
            ? "validating"
            : event.category === "movement" && /energized|alive/i.test(event.evidence)
              ? "energizing"
              : "helpful"
    }));

  const supports = dedupeByLabelAndEvidence(supportCandidates)
    .filter((event) => isEvidenceLabelMatch(event.label, event.evidence))
    .slice(0, 4);

  const copingActions: JournalAnalysis["coping_actions"] = supports.map((support) => ({
    action: support.label,
    impact: support.impact === "mixed" ? "neutral" : "helpful"
  }));

  const restorativeSignals = unique([
    ...supports.filter((item) => item.impact === "grounding" || item.impact === "helpful" || item.impact === "validating").map((item) => normalizeConceptLabel(item.label)),
    ...stateResult.signals
      .filter((item) => item.label === "present" || item.label === "accepting" || item.label === "steady" || item.label === "mixed recovery")
      .map((item) => normalizeConceptLabel(item.label))
  ]).slice(0, 4);

  return { supports, copingActions, restorativeSignals };
}

function detectStressors(_entry: string, eventsResult: ReturnType<typeof extractEvents>, stateResult: ReturnType<typeof extractStateSignals>) {
  const stressorCandidates = eventsResult.events
    .filter((event) => event.kind === "stressor")
    .filter((event) => indicatesActualStrain(eventsResult.sentences[event.index]))
    .filter((event) => !eventsResult.events.some((other) => other.kind === "support" && other.evidence === event.evidence && other.weight >= event.weight))
    .sort((a, b) => b.weight - a.weight)
    .map((event) => ({
      label: event.label,
      category: event.category,
      evidence: event.evidence,
      intensity: clamp(
        Math.round(4 + event.negative + (stateResult.signals.some((signal) => signal.index === event.index && signal.tone === "negative") ? 1.5 : 0)),
        1,
        10
      )
    }));

  const stressors = dedupeByLabelAndEvidence(stressorCandidates)
    .filter((item) => isEvidenceLabelMatch(item.label, item.evidence) || indicatesActualStrain(eventsResult.sentences.find((sentence) => sentence.sentence === item.evidence) ?? eventsResult.sentences[0]))
    .slice(0, 3);

  const triggers: JournalAnalysis["triggers"] = stressors.map((item) => ({
    type:
      item.category === "finance" || item.category === "work" || item.category === "family" || item.category === "health" || item.category === "conflict"
        ? item.category
        : "other",
    description: item.evidence
  }));

  return { stressors: stressors.slice(0, 4), triggers };
}

function buildEmotionalTimeline(_entry: string, stateResult: ReturnType<typeof extractStateSignals>, supports: JournalAnalysis["supports"], stressors: JournalAnalysis["stressors"]) {
  const { sentences, signals } = stateResult;
  const third = Math.max(1, Math.ceil(sentences.length / 3));
  const slices = [sentences.slice(0, third), sentences.slice(third, third * 2), sentences.slice(third * 2)].map((slice) => (slice.length > 0 ? slice : sentences));
  const eventSignals: EventSignal[] = [
    ...supports.map((item) => ({
      label: item.label,
      category: item.category,
      evidence: item.evidence,
      kind: "support" as const,
      weight: 1.5,
      positive: 1.5,
      negative: 0,
      index: sentences.find((sentence) => sentence.sentence === item.evidence)?.index ?? 0
    })),
    ...stressors.map((item) => ({
      label: item.label,
      category: item.category,
      evidence: item.evidence,
      kind: "stressor" as const,
      weight: 1.5,
      positive: 0,
      negative: 1.5,
      index: sentences.find((sentence) => sentence.sentence === item.evidence)?.index ?? 0
    }))
  ];

  function segmentLabel(segment: SentenceSignal[]) {
    const segmentSignals = signals.filter((signal) => segment.some((sentence) => sentence.index === signal.index));
    const segmentEvents = eventSignals.filter((event) => segment.some((sentence) => sentence.index === event.index));
    const liminal = segmentSignals.filter((signal) => signal.tone === "liminal").reduce((sum, signal) => sum + signal.weight, 0);
    const grounded = segmentSignals.filter((signal) => signal.tone === "grounded").reduce((sum, signal) => sum + signal.weight, 0);
    const negative = segmentSignals.filter((signal) => signal.tone === "negative").reduce((sum, signal) => sum + signal.weight, 0) + segmentEvents.reduce((sum, event) => sum + event.negative, 0);
    const positive = segmentSignals.filter((signal) => signal.tone === "positive").reduce((sum, signal) => sum + signal.weight, 0) + segmentEvents.reduce((sum, event) => sum + event.positive, 0);

    if (liminal >= 1.8 && grounded >= 1.1) return "unsettled but grounded";
    if (liminal >= 2.1) return "transitional";
    if (grounded >= 1.8 && positive >= negative) return segmentSignals.some((signal) => signal.label === "accepting") ? "accepting" : "present";
    if (negative > positive + 0.8) return segmentSignals.filter((signal) => signal.tone === "negative").sort((a, b) => b.weight - a.weight)[0]?.label ?? "strained";
    if (positive > negative + 0.8) return segmentSignals.filter((signal) => signal.tone === "positive" || signal.tone === "grounded").sort((a, b) => b.weight - a.weight)[0]?.label ?? "steady";
    return segmentSignals.sort((a, b) => b.weight - a.weight)[0]?.label ?? "steady";
  }

  const start = segmentLabel(slices[0]);
  const middle = segmentLabel(slices[1]);
  const end = segmentLabel(slices[2]);
  const direction: JournalAnalysis["emotional_shift"]["direction"] =
    start === end
      ? middle !== start
        ? "mixed"
        : "unchanged"
      : /(present|steady|accepting|relieved|hopeful|transitional but steadier|unsettled but grounded)/i.test(end) && !/(present|steady|accepting|relieved|hopeful|transitional but steadier|unsettled but grounded)/i.test(start)
        ? "improved"
        : /(overwhelmed|anxious|tense|angry|frustrated|drained|sad|numb|grieving|ashamed|strained)/i.test(end) && !/(overwhelmed|anxious|tense|angry|frustrated|drained|sad|numb|grieving|ashamed|strained)/i.test(start)
          ? "worsened"
          : "mixed";

  return { start, middle, end, direction };
}

function synthesizeInterpretation(
  entry: string,
  eventsResult: ReturnType<typeof extractEvents>,
  stateResult: ReturnType<typeof extractStateSignals>,
  supportsResult: ReturnType<typeof detectSupportsAndCoping>,
  stressorsResult: ReturnType<typeof detectStressors>,
  timeline: ReturnType<typeof buildEmotionalTimeline>
) {
  const { sentences, signals } = stateResult;
  const { supports, copingActions, restorativeSignals } = supportsResult;
  const { stressors, triggers } = stressorsResult;
  const rankedStates = getRankedEmotions(
    new Map(
      signals.reduce<Array<[string, number]>>((accumulator, signal) => {
        const existing = accumulator.find(([label]) => label === signal.label);
        if (existing) {
          existing[1] += signal.weight;
        } else {
          accumulator.push([signal.label, signal.weight]);
        }
        return accumulator;
      }, [])
    )
  );

  const liminalWeight = signals.filter((signal) => signal.tone === "liminal").reduce((sum, signal) => sum + signal.weight, 0);
  const groundedWeight = signals.filter((signal) => signal.tone === "grounded").reduce((sum, signal) => sum + signal.weight, 0);
  const positiveWeight = signals.filter((signal) => signal.tone === "positive").reduce((sum, signal) => sum + signal.weight, 0) + supports.length * 0.8 + groundedWeight;
  const negativeWeight = signals.filter((signal) => signal.tone === "negative").reduce((sum, signal) => sum + signal.weight, 0) + stressors.length * 0.9;
  const topSupport = supports[0];
  const topStressor = stressors[0];
  const centralSignals = rankedStates
    .slice(0, 4)
    .map(([label]) => label)
    .filter((label) => !["reflective", "mixed"].includes(label));

  let primaryEmotion = rankedStates[0]?.[0] ?? "present";
  if (liminalWeight >= 2.4 && groundedWeight >= 1.2) primaryEmotion = "unsettled but grounded";
  else if (liminalWeight >= 2.6 && negativeWeight < liminalWeight + 1.5) primaryEmotion = "transitional";
  else if (groundedWeight >= 2.1 && negativeWeight <= groundedWeight + 0.6) primaryEmotion = signals.some((signal) => signal.label === "accepting") ? "accepting" : "present";
  else if (supports.length > 0 && stressors.length > 0 && timeline.direction === "improved") primaryEmotion = "mixed recovery";
  else if (supports.length > 0 && negativeWeight < positiveWeight) primaryEmotion = supports.some((item) => item.impact === "grounding") ? "steady" : "relieved";
  else if (stressors.length > 0 && negativeWeight > positiveWeight + 0.8) primaryEmotion = centralSignals.find((label) => !["present", "steady", "reflective"].includes(label)) ?? primaryEmotion;
  else if (isMeaningfulDiscomfort(sentences[Math.min(1, Math.max(0, sentences.length - 1))] ?? sentences[0])) primaryEmotion = "tender";

  const secondaryEmotions = unique(
    rankedStates
      .map(([label]) => label)
      .filter((label) => label !== primaryEmotion)
      .filter((label) => !["reflective", "mixed"].includes(label))
      .slice(0, 4)
  );

  let summary = "";
  if (primaryEmotion === "transitional" || primaryEmotion === "unsettled but grounded") {
    summary = topSupport
      ? `The entry sits in a transitional space, with uncertainty still present but ${topSupport.label} helping it land in a more grounded place.`
      : "The entry feels transitional rather than crisis-driven, holding uncertainty and awareness at the same time.";
  } else if (topStressor && topSupport && timeline.direction === "improved") {
    summary = `${topStressor.label} shapes the harder part of the entry, and ${topSupport.label} becomes the clearest point of steadiness as the tone shifts by the end.`;
  } else if (topSupport && !topStressor) {
    summary =
      topSupport.category === "presence" || topSupport.category === "routine"
        ? `${topSupport.label} gives the entry a quiet sense of regulation, making the overall tone feel steadier and more present.`
        : `${topSupport.label} stands out as a meaningful support, giving the overall experience more ease than strain.`;
  } else if (topStressor && !topSupport) {
    summary = `${topStressor.label} is the clearest source of strain here, and the entry stays more ${primaryEmotion} than relieved.`;
  } else {
    summary = `The entry moves from ${timeline.start} through ${timeline.middle} and lands closer to ${timeline.end}, with an overall tone that feels ${primaryEmotion}.`;
  }

  const sentimentScore = clamp(Number(((positiveWeight - negativeWeight) / 6).toFixed(2)), -1, 1);
  const sentiment: JournalAnalysis["sentiment"] = {
    label: positiveWeight > 0.6 && negativeWeight > 0.6 ? "mixed" : sentimentScore > 0.2 ? "positive" : sentimentScore < -0.2 ? "negative" : "neutral",
    score: sentimentScore
  };

  const moodScore = clamp(Math.round(5.5 + sentimentScore * 3), 1, 10);
  const stressLevel = clamp(Math.round(3 + negativeWeight * 1.1), 1, 10);
  const energyLevel = clamp(Math.round(5 + (supports.some((item) => item.impact === "energizing") ? 2 : 0) - (signals.some((signal) => signal.label === "drained") ? 2 : 0)), 1, 10);
  const energyDirection: JournalAnalysis["energy_direction"] = stressLevel >= 7 ? "draining" : supports.length > 0 && positiveWeight >= negativeWeight ? "restorative" : positiveWeight > 0.8 && negativeWeight > 0.8 ? "mixed" : "neutral";

  const recurringTopics = unique([
    ...supports.map((item) => normalizeConceptLabel(item.label)).filter(shouldPromoteTopic),
    ...stressors.map((item) => normalizeConceptLabel(item.label)).filter(shouldPromoteTopic),
    liminalWeight >= 2.4 ? "transition" : null,
    groundedWeight >= 1.8 ? "presence" : null,
    signals.some((signal) => signal.label === "accepting") ? "acceptance" : null,
    isMeaningfulDiscomfort(sentences.find((sentence) => /truth|honest|clarity|clearer|allow/i.test(sentence.sentence)) ?? sentences[0]) ? "emotional honesty" : null
  ]).slice(0, 5);

  const themes = unique([
    supports.some((item) => item.category === "routine" || item.category === "presence") ? "self-regulation" : null,
    supports.some((item) => item.category === "connection") ? "connection" : null,
    supports.some((item) => item.category === "movement") ? "movement" : null,
    stressors.some((item) => item.category === "finance") ? "finance strain" : null,
    stressors.some((item) => item.category === "work") ? "work pressure" : null,
    stressors.some((item) => item.category === "conflict") ? "conflict" : null,
    liminalWeight >= 2.4 ? "transition" : null,
    signals.some((signal) => signal.label === "accepting") ? "acceptance" : null,
    signals.some((signal) => signal.label === "present") ? "presence" : null,
    isMeaningfulDiscomfort(sentences.find((sentence) => /truth|honest|clarity|clearer|allow/i.test(sentence.sentence)) ?? sentences[0]) ? "emotional honesty" : null,
    signals.some((signal) => signal.label === "mixed recovery") ? "emerging clarity" : null
  ]).slice(0, 6);

  return {
    summary,
    primaryEmotion,
    secondaryEmotions,
    customEmotionTerms: unique([
      ...sentences
        .filter((sentence) => /(felt|more present|enough|in between|between versions|steady|lighter|heavy|off|calm|tender|raw|clearer|honest|still)/i.test(sentence.sentence))
        .map((sentence) => sentence.sentence),
      primaryEmotion
    ]).slice(0, 6),
    joySources: unique([...supports.filter((item) => ["movement", "connection", "comfort", "resolution", "accomplishment", "routine"].includes(item.category)).map((item) => item.label)]).slice(0, 5),
    gratitudeMoments: unique([
      /grateful|thankful|appreciative/i.test(entry) ? "gratitude is named directly" : null,
      supports[0] && timeline.direction === "improved" ? `relief around ${supports[0].label}` : null,
      signals.some((signal) => signal.label === "accepting") ? "a quieter sense of enoughness" : null
    ]).slice(0, 4),
    wins: unique([
      ...supports.filter((item) => item.category === "accomplishment" || item.category === "resolution").map((item) => item.label),
      supports.some((item) => item.category === "presence") ? "stayed present instead of rushing past the moment" : null,
      supports.some((item) => item.category === "routine") ? "used a small routine to steady the day" : null
    ]).slice(0, 4),
    whatToRepeat: unique([...supports.filter((item) => item.impact === "grounding" || item.impact === "helpful").map((item) => normalizeConceptLabel(item.label))]).slice(0, 4),
    sentiment,
    moodScore,
    stressLevel,
    energyLevel,
    energyDirection,
    emotionalShift: {
      start_state: timeline.start,
      end_state: timeline.end,
      direction: timeline.direction
    },
    themes,
    recurringTopics,
    personalKeywords: unique([
      ...supports.map((item) => item.label).filter((item) => item.length > 3),
      ...stressors.map((item) => item.label).filter((item) => item.length > 3),
      findMatch(entry, /maybe that'?s enough/i) || null,
      findMatch(entry, /didn't solve anything but felt more present/i) || null,
      findMatch(entry, /in between versions of my life|in-between versions of my life/i) || null
    ]).slice(0, 5),
    notableEntities: unique([
      findMatch(entry, /\bMike\b/i) || null,
      /\bdog\b/i.test(entry) ? "dog" : null,
      /\blaundromat\b/i.test(entry) ? "laundromat" : null,
      /\bmanager\b/i.test(entry) ? "manager" : null,
      /\bfamily\b/i.test(entry) ? "family" : null,
      /\bcoffee\b/i.test(entry) ? "coffee" : null,
      /\btea\b/i.test(entry) ? "tea" : null
    ]),
    restorativeSignals,
    evidenceSpans: unique([
      ...stressors
        .slice(0, 2)
        .filter((item) => isEvidenceLabelMatch(item.label, item.evidence))
        .map((item) => JSON.stringify({ text: item.evidence, type: "stressor" as const, label: normalizeConceptLabel(item.label) })),
      ...supports
        .slice(0, 2)
        .filter((item) => isEvidenceLabelMatch(item.label, item.evidence))
        .map((item) => JSON.stringify({ text: item.evidence, type: "support" as const, label: normalizeConceptLabel(item.label) })),
      ...signals
        .filter((item) => ["negative", "grounded", "liminal"].includes(item.tone))
        .slice(0, 2)
        .map((item) => JSON.stringify({ text: item.evidence, type: "emotion" as const, label: normalizeConceptLabel(item.label) })),
      ...recurringTopics.slice(0, 1).map((item) => JSON.stringify({ text: item, type: "topic" as const, label: item }))
    ]).map((item) => JSON.parse(item) as JournalAnalysis["evidence_spans"][number]),
    notablePhrases: unique([
      findMatch(entry, /maybe that'?s enough/i) || null,
      findMatch(entry, /didn't solve anything but felt more present/i) || null,
      findMatch(entry, /in between versions of my life|in-between versions of my life/i) || null,
      ...sentences.slice(0, 2).map((sentence) => sentence.sentence)
    ]).slice(0, 4),
    reflectionTags: unique([primaryEmotion, ...themes, supports.length > 0 ? "grounding" : null, stressors.length > 0 ? "strain" : null]).slice(0, 6),
    confidence: {
      primary_emotion: rankedStates.length > 0 ? 0.86 : 0.5,
      triggers: stressors.length > 0 ? 0.82 : 0.42,
      coping_actions: supports.length > 0 ? 0.84 : 0.4,
      overall: signals.length > 0 || supports.length > 0 || stressors.length > 0 ? 0.8 : 0.46
    },
    supports,
    copingActions,
    stressors,
    triggers
  };
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
  const eventsResult = extractEvents(rawText);
  const stateResult = extractStateSignals(rawText);
  const supportsResult = detectSupportsAndCoping(rawText, eventsResult, stateResult);
  const stressorsResult = detectStressors(rawText, eventsResult, stateResult);
  const timeline = buildEmotionalTimeline(rawText, stateResult, supportsResult.supports, stressorsResult.stressors);
  const interpretation = synthesizeInterpretation(rawText, eventsResult, stateResult, supportsResult, stressorsResult, timeline);
  const safetyAssessment = detectSafetyAssessment(rawText);

  return validateAnalysis({
    raw_text: rawText,
    summary: interpretation.summary,
    primary_emotion: interpretation.primaryEmotion,
    secondary_emotions: interpretation.secondaryEmotions,
    custom_emotion_terms: interpretation.customEmotionTerms,
    joy_sources: interpretation.joySources,
    gratitude_moments: interpretation.gratitudeMoments,
    wins: interpretation.wins,
    what_to_repeat: interpretation.whatToRepeat,
    triggers: interpretation.triggers,
    stressors: interpretation.stressors,
    coping_actions: interpretation.copingActions,
    supports: interpretation.supports,
    sentiment: interpretation.sentiment,
    user_mood: null,
    user_stress: null,
    user_energy: null,
    mood_score: interpretation.moodScore,
    stress_level: interpretation.stressLevel,
    energy_level: interpretation.energyLevel,
    energy_direction: interpretation.energyDirection,
    emotional_shift: interpretation.emotionalShift,
    themes: interpretation.themes,
    recurring_topics: interpretation.recurringTopics,
    personal_keywords: interpretation.personalKeywords,
    notable_entities: interpretation.notableEntities,
    restorative_signals: interpretation.restorativeSignals,
    evidence_spans: [
      ...interpretation.evidenceSpans,
      ...safetyAssessment.evidence.map((item) => ({
        text: item,
        type: "safety" as const,
        label: "safety"
      }))
    ],
    notable_phrases: interpretation.notablePhrases,
    reflection_tags: interpretation.reflectionTags,
    confidence: interpretation.confidence,
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
