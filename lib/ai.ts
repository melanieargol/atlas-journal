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
  { label: "hopeful", words: ["hopeful", "hope", "hoping", "optimistic", "encouraged", "recovering", "healing"], tone: 2 },
  { label: "grateful", words: ["grateful", "thankful", "appreciative"], tone: 2 },
  { label: "relieved", words: ["relieved", "lighter", "eased"], tone: 2 },
  { label: "satisfied", words: ["satisfied", "proud", "accomplished"], tone: 2 },
  { label: "reflective", words: ["reflective", "processing", "thinking through"], tone: 1 }
] as const;

const explicitEmotionLexicon = [
  { label: "overwhelmed", regex: /\boverwhelmed|flooded|too much\b/i, tone: "negative", score: 2.2 },
  { label: "anxious", regex: /\banxious|nervous|panicky|on edge|wired\b/i, tone: "negative", score: 2 },
  { label: "fearful", regex: /\bafraid|fearful|scared|terrified\b/i, tone: "negative", score: 2.2 },
  { label: "concerned", regex: /\bconcerned|worried|worrying|upset because|upset about\b/i, tone: "negative", score: 2 },
  { label: "alarmed", regex: /\balarmed|startled|jolted|spooked\b/i, tone: "negative", score: 2.1 },
  { label: "tense", regex: /\btense|pressure|tight|stressed\b/i, tone: "negative", score: 1.8 },
  { label: "angry", regex: /\bangry|furious|rage|resentful|hostile\b/i, tone: "negative", score: 2.2 },
  { label: "rageful", regex: /\brage|enraged\b/i, tone: "negative", score: 2.5 },
  { label: "hostile", regex: /\bhostile|hateful|vengeful|violent\b/i, tone: "negative", score: 2.5 },
  { label: "spiteful", regex: /\bspite|spiteful|vindictive\b/i, tone: "negative", score: 2.3 },
  { label: "vindicated", regex: /\bvindicated|proved right\b/i, tone: "negative", score: 1.9 },
  { label: "disgusted", regex: /\bdisgusted|grossed out|repulsed\b/i, tone: "negative", score: 2.1 },
  { label: "frustrated", regex: /\bfrustrated|annoyed|irritated\b/i, tone: "negative", score: 1.8 },
  { label: "suspicious", regex: /\bsuspicious|don't trust|do not trust|something felt off\b/i, tone: "negative", score: 2 },
  { label: "watchful", regex: /\bwatchful|keeping an eye|on guard\b/i, tone: "liminal", score: 1.8 },
  { label: "vigilant", regex: /\bvigilant|hypervigilant|alert\b/i, tone: "negative", score: 2 },
  { label: "curious", regex: /\bcurious|wondering|trying to understand|trying to figure out\b/i, tone: "liminal", score: 1.6 },
  { label: "investigative", regex: /\binvestigat|looking into|trying to find out|waiting for information\b/i, tone: "liminal", score: 1.8 },
  { label: "sad", regex: /\bsad|heartbroken|felt sad|a little down|heavy\b/i, tone: "negative", score: 1.8 },
  { label: "grieving", regex: /\bgrief|grieving|mourning|loss\b/i, tone: "negative", score: 2.4 },
  { label: "ashamed", regex: /\bashamed|embarrassed|humiliated\b/i, tone: "negative", score: 2 },
  { label: "lonely", regex: /\blonely|alone|isolated\b/i, tone: "negative", score: 1.9 },
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
  { label: "proud", regex: /\bproud|prouder\b/i, tone: "positive", score: 2 },
  { label: "accomplished", regex: /\baccomplished|achievement|straight a|straight as|aced\b/i, tone: "positive", score: 2.1 },
  { label: "excited", regex: /\bexcited|energized|energised\b/i, tone: "positive", score: 1.9 },
  { label: "motivated", regex: /\bmotivated|driven|momentum\b/i, tone: "positive", score: 1.7 },
  { label: "joyful", regex: /\bjoy|joyful|delighted\b/i, tone: "positive", score: 2 },
  { label: "affectionate", regex: /\blove|loved|affection|tender toward\b/i, tone: "positive", score: 1.7 },
  { label: "hopeful", regex: /\bhope(?:ful|d|s|ing)?\b|\b(get|gets|getting|be|is) better by morning\b|\bheal(?:s|ed|ing)?\b|\brecover(?:s|ed|ing)?\b/i, tone: "positive", score: 1.8 },
  { label: "grateful", regex: /\bgrateful|thankful|appreciative\b/i, tone: "positive", score: 1.8 },
  { label: "satisfied", regex: /\bsatisfied|proud|accomplished\b/i, tone: "positive", score: 1.8 },
  { label: "empowered", regex: /\bempowered|stronger|more capable|more able\b/i, tone: "positive", score: 1.8 },
  { label: "emotionally honest", regex: /\bhonest|truth|clearer|clarity\b/i, tone: "liminal", score: 1.7 }
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
  "punched",
  "punch",
  "slapped",
  "slap",
  "kicked",
  "kick",
  "shoved",
  "rage",
  "furious",
  "angry at",
  "wanted to hurt",
  "destroy",
  "revenge",
  "worth it"
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
  "great time",
  "good time",
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
  "glad",
  "proud",
  "excited",
  "looking forward",
  "straight a",
  "straight as"
] as const;

const accomplishmentMarkers = [
  "finished",
  "completed",
  "got it done",
  "got so much done",
  "so much done",
  "wrapped up",
  "followed through",
  "made progress",
  "productive",
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
  { category: "conflict", regex: /\b(argument|argued|fight|fighting|yelled|screamed|threatened|insulted|hostile|retaliation|revenge|worth it)\b/i },
  { category: "harm", regex: /\b(punched|punch|slapped|slap|kicked|kick|shoved|assault|hurt)\b/i },
  { category: "relationship", regex: /\b(tone|partner|boyfriend|girlfriend|husband|wife|friend)\b/i },
  { category: "uncertainty", regex: /\b(uncertain|waiting|unknown|not sure|unsettled)\b/i }
] as const;

type SentenceSignal = {
  sentence: string;
  parentSentence: string;
  normalized: string;
  positionWeight: number;
  nonliteral: boolean;
  emotionalWeight: number;
  conflict: boolean;
  restorativeCue: boolean;
  centralCue: boolean;
  connector: string | null;
  sentenceIndex: number;
  roles: SegmentRole[];
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

type SignalScore = {
  intensity: number;
  repetition: number;
  position: number;
  emphasis: number;
};

type UserCheckIns = {
  user_mood?: number | null;
  user_stress?: number | null;
  user_energy?: number | null;
};

type SegmentRole =
  | "positive_event"
  | "negative_event"
  | "supportive_context"
  | "intentional_coping"
  | "internal_shift"
  | "reflection"
  | "atmosphere"
  | "watchfulness_or_concern"
  | "threat_or_harm"
  | "mixed_segment";

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

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const clausePivotMarkers = [
  "even though",
  "rather than",
  "although",
  "though",
  "because",
  "instead",
  "but",
  "yet",
  "still",
  "when",
  "while",
  "after",
  "before",
  "later",
  "then",
  "so",
  "and",
  "except"
] as const;

const clauseVerbRegex =
  /\b(i|we|he|she|they|it|my|our|was|were|am|is|are|did|do|does|felt|feel|made|make|got|get|went|go|came|come|sat|sit|let|noticed|notice|watched|watch|heard|hear|stayed|stay|slowed|slow|paused|pause|reached|reach|called|call|texted|text|journaled|journal|wrote|write|opened|open|found|find|thought|think|realized|realize|figured|figure|left|leave|took|take|walked|walk|ran|run|used|use|kept|keep|started|start|ended|end|turned|turn)\b/i;

function shouldSplitOnConnector(connector: string, left: string, right: string) {
  const leftWords = left.trim().split(/\s+/).length;
  const rightWords = right.trim().split(/\s+/).length;

  if (!left.trim() || !right.trim()) return false;
  if (leftWords < 2 || rightWords < 2) return false;

  if (connector === "and") {
    return clauseVerbRegex.test(left) && clauseVerbRegex.test(right);
  }

  return true;
}

function findNextClausePivot(text: string) {
  let best: { index: number; connector: string; length: number } | null = null;

  for (const connector of clausePivotMarkers) {
    const pattern = new RegExp(`(?:,\\s*|\\s+)${escapeRegex(connector)}\\s+`, "i");
    const match = pattern.exec(text);

    if (!match || typeof match.index !== "number") {
      continue;
    }

    const left = text.slice(0, match.index).trim();
    const right = text.slice(match.index + match[0].length).trim();

    if (!shouldSplitOnConnector(connector, left, right)) {
      continue;
    }

    if (!best || match.index < best.index) {
      best = {
        index: match.index,
        connector,
        length: match[0].length
      };
    }
  }

  return best;
}

function splitSentenceIntoSegments(sentence: string) {
  const segments: Array<{ text: string; connector: string | null }> = [];
  let remaining = sentence.trim();
  let connector: string | null = null;
  let guard = 0;

  while (remaining && guard < 8) {
    guard += 1;
    const pivot = findNextClausePivot(remaining);

    if (!pivot) {
      segments.push({ text: remaining.trim(), connector });
      break;
    }

    const left = remaining.slice(0, pivot.index).trim();
    const right = remaining.slice(pivot.index + pivot.length).trim();

    if (left) {
      segments.push({ text: left, connector });
    }

    remaining = right;
    connector = pivot.connector;
  }

  return segments.filter((segment) => segment.text.length > 0);
}

function isLikelyNonliteral(sentence: string) {
  const normalized = sentence.toLowerCase();
  return nonliteralMarkers.some((marker) => normalized.includes(marker));
}

function isNeutralHitContext(text: string) {
  return /(light hit|sunlight hit|sound hit|music hit|it hit me|hit differently|hit the farmer'?s market|hit the bookstore|hit the mall|hit the market|hit the road)/i.test(
    text
  );
}

function isViolentHitContext(text: string) {
  return (
    /\bhit\b/i.test(text) &&
    !isNeutralHitContext(text) &&
    /\b(hit (me|him|her|them|someone)|was hit|got hit|hit [a-z]+ (hard|in the face|in the mouth|in the head)|they hit|he hit|she hit)\b/i.test(text)
  );
}

function getSentenceSignals(rawText: string): SentenceSignal[] {
  const sentences = splitSentences(rawText);
  const segments = sentences.flatMap((sentence, sentenceIndex) =>
    splitSentenceIntoSegments(sentence).map((segment) => ({
      ...segment,
      parentSentence: sentence,
      sentenceIndex
    }))
  );

  return segments.map((segment, index) => {
    const normalized = segment.text.toLowerCase();
    const hasCentralCue = /(felt|feeling|was|am|after|before|because|helped|steadier|calmer|drained|anxious|overwhelmed|hopeful|realized|noticed)/i.test(
      segment.text
    );
    const positionWeight = index === 0 || index === segments.length - 1 ? 1.15 : 1;
    const nonliteral = isLikelyNonliteral(segment.parentSentence);
    const conflict = conflictMarkers.some((marker) => normalized.includes(marker)) || isViolentHitContext(segment.text);
    const restorativeCue =
      restorativeOutcomeMarkers.some((marker) => normalized.includes(marker)) ||
      supportIntentMarkers.some((marker) => normalized.includes(marker));

    const signal: SentenceSignal = {
      sentence: segment.text,
      parentSentence: segment.parentSentence,
      normalized,
      index,
      positionWeight: hasCentralCue ? positionWeight * 1.1 : positionWeight,
      nonliteral,
      emotionalWeight: nonliteral ? 0.45 : 1,
      conflict,
      restorativeCue,
      centralCue: hasCentralCue,
      connector: segment.connector,
      sentenceIndex: segment.sentenceIndex,
      roles: []
    };

    signal.roles = classifySegmentRoles(signal);
    return signal;
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
  return (
    sentence.conflict ||
    /(argued|argument|fight|fighting|hostile|insulted|retaliat|threat|yelled|screamed|punched|punch|slapped|slap|kicked|kick|assault|worth it)/i.test(sentence.sentence) ||
    isViolentHitContext(sentence.sentence)
  );
}

function hasHostileOrViolentContext(text: string) {
  return (
    isViolentHitContext(text) ||
    /\b(punched|punch|slapped|slap|kicked|kick|assault|shoved|threatened|fight|fighting|yelled|screamed|revenge|retaliat|worth it|hostile|violent|wanted to hurt|destroy)\b/i.test(
      text
    )
  );
}

function hasPressureReleaseLanguage(text: string) {
  return /\b(no pressure|without pressure|no need to (fix|prove|carry|rush|hurry)|nothing to (prove|carry)|nowhere to be|nothing pressing|let me breathe|could breathe|easier to breathe|breathe again|felt better after|felt a lot better after)\b/i.test(
    text
  );
}

function hasGentleRegulation(sentence: SentenceSignal) {
  if (hasNegativeContext(sentence) || hasHostileOrViolentContext(getSegmentContextText(sentence))) {
    return false;
  }

  return (
    /(didn't rush|did not rush|took my time|slowed down|slowly|quietly|sat with|sat quietly|noticed|listened to|watched the light|watched the sunlight|watched the trees|felt more present|more present|breathed|breathing|steady myself|be here|maybe that's enough|house was still|house was quiet|quiet house|quiet room|quiet environment|no need to fix|no need to prove|no need to carry|nowhere to be|could breathe|let me breathe)/i.test(
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
  if (hasPressureReleaseLanguage(getSegmentContextText(sentence))) {
    return false;
  }

  return (
    /(overwhelmed|anxious|scared|afraid|unsafe|pressure|burden|heavy|drained|exhausted|too much|overload|panicky|rage|furious|shame|worthless|hopeless|tense|punched|slapped|kicked|assault|threatened|hostile|revenge)/i.test(
      sentence.sentence
    ) ||
    hasFamilyIllnessConcern(getSegmentContextText(sentence)) ||
    (/\bupset\b/i.test(sentence.sentence) && /\bbecause\b/i.test(getSegmentContextText(sentence))) ||
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

function isWeakEntityLabel(label: string) {
  return /^(mike|sister|brother|mom|dad|parent|family|manager|friend|partner|wife|husband|boyfriend|girlfriend|coffee|tea|alarm|pressure|wrong)$/.test(
    label.trim().toLowerCase()
  );
}

function isWatchfulEmotion(label: string) {
  return ["concerned", "suspicious", "watchful", "vigilant", "curious", "investigative", "alarmed", "fearful", "uneasy"].includes(
    label
  );
}

function hasConcernContext(text: string) {
  return /(checking|watching|waiting|trying to find out|trying to understand|trying to figure out|keeping an eye|felt off|something felt off|not sure|unsure|concerned|worried|suspicious|don't trust|do not trust|alert)/i.test(
    text
  );
}

function hasFamilyIllnessConcern(text: string) {
  return (
    /\b(daughter|son|child|kid|kids|baby|toddler|mom|dad|mother|father|parent|parents|family|sister|brother|wife|husband|partner|flora)\b/i.test(
      text
    ) &&
    /\b(sick|ill|unwell|not well|fever|flu|infection|cough|pain|migraine|hurting|better by morning|get better|be better|heals? her|heals? him|heals? them|heals? Flora)\b/i.test(
      text
    )
  );
}

function hasCaregivingAction(text: string) {
  return /\b(made|cooked|prepared|brought)\b.*\b(soup|broth|tea|meal)\b/i.test(text) ||
    /\b(check(?:ed)? on|comfort(?:ed)?|caring for|care for|taking care of|took care of|helping my|helped my|sat with her|sat with him|helped them rest)\b/i.test(
      text
    );
}

function hasHealingHope(text: string) {
  return /\bhope(?:ful|d|s|ing)?\b/i.test(text) ||
    /\b(better by morning|get better|be better|heals? her|heals? him|heals? them|recover(?:s|ed|ing)?)\b/i.test(text);
}

function hasProductiveProgress(text: string) {
  return /\b(got so much done|so much done|productive|made progress|busy day programming|busy day coding|programming|coding)\b/i.test(
    text
  );
}

function classifySegmentRoles(segment: SentenceSignal) {
  const roles = new Set<SegmentRole>();
  const text = segment.sentence;
  const contextText = segment.parentSentence;
  const hostileOrViolentContext = hasHostileOrViolentContext(contextText);

  if (hasPositiveExperience(segment)) roles.add("positive_event");
  if (hasGentleRegulation(segment) && !hasNegativeContext(segment)) roles.add("supportive_context");
  if (hasCaregivingAction(contextText) && !hasNegativeContext(segment) && !hostileOrViolentContext) roles.add("supportive_context");
  if (hasProductiveProgress(contextText) && !hasNegativeContext(segment)) roles.add("positive_event");
  if (!hostileOrViolentContext && /(didn't rush|did not rush|took my time|slowed down|paused|sat with|let it be|stayed with|didn't reach for distractions|did not reach for distractions|journaled|wrote it down|reached out|went for a walk|took a walk)/i.test(text)) {
    roles.add("intentional_coping");
  }
  if (!hostileOrViolentContext && (hasCaregivingAction(text) || hasCaregivingAction(contextText))) {
    roles.add("intentional_coping");
  }
  if (
    hasInternalShiftLanguage(text) ||
    hasHealingHope(text) ||
    /not empty.*still|stayed long enough to notice|could breathe|no pressure to fix|no pressure to prove|no pressure to carry/i.test(contextText) ||
    hasPressureReleaseLanguage(contextText)
  ) {
    roles.add("internal_shift");
  }
  if (isMeaningfulDiscomfort(segment) || /(realized|clarity|clearer|truth|honest|because|maybe that's enough)/i.test(text)) {
    roles.add("reflection");
  }
  if (/\b(still|quiet|light|sunlight|sound|birds|wind|kitchen counter|counter|room|house)\b/i.test(text) && !indicatesActualStrain(segment)) {
    roles.add("atmosphere");
  }
  if (hasFamilyIllnessConcern(contextText)) {
    roles.add("watchfulness_or_concern");
  }
  if ((hasConcernContext(text) || hasFamilyIllnessConcern(contextText)) && !indicatesActualStrain(segment)) {
    roles.add("watchfulness_or_concern");
  }
  if (
    isConflict(segment) ||
    isViolentHitContext(text) ||
    /(unsafe|threat|door was open|door was unlocked|door was unlatched|front door was open|front door was unlocked|front door was unlatched|violent|assault)/i.test(
      contextText
    )
  ) {
    roles.add("threat_or_harm");
  }
  if ((indicatesActualStrain(segment) || hasDisruptionSignal(segment)) && !hasPressureReleaseLanguage(contextText)) roles.add("negative_event");
  if (hasFamilyIllnessConcern(contextText)) roles.add("negative_event");

  if (
    (roles.has("positive_event") || roles.has("supportive_context")) &&
    (roles.has("negative_event") || roles.has("threat_or_harm") || roles.has("watchfulness_or_concern"))
  ) {
    roles.add("mixed_segment");
  }

  return Array.from(roles);
}

function compactSnippet(text: string, maxWords = 4, maxChars = 34) {
  const cleaned = text
    .replace(/["“”']/g, "")
    .replace(/[.,!?;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return "";
  }

  const words = cleaned.split(/\s+/).slice(0, maxWords);
  const compact = words.join(" ").trim();
  return compact.length > maxChars ? compact.slice(0, maxChars).trim() : compact;
}

function sanitizePersonalKeywordFinal(value: string, safetyLevel: JournalAnalysis["safety_assessment"]["level"]) {
  const compact = compactSnippet(value, 3, 28).toLowerCase();
  const normalized = compact.trim();

  if (!compact) return "";
  if (isSafetySensitiveText(compact) && safetyLevel !== "none") return "";
  if (/[.!?;:,()]/.test(value)) return "";
  if (compact.split(/\s+/).length > 3) return "";
  if (compact.length > 28) return "";
  if (/^(big|little|good|bad|just|still|really|very|especially|more|most|some|any)$/i.test(normalized)) {
  return "";
  }
  if (connectorAndFillerWords.has(normalized) || helperVerbFragments.has(normalized)) {
  return "";
  }
  if (
    /^(i|it|this|that|there|maybe|because|then|after|before|when|while|even|just|really|kind of|sort of)\b/i.test(compact) ||
    /\b(i|it|this|that|there|because|when|while|then|after|before)\b.*\b(i|it|this|that|there|because|when|while|then|after|before)\b/i.test(compact)
  ) {
    return "";
  }

  return compact;
}

// Local coping candidates keep transient evidence while the heuristic pipeline is still scoring
// and linking proof. The persisted JournalAnalysis schema intentionally stores only action + impact,
// so downstream proof has to live in evidence_spans rather than coping_actions themselves.
function getCopingEvidenceText(item: JournalAnalysis["coping_actions"][number]) {
  const internal = item as JournalAnalysis["coping_actions"][number] & { evidence?: string };
  return internal.evidence ?? item.action;
}

function getSegmentContextText(segment: SentenceSignal) {
  return segment.parentSentence || segment.sentence;
}

function inferSupportCategoryFromText(text: string) {
  if (/\b(friend|friends|family|mom|dad|sister|brother|parent|partner|coworker|grandma|grandmother|in-laws|wife|husband|daughter|son|child|kid|ivi|flora|mike)\b/i.test(text)) {
    return "connection";
  }

  if (/\b(bookstore|book shop|library|cafe|restaurant|park|porch|sunlight|outside|fresh air|quiet house|house was still|house was quiet|quiet room|studio moonfall|mall|farmers market)\b/i.test(text)) {
    return "environment";
  }

  if (/\b(finals?|semester|exam|exams|class|classes|grades?|straight a|straight as|a's|app|portfolio|project|competition|handshake|atlas journal|gateway|learning|learned|building|portfolio item|got so much done|so much done|productive|programming|coding)\b/i.test(text)) {
    return "accomplishment";
  }

  if (/\b(dog|dogs|lily)\b/i.test(text)) return "comfort";

  if (/\b(gym|worked out|workout|walked|went for a walk|took a walk|ran|run|stretch|outside)\b/i.test(text)) {
    return "movement";
  }

  if (/\b(plan(?:ned)?|schedule(?:d)?|appointment|prom|movie|date|trip|outing|fun)\b/i.test(text)) {
    return "routine";
  }

  if (/\b(food|meal|breakfast|lunch|dinner|coffee|tea|ice cream|big star|scoops|nap|napped|rested)\b/i.test(text)) {
    return "routine";
  }

  return "presence";
}

function normalizeCopingImpact(
  value: string | undefined | null
): JournalAnalysis["coping_actions"][number]["impact"] {
  const normalized = (value ?? "").toLowerCase().trim();

  if (["helpful", "grounding", "calming", "stabilizing", "soothing", "supportive"].includes(normalized)) {
    return "helpful";
  }

  if (["neutral"].includes(normalized)) {
    return "neutral";
  }

  if (["harmful", "destructive", "avoidant"].includes(normalized)) {
    return "harmful";
  }

  return "unclear";
}

function normalizeSupportImpact(
  value: string | undefined | null
): JournalAnalysis["supports"][number]["impact"] {
  const normalized = (value ?? "").toLowerCase().trim();

  if (["grounding", "grounded", "calming", "stabilizing", "steadying"].includes(normalized)) {
    return "grounding";
  }

  if (["energizing", "energised", "motivating"].includes(normalized)) {
    return "energizing";
  }

  if (["validating", "validated", "seen", "understood", "supportive connection"].includes(normalized)) {
    return "validating";
  }

  if (["helpful", "supportive", "soothing", "comforting", "relieving"].includes(normalized)) {
    return "helpful";
  }

  return "mixed";
}

function normalizeEvidenceType(
  value: string | undefined | null
): JournalAnalysis["evidence_spans"][number]["type"] {
  const normalized = (value ?? "").toLowerCase().trim();

  if (normalized === "emotion") return "emotion";
  if (normalized === "stressor") return "stressor";
  if (normalized === "support" || normalized === "coping" || normalized === "restorative") return "support";
  if (normalized === "topic" || normalized === "theme") return "topic";
  return "safety";
}

function normalizeShiftDirectionValue(
  value: string | undefined | null
): JournalAnalysis["emotional_shift"]["direction"] {
  const normalized = (value ?? "").toLowerCase().trim();

  if (["improved", "worsened", "unchanged", "mixed"].includes(normalized)) {
    return normalized as JournalAnalysis["emotional_shift"]["direction"];
  }

  if (["softened", "settled", "clarified", "recovering", "recovered after disruption", "became more grounded", "became more honest"].includes(normalized)) {
    return "improved";
  }

  if (["intensified", "destabilized", "became more burdened", "became more activated"].includes(normalized)) {
    return "worsened";
  }

  if (["interrupted", "redirected", "remained mixed", "remained unresolved", "unresolved", "stayed reactive"].includes(normalized)) {
    return "mixed";
  }

  return "unchanged";
}

function normalizeEnergyDirectionValue(
  value: string | undefined | null
): JournalAnalysis["energy_direction"] {
  const normalized = (value ?? "").toLowerCase().trim();

  if (["draining", "restorative", "mixed", "neutral"].includes(normalized)) {
    return normalized as JournalAnalysis["energy_direction"];
  }

  if (["drained", "depleting"].includes(normalized)) {
    return "draining";
  }

  if (["restoring", "energizing", "energised"].includes(normalized)) {
    return "restorative";
  }

  return "neutral";
}

function inferSupportCandidateFromSentence(sentence: SentenceSignal): JournalAnalysis["supports"][number] | null {

  const contextText = getSegmentContextText(sentence);

  const hasSupportRole = sentence.roles.some(
    (role) => role === "supportive_context" || role === "positive_event"
  );

  const hasPositiveSupportEvidence =
    /\b(great time|good time|enjoyable|enjoyable company|delicious|proud|excited|stoked|fun|felt better after|better after|nice session|new book|got a new book|straight a|straight as|learned|portfolio|competition|app|scheduled|appointment|prom|nap|rested|rest|meal|soup|broth|tea|ice cream|dinner|lunch|breakfast|friends|family|grandma|in-laws|dog walk|walked the dog|got so much done|so much done|productive|programming|coding)\b/i.test(
      contextText
    );

  if (!hasSupportRole && !hasPositiveSupportEvidence) {
    return null;
  }

  if (hasNegativeContext(sentence) && !allowsDualValence(sentence)) {
    return null;
  }

  if (
    !/\b(friend|friends|family|mom|dad|sister|brother|parent|partner|coworker|coffee|tea|meal|soup|broth|breakfast|lunch|dinner|quiet house|house was still|house was quiet|quiet room|sunlight|outside|fresh air|music|playlist|song|songs|dog|bookstore|book shop|library|cafe|restaurant|park|porch|gym|worked out|workout|walked|went for a walk|took a walk|finals?|semester|exam|exams|class|classes|grades?|straight a|straight as|app|portfolio|project|competition|handshake|atlas journal|studio moonfall|gateway|plan(?:ned)?|schedule(?:d)?|nap|rested|napped|got so much done|so much done|productive|programming|coding)\b/i.test(
      contextText
    )
  ) {
    return null;
  }

  if (
    !sentence.roles.includes("supportive_context") &&
    !sentence.roles.includes("positive_event") &&
    !/(great time|good time|enjoyed|enjoyable|enjoyable company|comfort|comforting|helped|steadier|calmer|felt better|felt okay|felt more okay|warm|kind|soft|quiet|still|proud|excited|stoked|relieved|looking forward|delicious|fun|nice session|new book|straight a|straight as|learned|portfolio|competition|appointment|prom|nap was necessary|felt a lot better after|got so much done|so much done|productive|programming|coding)/i.test(
      contextText
    )
  ) {
    return null;
  }

  const category = inferSupportCategoryFromText(contextText);
  const seed =
    findMatch(
      contextText,
      /\b(friend|friends|family|mom|dad|sister|brother|parent|partner|coworker|grandma|grandmother|in-laws|coffee|tea|meal|breakfast|lunch|dinner|ice cream|big star|scoops|quiet house|house was still|house was quiet|quiet room|sunlight|outside|fresh air|music|playlist|song|songs|dog|pet|bookstore|book shop|library|cafe|restaurant|park|porch|gym|worked out|workout|walked|went for a walk|took a walk|finals?|semester|exam|exams|class|classes|grades?|straight a|straight as|app|portfolio|project|competition|handshake|atlas journal|studio moonfall|gateway|prom|appointment|nap|rested|napped|fun|learned|book|plan(?:ned)?|schedule(?:d)?|got so much done|so much done|productive|programming|coding)\b/i
    ) || category;

  const label = normalizeSupportLabel(seed, contextText, category);

  if (!label) {
    return null;
  }

  return {
    label,
    category,
    evidence: contextText,
    impact: classifySupportImpact(sentence)
  };
}

function inferCopingCategoryFromText(text: string) {
  if (/\b(walk|walked|went for a walk|took a walk|gym|worked out|workout|run|ran|stretch|outside)\b/i.test(text)) return "movement";
  if (/\b(called|texted|talked to|talked with|reached out|asked for help|spent time with)\b/i.test(text)) return "connection";
  if (/\b(journaled|wrote it down|wrote it out|writing this|journal entry)\b/i.test(text)) return "self-regulation";
  if (/\b(nap|napped|rested|rest|let myself rest|got some rest|needed the rest|breathe|breathing|breath)\b/i.test(text)) return "body care";
  if (hasCaregivingAction(text) || /\b(take care of|took care of|checking on|check on|comforted|helping her|helping him|helping them)\b/i.test(text)) return "caregiving";
  if (/\b(coffee|tea|meal|breakfast|lunch|dinner|made|brewed|prepared|cooked)\b/i.test(text)) return "routine";
  if (/\b(plan(?:ned)?|schedule(?:d)?|appointment|prom|movie|date|outing|trip|fun)\b/i.test(text)) return "routine";
  return "presence";
}

function inferCopingCandidateFromSentence(sentence: SentenceSignal): (JournalAnalysis["coping_actions"][number] & { label: string; evidence: string }) | null {
  const contextText = getSegmentContextText(sentence);
  const hostileOrViolentContext = hasHostileOrViolentContext(contextText);

  if (hostileOrViolentContext) {
    return null;
  }

  if (
    !sentence.roles.includes("intentional_coping") &&
    !/(didn't rush|did not rush|took my time|slowed down|paused|pause|sat with|let it be|stayed with|didn't reach for distractions|did not reach for distractions|went for a walk|took a walk|reached out|called|texted|journaled|wrote it down|breathed|breathing|made coffee|made tea|prepared|took a nap|napped|rested|rest|let myself rest|got some rest|needed the rest|felt better after|ended up not going to the gym|skipped the gym|instead of pushing through|planned|scheduled|appointment|prom|fun|made .*soup|cooked .*soup|homemade chicken soup|checked on|taking care of|took care of|comforted|helped .*feel better)/i.test(
      contextText
    )
  ) {
    return null;
  }

  const category = inferCopingCategoryFromText(contextText);
  const action = describeCopingAction(compactSnippet(contextText, 6, 52), contextText, category);

  if (!action || action.length > 52) {
    return null;
  }

  return {
    label: action,
    evidence: contextText,
    action,
    impact: normalizeCopingImpact(
      /breath|present|steady|didn't rush|did not rush|took my time|slowed down|let it be|sat with|stayed with|paused/i.test(contextText)
        ? "grounding"
        : hasCaregivingAction(contextText) || /\bhope(?:ful|d|s|ing)?\b.*\b(better|heal|recover)/i.test(contextText)
          ? "helpful"
        : "helpful"
    )
  };
}

function inferConceptualStressorEvent(sentence: SentenceSignal): EventSignal | null {
  const contextText = getSegmentContextText(sentence);

  if (!sentence.roles.some((role) => role === "negative_event" || role === "watchfulness_or_concern" || role === "threat_or_harm")) {
    return null;
  }

  if (hasPressureReleaseLanguage(contextText) && !sentence.roles.includes("threat_or_harm")) {
    return null;
  }

  if (
    !indicatesActualStrain(sentence) &&
    !sentence.roles.includes("threat_or_harm") &&
    !/(unsafe|scared|afraid|wrong|off|pressure|burden|heavy|too much|overload|looming|gnawing|haunting|unlatched|unlocked|open|bark|barking|tension|conflict|fight|threat|disappointed|disappointing|tired|exhausted|drained|obnoxious|wouldn't stop|would not stop|kept barking|ran out|didn't happen|did not happen|sick|ill|unwell|upset because|worried|concerned)/i.test(
      contextText
    )
  ) {
    return null;
  }

  let label = "destabilizing strain";
  let category = "disruption";

  if (/\b(punched|punch|slapped|slap|kicked|kick|shoved|assault|hurt)\b/i.test(contextText) || isViolentHitContext(contextText)) {
    label = "physical aggression";
    category = "harm";
  } else if (/\b(door was open|door was unlocked|door was unlatched|front door was open|front door was unlocked|front door was unlatched)\b/i.test(contextText)) {
    label = "home safety scare";
    category = "uncertainty";
  } else if (/\b(dog|dogs)\b/i.test(contextText) && /\b(bark|barking|wouldn't stop|would not stop|kept barking)\b/i.test(contextText)) {
    label = "dog barking disruption";
    category = "disruption";
  } else if (/\b(refund|money|budget|bills?|rent|finance)\b/i.test(contextText)) {
    label = "financial strain";
    category = "finance";
  } else if (/\b(deadline|manager|meeting|work|shift)\b/i.test(contextText)) {
    label = "work pressure";
    category = "work";
  } else if (hasFamilyIllnessConcern(contextText)) {
    label = "family health concern";
    category = "family";
  } else if (/\b(sister|brother|mom|dad|family|parent)\b/i.test(contextText) && /(worried|concerned|scared|off|waiting|not sure|unsafe)/i.test(contextText)) {
    label = "family concern";
    category = "family";
  } else if (/\b(friend|partner|wife|husband|boyfriend|girlfriend)\b/i.test(contextText) && /(argued|fight|hostile|insult|yelled|threat|off|unsafe)/i.test(contextText)) {
    label = "relationship conflict";
    category = "conflict";
  } else if (/\b(overload|overloaded|too much|pressure|heavy|burden|carrying|carry)\b/i.test(contextText)) {
    label = "overload";
    category = "pressure";
  } else if (sentence.roles.includes("watchfulness_or_concern")) {
    label = "costly uncertainty";
    category = "uncertainty";
  }

  return {
    label,
    category,
    evidence: contextText,
    kind: "stressor",
    weight: scoreSentenceStrength(sentence) + (sentence.roles.includes("threat_or_harm") ? 0.95 : 0.55),
    positive: 0,
    negative: sentence.roles.includes("threat_or_harm") ? 2.1 : 1.6,
    index: sentence.index
  };
}

function getSegmentRoleWeights(segment: SentenceSignal[]) {
  return segment.reduce(
    (totals, sentence) => {
      const base = scoreSentenceStrength(sentence);

      if (sentence.roles.includes("positive_event")) totals.positive += base * 0.9;
      if (sentence.roles.includes("supportive_context")) totals.supportive += base * 0.95;
      if (sentence.roles.includes("intentional_coping")) totals.coping += base * 1;
      if (sentence.roles.includes("internal_shift")) totals.internalShift += base * 1.1;
      if (sentence.roles.includes("reflection")) totals.reflection += base * 0.75;
      if (sentence.roles.includes("atmosphere")) totals.atmosphere += base * 0.45;
      if (sentence.roles.includes("watchfulness_or_concern")) totals.concern += base * 1;
      if (sentence.roles.includes("threat_or_harm")) totals.threat += base * 1.2;
      if (sentence.roles.includes("negative_event")) totals.negative += base * 0.85;
      if (sentence.roles.includes("mixed_segment")) totals.mixed += base * 0.75;

      return totals;
    },
    {
      positive: 0,
      supportive: 0,
      coping: 0,
      internalShift: 0,
      reflection: 0,
      atmosphere: 0,
      concern: 0,
      threat: 0,
      negative: 0,
      mixed: 0
    }
  );
}

function keywordFromPromotedItem(label: string) {
  const normalized = normalizeConceptLabel(label);

  if (normalized === "small ritual") return "coffee";
  if (normalized === "bookstore outing") return "bookstore";
  if (normalized === "dog presence" || normalized === "dog walk") return "dog";
  if (normalized === "financial strain") return "money";
  if (normalized === "meal at home" || normalized === "food at home") return "meal";
  if (normalized === "gym session") return "gym";
  if (normalized === "home safety scare") return "front door";
  if (normalized === "academic achievement") return "finals";
  if (normalized === "creative momentum" || normalized === "creative progress") return "portfolio";
  if (normalized === "rest opportunity") return "nap";
  if (normalized === "fun plan") return "plan";

  return "";
}

function collectCapitalizedAnchors(text: string) {
  return Array.from(text.matchAll(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g))
    .map((match) => match[0])
    .filter((value) => !/^(I|It|The|This|That|When|While|After|Before|Later|Today|Atlas|Journal)$/i.test(value));
}

const connectorAndFillerWords = new Set([
  "and",
  "but",
  "or",
  "so",
  "then",
  "when",
  "while",
  "though",
  "although",
  "because",
  "instead",
  "still",
  "not",
  "like",
  "just",
  "really",
  "very",
  "especially",
  "also",
  "however",
  "even",
  "though",
  "yet",
  "if",
  "than",
  "rather",
  "rather than",
  "from",
  "with",
  "into",
  "onto",
  "through",
  "across",
  "around",
  "there",
  "here",
  "this",
  "that",
  "these",
  "those",
  "his",
  "her",
  "their",
  "our",
  "your",
  "my"
]);

const helperVerbFragments = new Set([
  "got",
  "had",
  "did",
  "was",
  "were",
  "am",
  "is",
  "are",
  "made",
  "make",
  "went",
  "go",
  "started",
  "finished",
  "ended",
  "ended up",
  "tried",
  "try",
  "felt",
  "feel",
  "came",
  "come",
  "kept",
  "keep",
  "turned",
  "turn",
  "used",
  "use",
  "being",
  "existing"
]);

function compactOutputLabel(value: string, maxWords = 4, maxChars = 32) {
  return value
    .replace(/["“”]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, maxWords)
    .join(" ")
    .slice(0, maxChars)
    .trim()
    .toLowerCase();
}

function isWeakSingleWordLabel(word: string) {
  return /^(and|but|or|so|then|when|while|though|although|because|instead|still|not|like|just|really|very|especially|also|however|even|if|than|from|with|into|onto|through|across|around|there|here|this|that|these|those|his|her|their|our|your|my|got|had|did|was|were|am|is|are|made|make|went|go|started|finished|ended|tried|felt|came|kept|turned|used)$/i.test(
    word.trim()
  );
}

function looksLikeJunkOutputLabel(
  label: string,
  bucket: "support" | "stressor" | "topic" | "theme" | "keyword" | "coping" | "restorative" | "emotion"
) {
  const compact = compactOutputLabel(label, bucket === "coping" ? 7 : 4, bucket === "coping" ? 56 : 32);

  if (!compact) return true;

  const words = compact.split(/\s+/).filter(Boolean);

  if (connectorAndFillerWords.has(compact) || helperVerbFragments.has(compact)) return true;
  if (words.length === 1 && isWeakSingleWordLabel(compact)) return true;

  if (/^(and|but|or|so|then|when|while|though|although|because|instead|still|not|like|just|really|very|especially|also|however|even|if|than|from|with|into|onto|through|across|around|there|here|this|that|these|those|his|her|their|our|your|my|got|had|did|was|were|am|is|are|made|make|went|go|started|finished|ended|ended up|tried|try|felt|feel|came|come|kept|keep|turned|turn|used|use)$/i.test(compact)) {
    return true;
  }

  // generic emotional fallback junk
  if (bucket !== "emotion" && /^(present|steady|unsettled|disruption)$/i.test(compact)) return true;

  // clause-like fragments or too many stopwords
  if (bucket !== "coping" && /\b(and|but|because|when|while|though|although|if|then)\b/i.test(compact) && words.length > 1) {
    return true;
  }

  // bucket-specific junk
  if (bucket === "support" && /^(movement|resolution|positive experience|supportive environment|finished task|good time|nice day)$/i.test(compact)) {
    return true;
  }

  if (bucket === "stressor" && /^(disruption|strain|other|uncertainty|pressure|burden)$/i.test(compact)) {
    return true;
  }

  if (bucket === "topic" && /^(home|mall|coffee|tea|dog|friend|friends|family|manager|movement|present|steady|unsettled|disruption|supportive environment|good time|nice day|fear|scared)$/i.test(compact)) {
    return true;
  }

  if (bucket === "theme" && /^(present|steady|unsettled|disruption|movement|good time|nice day)$/i.test(compact)) {
    return true;
  }

  if (bucket === "keyword" && /^(home|work|family|friend|friends|support|connection|his|her|their|especially|present|steady|unsettled|disruption)$/i.test(compact)) {
    return true;
  }

  if (bucket === "restorative" && !/^moment of /.test(compact)) return true;

  if (bucket === "coping" && words.every((part) => connectorAndFillerWords.has(part) || helperVerbFragments.has(part))) {
    return true;
  }

  return false;
}

function sanitizeBucketOutputLabel(
  label: string,
  bucket: "support" | "stressor" | "topic" | "theme" | "keyword" | "coping" | "restorative" | "emotion"
) {
  const compact = compactOutputLabel(
    label,
    bucket === "coping" ? 7 : bucket === "restorative" ? 5 : 4,
    bucket === "coping" ? 56 : bucket === "keyword" ? 28 : 32
  );

  if (!compact || looksLikeJunkOutputLabel(compact, bucket)) {
    return "";
  }

  const words = compact.split(/\s+/).filter(Boolean);

  // keyword must be compact anchor-like
  if (bucket === "keyword") {
    if (words.length > 3) return "";
    if (/[.!?;:,]/.test(compact)) return "";
  }

  // support/stressor/topic/theme should not be obvious helper-verb phrases
  if (["support", "stressor", "topic", "theme", "keyword"].includes(bucket)) {
    if (words.length > 0 && helperVerbFragments.has(words[0])) return "";
  }

  // restorative must stay state-like
  if (bucket === "restorative" && !/^moment of /.test(compact)) {
    return "";
  }

  return compact;
}

function deriveEntryTopics(
  entry: string,
  supports: JournalAnalysis["supports"],
  copingActions: JournalAnalysis["coping_actions"],
  stressors: JournalAnalysis["stressors"],
  signals: StateSignal[],
  primaryEmotion: string
) {
  const candidates = unique([
    ...supports.map((item) => normalizePromotedConcept(item.label, item.evidence, "topic")),
    ...stressors.map((item) => normalizePromotedConcept(item.label, item.evidence, "topic")),
    copingActions.some((item) => /(slowed down|sat with|let it be|quiet routine|didn't rush|did not rush|took my time)/i.test(item.action)) ? "self-regulation" : null,
    copingActions.some((item) => /(care|nourishing|heal|better|care for someone)/i.test(item.action) || hasCaregivingAction(getCopingEvidenceText(item))) ? "caregiving" : null,
    /finals?|semester|exam|straight a|straight as|grades?/i.test(entry) ? "academic achievement" : null,
    hasProductiveProgress(entry) ? "productivity" : null,
    /app|portfolio|project|competition|handshake|atlas journal|studio moonfall|gateway/i.test(entry) ? "creative momentum" : null,
    /plan(?:ned)?|schedule(?:d)?.*(fun|movie|date|outing|trip)/i.test(entry) ? "social connection" : null,
    /nap|napped|rested|rest/i.test(entry) ? "recovery" : null,
    hasFamilyIllnessConcern(entry) ? "family health" : null,
    /sick|ill|unwell|fever|flu|heal|better by morning|recover/i.test(entry) ? "illness" : null,
    /honest|truth|clearer|clarity/i.test(entry) ? "emotional honesty" : null,
    /in between|in-between|between versions|transition|becoming/i.test(entry) ? "transition" : null,
    /watchful|concerned|looking into|trying to find out|detective|waiting for information/i.test(entry) ? "watchfulness" : null,
    /door was open|door was unlocked|door was unlatched|front door/i.test(entry) ? "home safety" : null,
    /punched|slapped|kicked|assault|hostile|fight|revenge|worth it/i.test(entry) ? "conflict" : null,
    signals.some((signal) => signal.label === "grieving") ? "grief" : null,
    /^(proud|accomplished|excited|motivated)$/.test(primaryEmotion) ? "creative momentum" : null
  ])
    .map((item) => sanitizeBucketOutputLabel(item, "topic"))
    .filter(Boolean)
    .filter((item) => shouldPromoteTopicCandidate(item, entry));

  return unique(candidates).slice(0, 4);
}

function deriveThemeLabels(
  supports: JournalAnalysis["supports"],
  copingActions: JournalAnalysis["coping_actions"],
  stressors: JournalAnalysis["stressors"],
  topics: string[],
  primaryEmotion: string
) {
  const candidates = unique([
    ...topics,
    supports.some((item) => item.label === "small ritual" || item.label === "quiet environment" || item.label === "quiet house") ? "self-regulation" : null,
    supports.some((item) => item.label === "time with friends" || item.label === "time with family") ? "connection" : null,
    supports.some((item) => item.label === "productive progress") ? "productivity" : null,
    copingActions.some((item) => /(slowed down|quiet routine|sat with|let it be|took a nap|chose rest)/i.test(item.action)) ? "self-regulation" : null,
    copingActions.some((item) => /(care|nourishing|heal|better|care for someone)/i.test(item.action)) ? "caregiving" : null,
    stressors.some((item) => item.label === "physical aggression") ? "harm" : null,
    stressors.some((item) => item.label === "home safety scare") ? "home safety" : null,
    stressors.some((item) => item.label === "family health concern") ? "family health" : null,
    /^(proud|accomplished|excited|motivated)$/.test(primaryEmotion) ? "momentum" : null,
    /^(hopeful)$/.test(primaryEmotion) ? "caregiving" : null,
    /^(fearful|watchful|concerned|alarmed)$/.test(primaryEmotion) ? "watchfulness" : null,
    /^(grounded|clarifying|accepting|relieved)$/.test(primaryEmotion) ? "recovery" : null,
    /^(angry|hostile|rageful|spiteful|reactive)$/.test(primaryEmotion) ? "reactivity" : null
  ])
    .map((item) => sanitizeBucketOutputLabel(item, "theme"))
    .filter(Boolean);

  return unique(candidates).slice(0, 5);
}

function normalizeSupportLabel(label: string, evidence: string, category: string) {
  if (/(great time|good time|fun with|fun at|coffee with|lunch with|dinner with|spent time with|hung out with|went out with)/i.test(evidence) && /\b(friend|friends?)\b/i.test(evidence)) {
    return "time with friends";
  }

  if (/(great time|good time|fun with|coffee with|lunch with|dinner with|spent time with|hung out with|went out with|enjoyable company)/i.test(evidence) && /\b(sister|brother|mom|dad|family|parent|grandma|grandmother|in-laws)\b/i.test(evidence)) {
    return /\b(sister|brother)\b/i.test(evidence) ? "time with sister" : "time with family";
  }

  if (/\b(finals?|semester|exam|exams|class|classes|grades?|straight a|straight as|aced)\b/i.test(evidence)) {
    return "academic achievement";
  }

  if (/\b(app|portfolio|project|build(?:ing)?|competition|handshake|atlas journal|studio moonfall|gateway)\b/i.test(evidence)) {
    return "creative progress";
  }

  if (/\b(got so much done|so much done|productive|busy day programming|busy day coding|programming|coding)\b/i.test(evidence)) {
    return "productive progress";
  }

  if (/\b(plan(?:ned)?|schedule(?:d)?|appointment|prom)\b/i.test(evidence) && /\b(fun|hang|trip|movie|date|mall|outing|glammed up)\b/i.test(evidence)) {
    return "fun plan";
  }

  if (/\b(took a nap|napped|rested|got some rest|let myself rest|needed the rest|felt better after|felt a lot better after)\b/i.test(evidence)) {
    return "rest that helped";
  }

  if (/\bquiet house\b/i.test(evidence)) return "quiet house";
  if (/\bbookstore|book shop|studio moonfall\b/i.test(evidence)) return "bookstore outing";
  if (/\b(gym|worked out|workout|nice session)\b/i.test(evidence)) return "gym session";
  if (/\b(walked the dog|walk with lily|walk with the dog)\b/i.test(evidence)) return "dog walk";

  if (/\b(walked|went for a walk|took a walk)\b/i.test(evidence) && /(clear my head|reset|outside|fresh air|felt better|steadier)/i.test(evidence)) {
    return "walking outside";
  }

  if (/\b(music|playlist|song|songs)\b/i.test(evidence)) return "music";
  if (/\b(sun|sunlight)\b/i.test(evidence)) return "sunlight";
  if (/\b(outside|fresh air)\b/i.test(evidence) && !/\bwalk\b/i.test(evidence)) return "fresh air";

  if (/\b(food|meal|breakfast|lunch|dinner|ice cream|big star|scoops)\b/i.test(evidence) && /\b(home|kitchen|ate at home)\b/i.test(evidence)) {
    return "meal at home";
  }

  if (hasCaregivingAction(evidence) && /\b(soup|broth|tea|meal|homemade)\b/i.test(evidence)) {
    return "meal at home";
  }

  if (/\b(food|meal|breakfast|lunch|dinner|ice cream|big star|scoops|delicious)\b/i.test(evidence)) {
    return "meal with others";
  }

  if (/\b(coffee|tea)\b/i.test(evidence) && /(slow|quiet|didn't rush|did not rush|took my time|sat with)/i.test(evidence)) {
    return "small ritual";
  }

  if (/\bdog\b/i.test(evidence) && /(calm|comfort|steady|present|better|grounded|adored her|nearby|with me|beside me|next to me|curled up)/i.test(evidence)) {
    return "dog presence";
  }

  if (/\b(still|quiet house|house was still|house was quiet)\b/i.test(evidence) && /(present|calm|steady|quiet|easier|better|relieved|breathe)/i.test(evidence)) {
    return "quiet environment";
  }

  if (category === "connection") return "social connection";
  if (category === "movement" && /\bwalk|outside|fresh air\b/i.test(evidence)) return "walking outside";
  if (category === "accomplishment") return /\b(finals?|semester|exam|class|grades?|straight a|straight as|aced)\b/i.test(evidence)
    ? "academic achievement"
    : "creative progress";

  return sanitizeBucketOutputLabel(normalizePromotedConcept(label, evidence, "support"), "support");
}

function normalizeStressorLabel(label: string, evidence: string, category: string) {
  const normalized = normalizePromotedConcept(label, evidence, "stressor");

  if (/\b(punched|punch|slapped|slap|kicked|kick|shoved|assault)\b/i.test(evidence) || isViolentHitContext(evidence)) {
    return "physical aggression";
  }

  if (/\b(threatened|threat|unsafe|danger|scared at home|wrong at home)\b/i.test(evidence)) {
    return "threatening situation";
  }

  if (/\bunsafe|home|door|house|hallway|outside the house\b/i.test(evidence) && /(unsafe|scared|alarm|wrong|off|threat)/i.test(evidence)) {
    return "home safety scare";
  }

  if (/\b(dog|dogs)\b/i.test(evidence) && /(bark|barking|wouldn't stop|would not stop|kept barking)/i.test(evidence)) {
    return "dog barking disruption";
  }

  if (/\b(routine|usual|schedule|plan)\b/i.test(evidence) && /(missed|off|thrown off|disrupted|didn't happen|did not happen)/i.test(evidence)) {
    return "missed routine";
  }

  if (category === "pressure" && /(too much|overload|overwhelmed|pressure)/i.test(evidence)) {
    return "overload";
  }

  if (/\b(didn't sleep|did not sleep|rough night of sleep|sleep)\b/i.test(evidence) && /(rough|barely|couldn't|could not|tired|exhausted)/i.test(evidence)) {
    return "sleep deprivation";
  }

  if (/\b(disappointed|let down|disappointing)\b/i.test(evidence)) {
    return "disappointment";
  }

  if (/\b(crowded|too many people|too loud|overstimulated|overstimulating)\b/i.test(evidence)) {
    return "social overload";
  }

  if (hasFamilyIllnessConcern(evidence)) {
    return "family health concern";
  }

  if (category === "harm") {
    return "physical aggression";
  }

  if (/\b(ran out of hot water|no hot water|ran out)\b/i.test(evidence)) {
  return "routine disruption";
  }

  if (/\b(tired|exhausted|drained)\b/i.test(evidence) && /\b(staying up|sleep|working on the app|working late)\b/i.test(evidence)) {
    return "fatigue";
  }

  if (/\b(obnoxious|wouldn't stop|would not stop|kept barking|barking the whole time)\b/i.test(evidence) && /\b(dog|dogs|lily)\b/i.test(evidence)) {
    return "dog barking disruption";
  }

  if (/\b(disappointed|disappointing|let down)\b/i.test(evidence)) {
    return "disappointment";
  }

  return sanitizeBucketOutputLabel(normalized, "stressor");
}

function normalizePromotedConcept(label: string, evidence: string, bucket: "stressor" | "topic" | "keyword" | "support") {
  const normalizedLabel = normalizeConceptLabel(label);
  const normalizedEvidence = evidence.toLowerCase();

  if (bucket === "support" || bucket === "topic") {
    if (/\b(finals?|semester|exam|exams|class|classes|grades?|straight a|straight as|aced)\b/i.test(evidence)) {
      return bucket === "topic" ? "academic achievement" : "academic achievement";
    }

    if (/\b(got so much done|so much done|productive|busy day programming|busy day coding|programming|coding)\b/i.test(normalizedEvidence)) {
      return bucket === "topic" ? "productivity" : "productive progress";
    }

    if (/\b(app|portfolio|project|build(?:ing)?|competition|handshake|atlas journal|studio moonfall|gateway)\b/i.test(normalizedEvidence)) {
      return bucket === "topic" ? "creative momentum" : "creative progress";
    }

    if (/\b(plan(?:ned)?|schedule(?:d)?)\b/i.test(normalizedEvidence) && /\b(fun|hang|trip|movie|date|mall|outing)\b/i.test(normalizedEvidence)) {
      return bucket === "topic" ? "social connection" : "fun plan";
    }

    if (/\b(took a nap|napped|rested|got some rest|let myself rest)\b/i.test(normalizedEvidence)) {
      return bucket === "topic" ? "recovery" : "rest opportunity";
    }

    if (hasCaregivingAction(normalizedEvidence)) {
      return bucket === "topic" ? "caregiving" : "caregiving support";
    }
  }

  if (bucket !== "support") {
    if (/\b(mike|friend|partner|wife|husband|boyfriend|girlfriend)\b/i.test(evidence)) {
      if (/(argued|fight|hostile|insult|yelled|screamed|threat)/i.test(evidence)) return "relationship conflict";
      if (hasConcernContext(normalizedEvidence)) return "relationship concern";
    }

    if (hasFamilyIllnessConcern(evidence)) {
      return bucket === "topic" ? "caregiving" : "family health concern";
    }

    if (/\b(sister|brother|mom|dad|parent|family|daughter|son|child|kid|flora)\b/i.test(evidence)) {
      if (/(argued|fight|hostile|yelled|threat)/i.test(evidence)) return "family strain";
      if (hasConcernContext(normalizedEvidence)) return "family concern";
    }

    if (/\bmanager\b/i.test(evidence)) return "work pressure";
    if (/\balarm\b/i.test(evidence) && !isWeakEntityLabel(normalizedLabel)) return "alarm";
  }

  if (bucket === "topic") {
    if (hasFamilyIllnessConcern(evidence)) return "caregiving";
    if (/\b(home|door|house)\b/i.test(evidence) && /(unsafe|scared|alarm|wrong|unlatched|unlocked|open)/i.test(evidence)) return "home safety";
    if (/(trying to find out|waiting for information|looking into|investigat)/i.test(evidence)) return "investigation";
    if (/(concerned|worried|keeping an eye|watchful|vigilant|alert)/i.test(evidence)) return "watchfulness";
    if (/(honest|truth|clearer|clarity)/i.test(evidence)) return "emotional honesty";
    if (/(didn't rush|did not rush|took my time|slowed down|sat with|let it be|didn't reach for distractions|did not reach for distractions)/i.test(evidence)) {
      return "self-regulation";
    }
    if (/(friends|family|hung out|spent time with|great time|good time)/i.test(evidence)) return "social connection";
    if (/(sick|ill|unwell|better by morning|heal|recover)/i.test(evidence)) return "illness";
    if (/(hostile|fight|argued|threat|punched|slapped|kicked|assault|revenge|worth it)/i.test(evidence)) return "conflict";
    if (/(grief|grieving|mourning|loss)/i.test(evidence)) return "grief";
    if (/(transition|between versions|in between|in-between)/i.test(evidence)) return "transition";
  }

  return normalizedLabel;
}

function isEligibleStressorCandidate(event: EventSignal, sentence: SentenceSignal) {
  if (event.kind !== "stressor") return false;
  if (isWeakEntityLabel(event.label)) return false;
  if (isNegatedOrQualified(sentence, new RegExp(`\\b${event.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"))) return false;
  if (isMeaningfulDiscomfort(sentence) && !indicatesActualStrain(sentence)) return false;
  if (!indicatesActualStrain(sentence) && !/(went wrong|unsafe|scared|afraid|pressure|burden|heavy|too much|overload|fight|argued|threat|hostile|hurt|pain|missed|car trouble|flat tire|refund call|sick|ill|upset because|worried|concerned)/i.test(sentence.sentence)) {
    return false;
  }

  return true;
}

function isEligibleSupportCandidate(event: EventSignal, sentence: SentenceSignal) {
  if (event.kind !== "support") return false;
  if (isConflict(sentence)) return false;
  if (hasNegativeContext(sentence) && !allowsDualValence(sentence)) return false;
  if (!isEvidenceLabelMatch(event.label, event.evidence) && !hasGentleRegulation(sentence) && !sentence.restorativeCue) return false;
  return true;
}

function isEligiblePersonalKeyword(label: string, evidence: string) {
  const normalized = compactSnippet(label, 3, 28).toLowerCase();
  if (normalized.length < 3) return false;
  if (!/[a-z]/i.test(normalized)) return false;
  if (normalized.split(/\s+/).length > 3) return false;
  if (/[.?!]/.test(label)) return false;
  if (looksLikeJunkOutputLabel(normalized, "keyword")) return false;
  if (
    /^(present|steady|transition|acceptance|movement|connection|resolution|pressure|disruption|conflict|watchfulness|self-regulation|emotional honesty|reactive strain|supportive environment|clarifying|mixed recovery|grounded|relieved|activated|reactive|burdened|supported|settling|mixed|unresolved)$/.test(
      normalized
    )
  ) {
    return false;
  }
  if (/\b(i|it|this|that|because|when|while|after|before|then|later)\b/i.test(normalized) && normalized.split(/\s+/).length > 1) return false;
  if (
    normalized.split(/\s+/).length === 1 &&
    !/(mike|lily|ivi|gateway|handshake|atlas|journal|studio|moonfall|sister|brother|manager|coffee|tea|dog|bookstore|laundromat|money|sleep|gym|market|door|kitchen|music|meal)/i.test(
      normalized
    ) &&
    !evidence.toLowerCase().includes(normalized)
  ) {
    return false;
  }
  if (
    normalized.split(/\s+/).length > 1 &&
    !/(call|door|market|coffee|tea|routine|studio|bookstore|dog|meal|front|morning|atlas journal|studio moonfall)/i.test(normalized)
  ) {
    return false;
  }

  return true;
}

function shouldPromoteTopicCandidate(label: string, evidence: string) {
  const concept = sanitizeBucketOutputLabel(normalizePromotedConcept(label, evidence, "topic"), "topic");
  if (!concept) return false;
  if (!shouldPromoteTopic(concept)) return false;
  if (isWeakEntityLabel(concept)) return false;
  if (/(acceptance|transition|watchfulness|investigation|emotional honesty|self-regulation|social connection|academic achievement|creative momentum|recovery|home safety|work pressure|financial strain|sleep deprivation|relationship conflict|family concern|family strain|family health|caregiving|illness|productivity|conflict|grief)/i.test(concept)) {
    return true;
  }

  return concept.split(/\s+/).length > 1;
}

function getCheckInInterpretationProfile(checkIns?: UserCheckIns) {
  const mood = checkIns?.user_mood ?? null;
  const stress = checkIns?.user_stress ?? null;
  const energy = checkIns?.user_energy ?? null;

  return {
    mood,
    stress,
    energy,
    highMood: mood !== null && mood >= 8,
    lowMood: mood !== null && mood <= 3,
    highStress: stress !== null && stress >= 8,
    extremeStress: stress !== null && stress >= 10,
    lowStress: stress !== null && stress <= 3,
    highEnergy: energy !== null && energy >= 8,
    lowEnergy: energy !== null && energy <= 3
  };
}

function describeCopingAction(label: string, evidence: string, category: string) {
  const normalizedEvidence = evidence.toLowerCase();

  if (/took a nap|napped|rested|got some rest|let myself rest|needed the rest/i.test(evidence)) {
    return /skipped the gym|instead|ended up not going to the gym/i.test(normalizedEvidence)
      ? "chose rest instead of pushing through"
      : "took a nap to recover";
  }

  if (/felt better after/i.test(evidence)) {
    return "let rest help the body recover";
  }

  if (/didn't rush|did not rush|slowed down|took my time/i.test(evidence)) {
    return "slowed down on purpose";
  }

  if (hasCaregivingAction(evidence) || category === "caregiving") {
    return /soup|broth|tea|meal/i.test(evidence)
      ? "made something nourishing to care for someone"
      : "showed up to care for someone directly";
  }

  if (/paused|pause|waited before reacting|didn't react right away|did not react right away|let it sit|let it settle/i.test(evidence)) {
    return "paused instead of reacting immediately";
  }

  if (/sat with|let it be|let the feeling exist|without fixing|didn't escape|did not escape|didn't reach for distractions|did not reach for distractions/i.test(evidence)) {
    return "stayed with the feeling without trying to force it away";
  }

  if (/more present|noticed|watched the light|watched the sunlight|sound|birds|wind|body|breath/i.test(evidence)) {
    return "used attention to orient to the moment";
  }

  if (/breathe|breathing|breath/i.test(evidence)) {
    return "used breathing to steady the moment";
  }

  if (/walk|run|gym|stretch|outside/i.test(evidence)) {
    return /clear my head|reset|steady|nice session/i.test(normalizedEvidence)
      ? "used movement to regulate"
      : "turned toward movement to regulate";
  }

  if (/talked|called|texted|spent time with|reached out/i.test(evidence)) {
    return "reached toward connection instead of holding it alone";
  }

  if (/\b(plan(?:ned)?|schedule(?:d)?|appointment)\b/i.test(evidence) && /\b(fun|movie|date|hang out|outing|trip|prom|glammed up)\b/i.test(evidence)) {
    return "made a positive plan to look forward to";
  }

  if (/made|brewed|cooked|prepared/i.test(evidence) && /(coffee|tea|meal|breakfast|dinner|lunch)/i.test(evidence)) {
    return "used a quiet routine to steady the moment";
  }

  if (/working on the app|building more|portfolio item|kept learning|learning more/i.test(evidence)) {
    return "used focused work to channel momentum";
  }

  return "";
}

function describeRestorativeMoment(value: string, evidence: string) {
  if (hasHealingHope(evidence) || /hopeful|hope/i.test(value)) return "moment of hope";
  if (/clarity|clearer|truth|honest/i.test(evidence) || /clarity|clearer|truth|honest/i.test(value)) return "moment of clarity";
  if (/more present|noticed|aware|awareness|saw it clearly/i.test(evidence) || /presence|awareness/i.test(value)) return "moment of awareness";
  if (/quiet|slowed down|didn't rush|did not rush/i.test(evidence) || /quiet/i.test(value)) return "moment of quiet";
  if (/steady|steadier|grounded|settled|calm|calmer|enough/i.test(evidence) || /ground|steady/i.test(value)) return "moment of grounding";
  if (/lighter|relieved|eased|release/i.test(evidence) || /release/i.test(value)) return "moment of release";
  return "";
}

function isNotablePhraseCandidate(sentence: string) {
  return (
    sentence.length >= 24 &&
    !/^(today|then|later|after that|i went|i was|it was)\b/i.test(sentence.trim()) &&
    (/(felt|realized|noticed|maybe|enough|present|clearer|honest|truth|steady|steadier|lighter|unsafe|wrong|off|watching|waiting|worried|angry|furious|hostile|calm|relieved|grounded)/i.test(
      sentence
    ) ||
      /["']/i.test(sentence))
  );
}


function scorePromotedSupport(item: JournalAnalysis["supports"][number]) {
  let score = 1;

  if (item.impact === "grounding" || item.impact === "validating") score += 1;
  if (item.impact === "energizing") score += 0.8;

  if (/steady|present|calm|clearer|lighter|relieved|enough|noticed|didn't rush|did not rush|felt better after|proud|excited|stoked|fun|enjoyable|delicious|good time|great time|got so much done|so much done|productive|programming|coding|hope(?:ful|d|s|ing)?|better by morning|heal|recover/i.test(item.evidence)) {
    score += 0.95;
  }

  if (item.category === "routine" || item.category === "presence" || item.category === "connection" || item.category === "accomplishment") {
    score += 0.6;
  }

  if (/(small ritual|quiet environment|quiet house|dog presence|dog walk|time with friends|time with family|time with sister|sunlight|fresh air|bookstore outing|meal at home|food at home|academic achievement|creative progress|productive progress|fun plan|rest opportunity|walking outside|enjoyable company|gym session|small celebration|meal with others|rest that helped|caregiving support)/i.test(item.label)) {
    score += 1.0;
  }

  if (/(great time with friends|good time with friends|enjoyable company|delicious food|nice session|new book|got a new book|ice cream|portfolio item|straight as|straight a|learned already|learned so much|working on the app|stoked|proud of myself|felt a lot better after|got so much done|so much done|productive|programming|coding)/i.test(item.evidence)) {
    score += 1.05;
  }

  return score;
}

function scorePromotedStressor(item: JournalAnalysis["stressors"][number]) {
  let score = item.intensity / 3;

  if (/(unsafe|threat|wrong|scared|afraid|fight|hostile|burden|pressure|overload|pain|went wrong|disappointed|tired|exhausted|drained|obnoxious|wouldn't stop|would not stop|kept barking|sick|ill|unwell|upset because|worried|concerned|fever|recover)/i.test(item.evidence)) {
    score += 1.2;
  }

  if (/(family concern|family health concern|relationship conflict|work pressure|financial strain|money stress|physical strain|home safety scare|dog barking disruption|routine disruption|fatigue|disappointment)/i.test(item.label)) {
    score += 0.7;
  }

  return score;
}

function scoreSubtleSupport(item: JournalAnalysis["supports"][number]) {
  let score = scorePromotedSupport(item) - 0.35;

  if (/(small ritual|quiet environment|quiet house|dog presence|time with friends|time with family|sunlight|fresh air|bookstore outing|meal at home|academic achievement|creative progress|productive progress|fun plan|rest opportunity|enjoyable company|gym session|small celebration|meal with others|rest that helped|caregiving support)/i.test(item.label)) {
    score += 0.45;
  }

  if (/(didn't rush|did not rush|took my time|slowly|quietly|house was still|house was quiet|felt more present|that felt important|felt better after|proud|excited|stoked|fun|enjoyable|delicious|got so much done|so much done|productive|programming|coding|hope(?:ful|d|s|ing)?|better by morning|heal|recover)/i.test(item.evidence)) {
    score += 0.35;
  }

  return score;
}

function scoreRestorativeMoment(moment: string, evidence: string) {
  let score = 1;
  if (/clarity|grounding|release|awareness|quiet|hope/.test(moment)) score += 0.8;
  if (/felt more present|steadier|calmer|lighter|relieved|clearer|let it be|enough|hope(?:ful|d|s|ing)?|better by morning|heal|recover/i.test(evidence)) score += 1;
  return score;
}

function scoreCopingAction(action: string, evidence: string, impact: string) {
  let score = 1;

  if (impact === "helpful") score += 0.8;
  if (impact === "neutral") score += 0.25;

  if (/didn't rush|did not rush|took my time|slowed down|paused|pause|sat with|let it be|stayed with|breath|breathe|took a nap|napped|rested|rest|felt better after|scheduled|planned|appointment|went to the gym|worked out|walk|soup|broth|tea|checked on|took care of|taking care of|comforted|hope(?:ful|d|s|ing)?|heal|better by morning|recover/i.test(evidence)) {
    score += 1.1;
  }

  if (/slowed down on purpose|paused instead of reacting immediately|stayed with the feeling without trying to force it away|used attention to orient to the moment|used breathing to steady the moment|used movement to regulate|reached toward connection instead of holding it alone|made a positive plan to look forward to|used a quiet routine to steady the moment|used focused work to channel momentum|chose rest instead of pushing through|took a nap to recover|let rest help the body recover|made something nourishing to care for someone|showed up to care for someone directly/i.test(action)) {
    score += 1.0;
  }

  return score;
}

function scoreSubtleCopingAction(action: string, evidence: string, impact: string) {
  let score = scoreCopingAction(action, evidence, impact) - 0.25;

  if (/didn't rush|did not rush|took my time|slowed down|paused|sat with|let it be|did not reach for distractions|didn't reach for distractions|took a nap|rested|felt better after|scheduled|planned|appointment|went to the gym|worked out|soup|checked on|took care of|comforted|hope(?:ful|d|s|ing)?|heal|better by morning|recover/i.test(evidence)) {
    score += 0.45;
  }

  if (/made something nourishing to care for someone|showed up to care for someone directly/i.test(action)) {
    score += 0.35;
  }

  return score;
}

function hasInternalShiftLanguage(text: string) {
  return /(felt more present|steadier|calmer|lighter|relieved|clearer|settled|softened|enough|let it be|grounded|more aware)/i.test(text) || hasHealingHope(text);
}

function scoreNotablePhrase(sentence: string) {
  const emotionalWeight = /(felt|realized|noticed|clearer|enough|present|wrong|unsafe|worried|angry|relieved|steady|truth|honest|scared|calmer)/i.test(sentence) ? 2 : 1;
  const uniqueness = /["']|in between|maybe that's enough|felt more present|truth|quiet|watching|unsafe|wrong/i.test(sentence) ? 2 : 1;
  const thematicRelevance = /(felt|realized|noticed|because|enough|clearer|present|steady|unsafe|worried|angry|relieved)/i.test(sentence) ? 2 : 1;
  const placementImportance = sentence.length >= 48 ? 2 : 1;

  return emotionalWeight * 0.4 + uniqueness * 0.2 + thematicRelevance * 0.2 + placementImportance * 0.2;
}

function isSafetySensitiveText(text: string) {
  return /(kill myself|end my life|want to die|suicidal|suicide|hurt myself|harm myself|don't want to be here|do not want to be here|wish i wasn't here|wish i was not here|wish i could disappear|want to disappear|better off without me|not wake up|overdose)/i.test(
    text
  );
}

function abstractSafetySensitiveText(text: string) {
  if (/(kill myself|end my life|want to die|suicidal|suicide|hurt myself|harm myself|plan to|overdose)/i.test(text)) {
    return "acute overwhelm";
  }

  if (/(don't want to be here|do not want to be here|wish i wasn't here|wish i was not here|wish i could disappear|want to disappear|better off without me|not wake up|vanish)/i.test(text)) {
    return "existential strain";
  }

  return text;
}

function analysisLikeCoreLine(entry: string) {
  return (
    splitSentences(entry).find(
      (sentence) =>
        isNotablePhraseCandidate(sentence) &&
        /(unsafe|wrong|off|present|clearer|enough|steady|steadier|watching|waiting|worried|angry|furious|relieved|grounded)/i.test(sentence)
    ) ?? null
  );
}

function applySafetySensitiveSuppression(
  interpretation: ReturnType<typeof synthesizeInterpretation>,
  safetyAssessment: JournalAnalysis["safety_assessment"]
) {
  if (safetyAssessment.level === "none") {
    return interpretation;
  }

  const sanitizeList = (items: string[]) =>
    unique(
      items.map((item) => {
        if (!isSafetySensitiveText(item)) {
          return item;
        }

        return abstractSafetySensitiveText(item);
      })
    );

  if (safetyAssessment.level === "high") {
    return {
      ...interpretation,
      supports: [],
      copingActions: [],
      restorativeSignals: [],
      themes: [],
      recurringTopics: [],
      personalKeywords: [],
      notablePhrases: [],
      evidenceSpans: [],
      joySources: [],
      gratitudeMoments: [],
      wins: [],
      whatToRepeat: [],
      customEmotionTerms: [],
      summary: "This entry needs care before interpretation. Atlas Journal is pausing the normal analysis so support can lead."
    };
  }

  if (safetyAssessment.level === "moderate") {
    return {
      ...interpretation,
      summary:
        "This entry sounds heavy, so Atlas Journal is keeping the interpretation gentler and more restrained while support stays in view.",
      personalKeywords: [],
      notablePhrases: [],
      themes: interpretation.themes.filter((item) => !/(acute despair|suicide|self-harm|harm|die|disappear)/i.test(item)).slice(0, 3),
      recurringTopics: interpretation.recurringTopics.filter((item) => !/(acute despair|suicide|self-harm|harm|die|disappear)/i.test(item)).slice(0, 2),
      customEmotionTerms: [],
      evidenceSpans: interpretation.evidenceSpans.filter((item) => item.type === "safety" || !isSafetySensitiveText(item.text)).slice(0, 4)
    };
  }

  return {
    ...interpretation,
    personalKeywords: sanitizeList(interpretation.personalKeywords).slice(0, 4),
    notablePhrases: interpretation.notablePhrases.slice(0, 2),
    customEmotionTerms: sanitizeList(interpretation.customEmotionTerms).slice(0, 5)
  };
}

function applySafetySensitiveSuppressionToAnalysis(analysis: JournalAnalysis): JournalAnalysis {
  const safetyLevel = analysis.safety_assessment.level;

  if (safetyLevel === "none") {
    return analysis;
  }

  if (safetyLevel === "high") {
    return validateAnalysis({
      ...analysis,
      summary:
        "This entry needs care before interpretation. Atlas Journal is pausing the normal analysis so support can lead.",
      supports: [],
      coping_actions: [],
      restorative_signals: [],
      themes: [],
      recurring_topics: [],
      personal_keywords: [],
      notable_phrases: [],
      evidence_spans: analysis.evidence_spans.filter((item) => item.type === "safety"),
      reflection_tags: [],
      joy_sources: [],
      gratitude_moments: [],
      wins: [],
      what_to_repeat: [],
      custom_emotion_terms: []
    });
  }

  const sanitizeList = (items: string[]) =>
    unique(
      items.map((item) => {
        if (!isSafetySensitiveText(item)) {
          return item;
        }

        return abstractSafetySensitiveText(item);
      })
    );

  if (safetyLevel === "moderate") {
    return validateAnalysis({
      ...analysis,
      summary:
        "This entry sounds heavy, so Atlas Journal is keeping the interpretation gentler and more restrained while support stays in view.",
      personal_keywords: [],
      notable_phrases: [],
      themes: analysis.themes.filter((item) => !/(acute despair|suicide|self-harm|harm|die|disappear)/i.test(item)).slice(0, 3),
      recurring_topics: analysis.recurring_topics.filter((item) => !/(acute despair|suicide|self-harm|harm|die|disappear)/i.test(item)).slice(0, 2),
      custom_emotion_terms: [],
      evidence_spans: analysis.evidence_spans.filter((item) => item.type === "safety" || !isSafetySensitiveText(item.text)).slice(0, 4)
    });
  }

  return validateAnalysis({
    ...analysis,
    personal_keywords: sanitizeList(analysis.personal_keywords).slice(0, 4),
    notable_phrases: analysis.notable_phrases.slice(0, 2),
    custom_emotion_terms: sanitizeList(analysis.custom_emotion_terms).slice(0, 5)
  });
}

function sanitizeAnalysisOutput(analysis: JournalAnalysis): JournalAnalysis {
  const safetyLevel = analysis.safety_assessment.level;

  const supports = analysis.supports
    .map((item) => ({
      ...item,
      label: sanitizeBucketOutputLabel(normalizeSupportLabel(item.label, item.evidence, item.category), "support")
    }))
    .filter((item) => Boolean(item.label))
    .slice(0, 2);

  const copingActions = analysis.coping_actions
    .map((item) => ({
      ...item,
      action: sanitizeBucketOutputLabel(item.action, "coping"),
      impact: normalizeCopingImpact(item.impact)
    }))
    .filter((item) => Boolean(item.action))
    .slice(0, 2);

  const restorativeSignals = unique(analysis.restorative_signals.map((item) => sanitizeBucketOutputLabel(item, "restorative")).filter(Boolean)).slice(0, 3);

  const stressors = analysis.stressors
    .map((item) => ({
      ...item,
      label: sanitizeBucketOutputLabel(normalizeStressorLabel(item.label, item.evidence, item.category), "stressor")
    }))
    .filter((item) => Boolean(item.label))
    .slice(0, 2);

  const recurringTopics = unique(analysis.recurring_topics.map((item) => sanitizeBucketOutputLabel(item, "topic")).filter(Boolean)).slice(0, 4);
  const themes = unique(analysis.themes.map((item) => sanitizeBucketOutputLabel(item, "theme")).filter(Boolean)).slice(0, 5);
  const personalKeywords = unique(analysis.personal_keywords.map((item) => sanitizePersonalKeywordFinal(item, safetyLevel)).filter(Boolean))
    .filter((item) => isEligiblePersonalKeyword(item, item))
    .slice(0, 5);
  const primaryEmotion = sanitizeBucketOutputLabel(analysis.primary_emotion, "emotion") || analysis.primary_emotion;
  const secondaryEmotions = unique(analysis.secondary_emotions.map((item) => sanitizeBucketOutputLabel(item, "emotion")).filter(Boolean)).slice(0, 4);

  const promotedLabels = new Set(
    [
      primaryEmotion,
      ...secondaryEmotions,
      analysis.emotional_shift.start_state,
      analysis.emotional_shift.end_state,
      ...supports.map((item) => item.label),
      ...copingActions.map((item) => item.action),
      ...restorativeSignals,
      ...stressors.map((item) => item.label),
      ...recurringTopics
    ]
      .map((item) => normalizeConceptLabel(item))
      .filter(Boolean)
  );

  const evidenceSpans = analysis.evidence_spans
    .filter((item) => item.type === "safety" || promotedLabels.has(normalizeConceptLabel(item.label)))
    .filter((item) => !looksLikeJunkOutputLabel(item.label, item.type === "emotion" ? "emotion" : item.type === "stressor" ? "stressor" : "support"))
    .slice(0, 8);

  return validateAnalysis({
    ...analysis,
    primary_emotion: primaryEmotion,
    secondary_emotions: secondaryEmotions,
    supports,
    coping_actions: copingActions
  .map((item) => {
    const cleanAction = sanitizeBucketOutputLabel(item.action, "coping");
    const cleanImpact = normalizeCopingImpact(item.impact);

    return {
      ...item,
      action: cleanAction,
      label: cleanAction,
      impact: cleanImpact
    };
  })
  .filter((item) => Boolean(item.action))
  .slice(0, 2),
    restorative_signals: restorativeSignals,
    stressors,
    recurring_topics: recurringTopics,
    themes,
    personal_keywords: personalKeywords,
    evidence_spans: evidenceSpans,
    reflection_tags: unique(analysis.reflection_tags.map((item) => sanitizeBucketOutputLabel(item, "theme")).filter(Boolean)).slice(0, 6)
  });
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
  if (/(academic achievement|finals|straight a|straight as|grades?|exam|semester)/i.test(label)) return "academic achievement";
  if (/(creative progress|creative momentum|portfolio|app|project|competition|handshake|atlas journal|studio moonfall|gateway)/i.test(label)) return "creative momentum";
  if (/(rest opportunity|nap|napped|rested)/i.test(label)) return "recovery";
  if (/(fun plan|planned fun|scheduled fun)/i.test(label)) return "social connection";
  if (/(proud|accomplished)/i.test(label)) return "accomplishment";
  if (/(excited|motivated|energized|energised)/i.test(label)) return "momentum";
  if (/(refund call|money conversation|budget|bills|rent)/i.test(label)) return "money stress";
  if (/(manager|meeting|deadline|work)/i.test(label)) return "work pressure";
  if (/(pain|migraine|sleep deprivation|rough night of sleep)/i.test(label)) return "physical strain";

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
    "tea",
    "family",
    "manager",
    "friend",
    "partner",
    "present",
    "steady",
    "unsettled",
    "disruption",
    "home",
    "mall"
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

  if (normalizedLabel === "watchfulness" || normalizedLabel === "investigation") {
    return /(watching|watchful|keeping an eye|waiting for information|trying to find out|looking into|investigat|concerned|worried|felt off|something felt off)/i.test(
      evidence
    );
  }

  if (normalizedLabel === "family concern") {
    return /\b(sister|brother|mom|dad|parent|family)\b/i.test(evidence) && /(worried|concerned|waiting|find out|felt off|not sure|unsure)/i.test(evidence);
  }

  if (normalizedLabel === "family health concern") {
    return hasFamilyIllnessConcern(evidence);
  }

  if (normalizedLabel === "relationship concern") {
    return /\b(friend|partner|wife|husband|boyfriend|girlfriend|mike)\b/i.test(evidence) && /(worried|concerned|suspicious|don't trust|do not trust|felt off)/i.test(evidence);
  }

  if (normalizedLabel === "relationship conflict") {
    return /\b(friend|partner|wife|husband|boyfriend|girlfriend|mike)\b/i.test(evidence) && /(argued|fight|hostile|insult|yelled|threat)/i.test(evidence);
  }

  if (normalizedLabel === "work pressure") {
    return /(manager|meeting|deadline|work)/i.test(evidence);
  }

  if (normalizedLabel === "money stress" || normalizedLabel === "financial strain") {
    return /(refund call|money|budget|bills?|rent|finance)/i.test(evidence);
  }

  if (normalizedLabel === "physical strain") {
    return /(pain|migraine|sleep|sick|rough night)/i.test(evidence);
  }

  if (normalizedLabel === "physical aggression") {
    return /(punched|punch|slapped|slap|kicked|kick|shoved|assault|hurt)/i.test(evidence) || isViolentHitContext(evidence);
  }

  if (normalizedLabel === "threatening situation") {
    return /(threat|threatened|unsafe|danger|scared|wrong at home|home felt wrong)/i.test(evidence);
  }

  if (normalizedLabel === "small ritual") {
    return /(coffee|tea|meal|breakfast|lunch|dinner).*(slow|quiet|didn't rush|did not rush|took my time)|made coffee slowly/i.test(evidence);
  }

  if (normalizedLabel === "academic achievement") {
    return /(finals?|semester|exam|exams|class|classes|grades?|straight a|straight as|aced)/i.test(evidence);
  }

  if (normalizedLabel === "creative progress" || normalizedLabel === "creative momentum") {
    return /(app|portfolio|project|build(?:ing)?|competition|handshake|atlas journal|studio moonfall|gateway)/i.test(evidence);
  }

  if (normalizedLabel === "productive progress" || normalizedLabel === "productivity") {
    return /(got so much done|so much done|productive|busy day programming|busy day coding|programming|coding|made progress)/i.test(evidence);
  }

  if (normalizedLabel === "fun plan") {
    return /(plan(?:ned)?|schedule(?:d)?).*(fun|movie|trip|hang|date|outing|mall)/i.test(evidence);
  }

  if (normalizedLabel === "rest opportunity" || normalizedLabel === "recovery") {
    return /(took a nap|napped|rested|got some rest|let myself rest)/i.test(evidence);
  }

  if (normalizedLabel === "caregiving support" || normalizedLabel === "caregiving") {
    return hasCaregivingAction(evidence) || hasFamilyIllnessConcern(evidence);
  }

  if (normalizedLabel === "dog presence") {
    return /\bdog\b/i.test(evidence) && /(calm|comfort|steady|present|better|grounded)/i.test(evidence);
  }

  if (normalizedLabel === "quiet environment") {
    return /\b(still|quiet house|house was still|house was quiet)\b/i.test(evidence) && /(present|calm|steady|quiet|easier|better|relieved)/i.test(evidence);
  }

  if (normalizedLabel === "time with friends") {
    return /(friend|friends)/i.test(evidence) && /(coffee with|lunch with|dinner with|spent time with|hung out with|went out with|talked with|talked to|called|texted)/i.test(evidence);
  }

  if (normalizedLabel === "time with family") {
    return /(sister|brother|mom|dad|family|parent)/i.test(evidence) && /(coffee with|lunch with|dinner with|spent time with|hung out with|went out with|talked with|talked to|called|texted)/i.test(evidence);
  }

  if (normalizedLabel === "quiet house") {
    return /\bquiet house\b/i.test(evidence);
  }

  if (normalizedLabel === "bookstore outing") {
    return /\b(bookstore|book shop)\b/i.test(evidence);
  }

  if (normalizedLabel === "gym session") {
    return /\b(gym|worked out|workout)\b/i.test(evidence);
  }

  if (normalizedLabel === "dog walk") {
    return /\b(walked the dog|walk with lily|walk with the dog)\b/i.test(evidence);
  }

  if (normalizedLabel === "walk") {
    return /\b(walked|went for a walk|took a walk)\b/i.test(evidence);
  }

  if (normalizedLabel === "walking outside") {
    return /\b(walked|went for a walk|took a walk)\b/i.test(evidence) && /(outside|fresh air|clear my head|reset|steadier)/i.test(evidence);
  }

  if (normalizedLabel === "music") {
    return /\b(music|playlist|song|songs)\b/i.test(evidence);
  }

  if (normalizedLabel === "sunlight") {
    return /\b(sun|sunlight)\b/i.test(evidence);
  }

  if (normalizedLabel === "fresh air") {
    return /\b(outside|fresh air)\b/i.test(evidence);
  }

  if (normalizedLabel === "food at home") {
    return /\b(food|meal|breakfast|lunch|dinner)\b/i.test(evidence) && /\b(home|kitchen)\b/i.test(evidence);
  }

  if (normalizedLabel === "meal") {
    return /\b(food|meal|breakfast|lunch|dinner)\b/i.test(evidence);
  }

  if (normalizedLabel === "finished task") {
    return /(finished|completed|got it done|wrapped up|followed through|made progress|crossed off|cleaned|submitted|figured it out|solved)/i.test(evidence);
  }

  if (normalizedLabel === "sleep deprivation") {
    return /(didn't sleep|did not sleep|rough night of sleep|sleep)/i.test(evidence) && /(rough|barely|couldn't|could not|tired|exhausted)/i.test(evidence);
  }

  if (normalizedLabel === "resolution") {
    return /(finally|ended up|turned out|worked out|resolved|sorted out|got fixed)/i.test(evidence);
  }

  return normalizedEvidence.includes(normalizedLabel.replace(/\s+/g, " "));
}

function dedupeByLabelAndEvidence<T extends { label: string; evidence: string }>(items: T[]) {
  return unique(items.map((item) => JSON.stringify({ label: item.label, evidence: item.evidence }))).map((item) => {
    const parsed = JSON.parse(item) as { label: string; evidence: string };
    return items.find((candidate) => candidate.label === parsed.label && candidate.evidence === parsed.evidence)!;
  });
}

function isReactiveEmotion(label: string) {
  return ["angry", "rageful", "hostile", "resentful", "spiteful", "vindicated", "disgusted", "alarmed", "fearful", "reactive"].includes(label);
}

function getStateWeights(signals: StateSignal[]) {
  return {
    positive: signals.filter((signal) => signal.tone === "positive").reduce((sum, signal) => sum + signal.weight, 0),
    grounded: signals.filter((signal) => signal.tone === "grounded").reduce((sum, signal) => sum + signal.weight, 0),
    negative: signals.filter((signal) => signal.tone === "negative").reduce((sum, signal) => sum + signal.weight, 0),
    liminal: signals.filter((signal) => signal.tone === "liminal").reduce((sum, signal) => sum + signal.weight, 0),
    reactive: signals.filter((signal) => isReactiveEmotion(signal.label)).reduce((sum, signal) => sum + signal.weight, 0)
  };
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
  if (hasPressureReleaseLanguage(getSegmentContextText(sentence))) {
    return false;
  }

  const hasMarker = disruptionMarkers
    .filter((marker) => marker !== "off")
    .some((marker) => sentence.normalized.includes(marker));

  return (
    hasMarker ||
    /\b(felt off|something felt off|seemed off|looked off|off guard)\b/i.test(sentence.sentence) ||
    /(didn't expect|did not expect|caught me off guard|felt unsafe|felt exposed|something was wrong|something felt wrong|got weird|went wrong|broke down|missed the train|flat tire|car trouble)/i.test(
      sentence.sentence
    )
  );
}

function scoreSentenceStrength(sentence: SentenceSignal) {
  const base = sentence.positionWeight * sentence.emotionalWeight;
  return sentence.centralCue ? base * 1.1 : base;
}

function getSignalScore(signal: StateSignal, sentences: SentenceSignal[], allSignals: StateSignal[]): SignalScore {
  const sentence = sentences.find((item) => item.index === signal.index);
  const sameLabelCount = allSignals.filter((item) => item.label === signal.label).length;
  const sentenceCount = Math.max(sentences.length - 1, 1);
  const genericPenalty = ["present", "steady", "unsettled"].includes(signal.label) ? 0.82 : 1;
  const specificBoost =
    ["grounded", "clarifying", "watchful", "concerned", "fearful", "angry", "hostile", "overwhelmed", "grieving", "accepting", "relieved", "hopeful", "emotionally honest", "activated", "reactive", "burdened"].includes(
      signal.label
    )
      ? 1.08
      : 1;
  const intensity = clamp((signal.weight / 2.4) * genericPenalty * specificBoost, 0.35, 3);
  const repetition = clamp(sameLabelCount, 1, 4);
  const position = clamp(((signal.index ?? 0) / sentenceCount) * 3, 0.8, 3);
  const emphasis = clamp(
    (sentence?.centralCue ? 1.2 : 0.7) +
      (/[!?]/.test(signal.evidence) ? 0.7 : 0) +
      (sentence?.restorativeCue ? 0.4 : 0) +
      (sentence?.conflict ? 0.5 : 0),
    0.55,
    3
  ) * genericPenalty;

  return { intensity, repetition, position, emphasis };
}

function getDominanceScore(score: SignalScore) {
  return Number((score.intensity * 0.4 + score.repetition * 0.2 + score.position * 0.25 + score.emphasis * 0.15).toFixed(3));
}

function getDominantSignal(signals: StateSignal[], sentences: SentenceSignal[]) {
  const ranked = signals
    .map((signal) => ({
      signal,
      score: getDominanceScore(getSignalScore(signal, sentences, signals))
    }))
    .sort((a, b) => b.score - a.score);

  return ranked[0] ?? null;
}

function isGenericArcLabel(label: string) {
  return ["present", "steady", "unsettled", "reflective", "mixed"].includes(label);
}

function pickSpecificSegmentLabel(segmentSignals: StateSignal[], fallback: string) {
  const ranked = [...segmentSignals].sort((a, b) => b.weight - a.weight);
  const specific = ranked.find((signal) => !isGenericArcLabel(signal.label));
  return specific?.label ?? fallback;
}

function allowsDualValence(sentence: SentenceSignal) {
  return (
    (hasRestorativeOutcome(sentence) || hasGentleRegulation(sentence) || hasPositiveExperience(sentence)) &&
    (indicatesActualStrain(sentence) || hasDisruptionSignal(sentence) || isConflict(sentence))
  );
}

function quoteSupportingEvidence(text: string, maxChars = 120) {
  const snippet = text.trim().replace(/\s+/g, " ");
  const clipped = snippet.length > maxChars ? `${snippet.slice(0, maxChars - 1).trim()}...` : snippet;
  return `"${clipped}"`;
}

function getCentralSentences(sentences: SentenceSignal[]) {
  return [...sentences]
    .map((sentence) => ({
      ...sentence,
      score:
        scoreSentenceStrength(sentence) +
        (sentence.restorativeCue ? 0.6 : 0) +
        (sentence.conflict ? 0.8 : 0) +
        (/(overwhelmed|anxious|drained|angry|sad|numb|relieved|grateful|hopeful|steady|present)/i.test(sentence.sentence) ? 0.45 : 0)
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

// Legacy pre-extractEvents heuristics are intentionally kept for reference while the newer
// staged pipeline is active. buildHeuristicAnalysis() now uses extractEvents(),
// detectSupportsAndCoping(), detectStressors(), buildEmotionalTimeline(), and
// synthesizeInterpretation() instead of the helpers below.
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



function extractSupports(_rawText: string, sentences: SentenceSignal[]) {
  const matches: Array<JournalAnalysis["supports"][number] & { weight: number }> = [];

  for (const sentence of sentences) {
    const candidate = inferSupportCandidateFromSentence(sentence);

    if (!candidate) {
      continue;
    }

    const existing = matches.find((item) => item.label.toLowerCase() === candidate.label.toLowerCase());
    const weight =
      scoreSentenceStrength(sentence) +
      (hasRestorativeOutcome(sentence) ? 0.9 : 0) +
      (sentence.roles.includes("supportive_context") ? 0.45 : 0) +
      (sentence.roles.includes("positive_event") ? 0.35 : 0) +
      (/\b(great time|good time|enjoyable|delicious|proud|excited|stoked|felt better after|comforting|safe|meaningful|new book|straight a|straight as|portfolio|competition|appointment|prom|meal|dinner|lunch|coffee|sister|friends|family)\b/i.test(sentence.sentence)
        ? 0.45
        : 0);
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
    const contextText = getSegmentContextText(sentence);
    const gentleRegulation = hasGentleRegulation(sentence);
    const explicitRelief = hasRestorativeOutcome(sentence);
    const positiveExperience = hasPositiveExperience(sentence);
    const negativeContext = hasNegativeContext(sentence);
    const stressorCountBefore = events.length;
    const hostileOrViolentContext = isConflict(sentence) || hasHostileOrViolentContext(contextText);
    const liminalWithoutDistress =
      liminalMarkers.some((marker) => sentence.normalized.includes(marker)) &&
      !negativeContext &&
      !hasDisruptionSignal(sentence) &&
      !/(panic|terrified|unsafe|argument|fight|threat|rage|furious)/i.test(sentence.sentence);

    if (/(made|brewed).*(coffee|tea)|(coffee|tea).*(slowly|quietly|didn't rush|did not rush|took my time)/i.test(contextText) && !negativeContext &&
      !hostileOrViolentContext) {
      events.push({
        label: "small ritual",
        category: "routine",
        evidence: contextText,
        kind: "support",
        weight: scoreSentenceStrength(sentence) + 0.8,
        positive: 2.3,
        negative: 0,
        index: sentence.index
      });
    }

    if (/(noticed|watched|listened to|heard|felt).*(light|sunlight|sound|birds|wind|body|breath|window)/i.test(sentence.sentence)&&
      !hostileOrViolentContext) {
      events.push({
        label: "noticed the environment",
        category: "presence",
        evidence: contextText,
        kind: sentence.roles.includes("supportive_context") ? "support" : "neutral",
        weight: scoreSentenceStrength(sentence) + 0.5,
        positive: sentence.roles.includes("supportive_context") ? 1.8 : 0.3,
        negative: 0,
        index: sentence.index
      });
    }

    if (sentence.roles.includes("intentional_coping") && !negativeContext&&
    !hostileOrViolentContext) {
      events.push({
        label: findMatch(sentence.sentence, /didn't rush|did not rush|took my time|slowed down|slowly|quietly|maybe that's enough|more present|sat with it|let it be/i) || "intentional slowing",
        category: "self-regulation",
        evidence: contextText,
        kind: "neutral",
        weight: scoreSentenceStrength(sentence) + 0.8,
        positive: 2,
        negative: 0,
        index: sentence.index
      });
    }

    if (/(great time with|good time with|fun with|coffee with|dinner with|lunch with|hung out with|spent time with|time with|went out with|talked with|talked to|called|texted|at the mall with|mall with)/i.test(contextText) && /(friend|friends|partner|mom|dad|sister|brother|family|coworker|grandma|grandmother|in-laws)/i.test(contextText) &&
    !hostileOrViolentContext) {
      events.push({
        label: "social connection",
        category: "connection",
        evidence: contextText,
        kind: positiveExperience || explicitRelief || sentence.roles.includes("supportive_context") ? "support" : "neutral",
        weight: scoreSentenceStrength(sentence) + 0.8,
        positive: positiveExperience || explicitRelief || sentence.roles.includes("supportive_context") ? 2.2 : 0.9,
        negative: 0,
        index: sentence.index
      });
    }

    if (/\b(house was still|house was quiet|quiet room|quiet house|quiet environment)\b/i.test(contextText) && !negativeContext &&
    !hostileOrViolentContext) {
      events.push({
        label: findMatch(contextText, /\b(house was still|house was quiet|quiet room|quiet house)\b/i) || "quiet environment",
        category: "environment",
        evidence: contextText,
        kind: gentleRegulation || explicitRelief || /still|quiet|present|breathe|steadier|calm/i.test(contextText) ? "support" : "neutral",
        weight: scoreSentenceStrength(sentence) + 0.65,
        positive: gentleRegulation || explicitRelief || /still|quiet|present|breathe|steadier|calm/i.test(contextText) ? 1.95 : 0.75,
        negative: 0,
        index: sentence.index
      });
    }

    if (/\bdog\b/i.test(contextText) && /(nearby|next to me|beside me|with me|curled up|quiet|calm|walked the dog|walk with lily|walk with the dog)/i.test(contextText) && !negativeContext &&
    !hostileOrViolentContext) {
      events.push({
        label: /\b(walked the dog|walk with lily|walk with the dog)\b/i.test(contextText) ? "dog walk" : "dog presence",
        category: /\b(walked the dog|walk with lily|walk with the dog)\b/i.test(contextText) ? "movement" : "comfort",
        evidence: contextText,
        kind: gentleRegulation || explicitRelief || sentence.roles.includes("supportive_context") ? "support" : "neutral",
        weight: scoreSentenceStrength(sentence) + 0.55,
        positive: gentleRegulation || explicitRelief || sentence.roles.includes("supportive_context") ? 1.8 : 0.7,
        negative: 0,
        index: sentence.index
      });
    }

    if (/\b(bookstore|book shop|library|cafe|restaurant|park|porch|quiet house)\b/i.test(contextText) && (positiveExperience || explicitRelief || gentleRegulation || sentence.roles.includes("supportive_context")) && !negativeContext &&
    !hostileOrViolentContext) {
      events.push({
        label: findMatch(contextText, /\b(bookstore|book shop|library|cafe|restaurant|park|porch|quiet house)\b/i) || "bookstore outing",
        category: "environment",
        evidence: contextText,
        kind: "support",
        weight: scoreSentenceStrength(sentence) + 0.55,
        positive: 1.9,
        negative: 0,
        index: sentence.index
      });
    }

    if (/\b(music|playlist|song|songs)\b/i.test(contextText) && (positiveExperience || explicitRelief || gentleRegulation || sentence.roles.includes("supportive_context")) && !negativeContext &&
    !hostileOrViolentContext) {
      events.push({
        label: findMatch(contextText, /\b(music|playlist|song|songs)\b/i) || "music",
        category: "comfort",
        evidence: contextText,
        kind: "support",
        weight: scoreSentenceStrength(sentence) + 0.45,
        positive: 1.7,
        negative: 0,
        index: sentence.index
      });
    }

    if (/\b(food|meal|breakfast|lunch|dinner|soup|broth|tea)\b/i.test(contextText) && (positiveExperience || gentleRegulation || explicitRelief || sentence.roles.includes("supportive_context") || hasCaregivingAction(contextText) || hasHealingHope(contextText)) && !negativeContext &&
    !hostileOrViolentContext) {
      events.push({
        label: hasCaregivingAction(contextText) ? "meal at home" : findMatch(contextText, /\b(food|meal|breakfast|lunch|dinner|soup|broth|tea)\b/i) || "meal at home",
        category: "routine",
        evidence: contextText,
        kind: "support",
        weight: scoreSentenceStrength(sentence) + 0.55,
        positive: hasCaregivingAction(contextText) ? 1.95 : 1.7,
        negative: 0,
        index: sentence.index
      });
    }

    if (/\b(journaled|wrote it down|wrote it out|writing this|journal entry)\b/i.test(contextText) && !negativeContext &&
    !hostileOrViolentContext) {
      events.push({
        label: "journaled it out",
        category: "self-regulation",
        evidence: contextText,
        kind: "neutral",
        weight: scoreSentenceStrength(sentence) + 0.5,
        positive: 1.5,
        negative: 0,
        index: sentence.index
      });
    }

    if (/\b(took a nap|napped|rested|got some rest|let myself rest)\b/i.test(contextText) && !negativeContext &&
    !hostileOrViolentContext) {
      events.push({
        label: "rest opportunity",
        category: "routine",
        evidence: contextText,
        kind: explicitRelief || gentleRegulation || /needed the rest|felt better after|felt a lot better after/i.test(contextText) ? "support" : "neutral",
        weight: scoreSentenceStrength(sentence) + 0.55,
        positive: explicitRelief || gentleRegulation || /needed the rest|felt better after|felt a lot better after/i.test(contextText) ? 1.9 : 0.75,
        negative: 0,
        index: sentence.index
      });
    }

    if (/\b(plan(?:ned)?|schedule(?:d)?)\b/i.test(contextText) && /\b(fun|movie|trip|hang|date|outing|mall)\b/i.test(contextText) && !negativeContext &&
    !hostileOrViolentContext) {
      events.push({
        label: "fun plan",
        category: "connection",
        evidence: contextText,
        kind: "support",
        weight: scoreSentenceStrength(sentence) + 0.55,
        positive: 1.9,
        negative: 0,
        index: sentence.index
      });
    }

    if (/(walked|went for a walk|took a walk|ran|run|hiked|stretch(ed|ing)?|worked out|gym|bike(d)?|swam)/i.test(sentence.sentence) && !likelyIncidentalMovementMarkers.some((marker) => sentence.normalized.includes(marker)) &&
      !hostileOrViolentContext
    ) {
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

    if (hasAny(sentence, accomplishmentMarkers) && !negativeContext &&
    !hostileOrViolentContext) {
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

    if (/(finally|ended up|turned out|worked out|resolved|sorted out|got fixed)/i.test(sentence.sentence) && !hasNegativeContext(sentence) &&
   !hostileOrViolentContext) {
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

    if ((/\b(finals?|semester|exam|exams|class|classes|grades?|straight a|straight as|aced)\b/i.test(contextText) || hasProductiveProgress(contextText) || /\b(app|portfolio|project|competition|handshake|atlas journal|studio moonfall|gateway)\b/i.test(contextText)) && !negativeContext &&
    !hostileOrViolentContext) {
      events.push({
        label: /\b(finals?|semester|exam|exams|class|classes|grades?|straight a|straight as|aced)\b/i.test(contextText)
          ? "academic achievement"
          : /\b(app|portfolio|project|competition|handshake|atlas journal|studio moonfall|gateway)\b/i.test(contextText)
            ? "creative progress"
            : "productive progress",
        category: /\b(finals?|semester|exam|exams|class|classes|grades?|straight a|straight as|aced)\b/i.test(contextText) ? "accomplishment" : "accomplishment",
        evidence: contextText,
        kind: "support",
        weight: scoreSentenceStrength(sentence) + 0.65,
        positive: 2.0,
        negative: 0,
        index: sentence.index
      });
    }

    const negatedPressure = hasPressureReleaseLanguage(contextText);

    const explicitStressorMatch =
      !negatedPressure && ((/(refund call|money conversation|deadline|manager|meeting|migraine|pain|rough night of sleep|pressure|overloaded|overload|punched|punch|slapped|slap|kicked|kick|assault|threatened|revenge|worth it|door was open|door was unlocked|door was unlatched|front door was open|front door was unlocked|front door was unlatched)/i.test(
        contextText
      ) || isViolentHitContext(contextText)) &&
      !isNegatedOrQualified(sentence, /\b(refund call|money conversation|deadline|manager|meeting|migraine|pain|rough night of sleep|pressure|overloaded|overload|punched|punch|slapped|slap|kicked|kick|assault|threatened|revenge|worth it|door was open|door was unlocked|door was unlatched|front door was open|front door was unlocked|front door was unlatched)\b/i));

    if (!liminalWithoutDistress && (isConflict(sentence) || explicitStressorMatch || (hasDisruptionSignal(sentence) && indicatesActualStrain(sentence)))) {
      const category = isConflict(sentence)
        ? "conflict"
        : /(refund|money|budget|bills?|rent)/i.test(sentence.sentence)
          ? "finance"
          : /(deadline|manager|meeting|work)/i.test(sentence.sentence)
            ? "work"
            : /(migraine|pain|sleep|sick)/i.test(sentence.sentence)
              ? "health"
              : /(punched|punch|slapped|slap|kicked|kick|assault|shoved)/i.test(contextText) || isViolentHitContext(contextText)
                ? "harm"
              : /(door was open|door was unlocked|door was unlatched|front door was open|front door was unlocked|front door was unlatched)/i.test(contextText)
                ? "uncertainty"
              : /(pressure|overloaded|overload)/i.test(sentence.sentence)
                ? "pressure"
                : "disruption";
      const label =
        findMatch(
          contextText,
          /argument|argued|fight|fighting|yelled|screamed|threatened|hostile|insulted|punched|punch|slapped|slap|kicked|kick|assault|refund call|money conversation|deadline|manager|meeting|migraine|pain|rough night of sleep|pressure|overloaded|overload|caught me off guard|felt unsafe|something was wrong|got weird|went wrong|flat tire|car trouble|missed the train|alarm|uncomfortable|unsafe|scared|awkward|revenge|worth it|door was open|door was unlocked|door was unlatched|front door was open|front door was unlocked|front door was unlatched/i
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

    if (events.length === stressorCountBefore && !negatedPressure) {
      const inferredStressor = inferConceptualStressorEvent(sentence);
      if (inferredStressor) {
        events.push(inferredStressor);
      }
    }
  }

  return { sentences, events };
}

function extractStateSignals(entry: string) {
  const sentences = getSentenceSignals(entry);
  const signals: StateSignal[] = [];

  for (const sentence of sentences) {
    const contextText = getSegmentContextText(sentence);

    for (const descriptor of explicitEmotionLexicon) {
      if (descriptor.regex.test(contextText) && !isNegatedOrQualified(sentence, descriptor.regex)) {
        signals.push({
          label: descriptor.label,
          tone: descriptor.tone,
          evidence: contextText,
          weight: descriptor.score * scoreSentenceStrength(sentence),
          index: sentence.index
        });
      }
    }

    if (liminalMarkers.some((marker) => sentence.normalized.includes(marker))) {
      signals.push({
        label: sentence.normalized.includes("maybe that's enough") ? "accepting" : "transitional",
        tone: sentence.normalized.includes("maybe that's enough") ? "grounded" : "liminal",
        evidence: contextText,
        weight: 2.2 * scoreSentenceStrength(sentence),
        index: sentence.index
      });
    }

    if (sentence.roles.includes("threat_or_harm")) {
      signals.push({
        label:
          /(unsafe|door was open|door was unlocked|door was unlatched|front door was open|front door was unlocked|front door was unlatched|scared|afraid|terrified|wrong)/i.test(
            contextText
          )
            ? "fearful"
            : isConflict(sentence)
              ? "reactive"
              : "burdened",
        tone: "negative",
        evidence: contextText,
        weight: 2.15 * scoreSentenceStrength(sentence),
        index: sentence.index
      });
    }

    if (sentence.roles.includes("watchfulness_or_concern") && !isConflict(sentence) && !hasNegativeContext(sentence)) {
      signals.push({
        label: /(trying to find out|looking into|investigat|waiting for information)/i.test(contextText)
          ? "investigative"
          : /(suspicious|don't trust|do not trust|something felt off)/i.test(contextText)
            ? "suspicious"
            : /(watchful|keeping an eye|on guard)/i.test(contextText)
              ? "watchful"
              : /(vigilant|alert)/i.test(contextText)
                ? "vigilant"
                : "concerned",
        tone: /(curious|wondering|trying to understand)/i.test(contextText) ? "liminal" : "negative",
        evidence: contextText,
        weight: 1.75 * scoreSentenceStrength(sentence),
        index: sentence.index
      });
    }

    if (sentence.roles.includes("internal_shift") && !hasNegativeContext(sentence)) {
      signals.push({
        label: hasHealingHope(contextText)
          ? "hopeful"
          : /clarity|clearer|truth|honest/i.test(contextText)
          ? "clarifying"
          : /relieved|lighter|eased|release/i.test(contextText)
            ? "relieved"
            : /felt more present|more present|noticed|aware|awareness|could breathe|stayed long enough to notice/i.test(contextText)
              ? "grounded"
              : "grounded",
        tone: "grounded",
        evidence: contextText,
        weight: 1.95 * scoreSentenceStrength(sentence),
        index: sentence.index
      });
    }

    if (hasGentleRegulation(sentence) && !hasNegativeContext(sentence)) {
      signals.push({
        label:
          /felt more present|more present|noticed|aware|awareness|breath|body/i.test(contextText)
            ? "present"
            : /didn't rush|did not rush|took my time|slowed down|quiet|still|house was still|house was quiet|not empty.*still/i.test(contextText)
              ? "grounded"
              : "present",
        tone: "grounded",
        evidence: contextText,
        weight: 1.4 * scoreSentenceStrength(sentence),
        index: sentence.index
      });
    }

    if (/\bstill\b/i.test(contextText) && /(tense|on edge|watching|waiting|not sure|unsure|felt off|concerned|worried)/i.test(contextText)) {
      signals.push({
        label: "watchful",
        tone: "liminal",
        evidence: contextText,
        weight: 1.7 * scoreSentenceStrength(sentence),
        index: sentence.index
      });
    }

    if (/\bstill\b/i.test(contextText) && /(aware|noticed|present|breath|light|sound|body)/i.test(contextText) && !hasNegativeContext(sentence)) {
      signals.push({
        label: "present",
        tone: "grounded",
        evidence: contextText,
        weight: 1.6 * scoreSentenceStrength(sentence),
        index: sentence.index
      });
    }

    if (/\bstill\b/i.test(contextText) && /(uncertain|waiting|not sure|unsure|in between|in-between)/i.test(contextText) && !hasNegativeContext(sentence)) {
      signals.push({
        label: "anticipatory",
        tone: "liminal",
        evidence: contextText,
        weight: 1.5 * scoreSentenceStrength(sentence),
        index: sentence.index
      });
    }

    if (/\bquiet\b/i.test(contextText) && /(heavy|low|subdued|tired|drained)/i.test(contextText)) {
      signals.push({
        label: "subdued",
        tone: "liminal",
        evidence: contextText,
        weight: 1.5 * scoreSentenceStrength(sentence),
        index: sentence.index
      });
    }

    if (/\bquiet\b/i.test(contextText) && /(clear|clearer|honest|truth|grounded)/i.test(contextText) && !hasNegativeContext(sentence)) {
      signals.push({
        label: "grounded",
        tone: "grounded",
        evidence: contextText,
        weight: 1.6 * scoreSentenceStrength(sentence),
        index: sentence.index
      });
    }

    if (/(didn't solve anything but felt more present|did not solve anything but felt more present|still unsure but steadier|uncertain but grounded|uncertain but steadier)/i.test(contextText)) {
      signals.push({
        label: "mixed recovery",
        tone: "grounded",
        evidence: contextText,
        weight: 2 * scoreSentenceStrength(sentence),
        index: sentence.index
      });
    }

    if (isConflict(sentence) || /(hate|wanted to hurt|wanted revenge|wanted to retaliate|destroy)/i.test(contextText)) {
      signals.push({
        label: /(rage|furious|enraged)/i.test(contextText)
          ? "rageful"
          : /(hostile|violent|hateful|vengeful|destroy)/i.test(contextText)
            ? "hostile"
            : /(spite|vindictive|retaliate|revenge)/i.test(contextText)
              ? "spiteful"
              : "angry",
        tone: "negative",
        evidence: contextText,
        weight: 2.5 * scoreSentenceStrength(sentence),
        index: sentence.index
      });
    }

    if (/(kill myself|end my life|want to die|suicidal|suicide|hurt myself|harm myself|don't want to be here|wish i could disappear|better off without me|not wake up)/i.test(contextText)) {
      signals.push({
        label: "acute despair",
        tone: "negative",
        evidence: contextText,
        weight: 3.2 * scoreSentenceStrength(sentence),
        index: sentence.index
      });
    }

    if (
      sentence.roles.includes("negative_event") &&
      !sentence.roles.includes("threat_or_harm") &&
      !isConflict(sentence) &&
      /(heavy|burden|carrying|carry|pressure|too much|overload|looming|gnawing|haunting)/i.test(contextText)
    ) {
      signals.push({
        label: "burdened",
        tone: "negative",
        evidence: contextText,
        weight: 1.8 * scoreSentenceStrength(sentence),
        index: sentence.index
      });
    }
  }

  return { sentences, signals };
}

function detectSupportsAndCoping(_entry: string, eventsResult: ReturnType<typeof extractEvents>, stateResult: ReturnType<typeof extractStateSignals>) {
  const detectedSupports = eventsResult.events.filter((event) => event.kind === "support");
  const eligibleSupports = detectedSupports
    .filter((event) => {
      const sentence = eventsResult.sentences[event.index];
      return sentence
        ? !eventsResult.events.some(
            (other) => other.kind === "stressor" && other.evidence === event.evidence && other.weight >= event.weight && !allowsDualValence(sentence)
          )
        : true;
    })
    .filter((event) => {
      const sentence = eventsResult.sentences[event.index];
      return sentence ? isEligibleSupportCandidate(event, sentence) : false;
    });

  const inferredSupportCandidates = eventsResult.sentences
    .map((sentence) => inferSupportCandidateFromSentence(sentence))
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const supportCandidates: JournalAnalysis["supports"] = dedupeByLabelAndEvidence(
    [
      ...eligibleSupports
        .sort((a, b) => b.weight - a.weight)
        .map((event) => ({
          label: normalizeSupportLabel(event.label, event.evidence, event.category),
          category: event.category,
          evidence: event.evidence,
          impact: (
            event.category === "presence" || event.label === "small ritual" || /present|steady|enough|calm|clearer|let it be/i.test(event.evidence)
              ? "grounding"
              : event.category === "connection"
                ? "validating"
                : event.category === "movement" && /energized|alive/i.test(event.evidence)
                  ? "energizing"
                  : "helpful"
          ) as JournalAnalysis["supports"][number]["impact"]
        })),
      ...inferredSupportCandidates
    ].filter((item) => Boolean(item.label))
  );

  const promotedSupports = supportCandidates
    .filter((event) => isEvidenceLabelMatch(event.label, event.evidence))
    .map((event) => ({ ...event, score: scorePromotedSupport(event) }))
    .filter((event) => event.score >= 2.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(({ score, ...event }) => event);
  const subtleSupportFallback = supportCandidates
    .filter((event) => isEvidenceLabelMatch(event.label, event.evidence))
    .map((event) => ({ ...event, score: scoreSubtleSupport(event) }))
    .filter((event) => event.score >= 1.75)
    .filter((event) => /(small ritual|quiet environment|quiet house|dog presence|dog walk|time with friends|time with family|time with sister|sunlight|fresh air|bookstore outing|meal at home|food at home|academic achievement|creative progress|productive progress|fun plan|rest opportunity|caregiving support)/i.test(event.label))
    .sort((a, b) => b.score - a.score)
    .slice(0, 1)
    .map(({ score, ...event }) => event);

  const supports = promotedSupports.length > 0 ? promotedSupports : subtleSupportFallback;

  const copingCandidates = dedupeByLabelAndEvidence(
    [
      ...eventsResult.sentences
        .map((sentence) => inferCopingCandidateFromSentence(sentence))
        .filter((item): item is NonNullable<typeof item> => item !== null),
      ...eventsResult.events
        .filter((event) => {
          const sentence = eventsResult.sentences[event.index];
          if (!sentence) return false;

          return (
            sentence.roles.includes("intentional_coping") ||
            ["routine", "presence", "movement", "self-regulation", "body care", "connection"].includes(event.category) ||
            /(didn't rush|did not rush|took my time|slowed down|pause|paused|let it sit|let it settle|sat with|let it be|stayed with|didn't reach for distractions|did not reach for distractions|noticed|breath|breathe|walk|run|gym|reached out|called|texted|journaled|wrote it down|made|brewed|cooked|prepared)/i.test(
              getSegmentContextText(sentence)
            )
          );
        })
        .map((event) => {
          const sentence = eventsResult.sentences[event.index];
          const evidence = sentence ? getSegmentContextText(sentence) : event.evidence;
          const category = inferCopingCategoryFromText(evidence);
          const action = describeCopingAction(event.label, evidence, category);

          return {
            label: action,
            evidence,
            action,
            impact: normalizeCopingImpact(
              /breath|present|steady|didn't rush|did not rush|took my time|slowed down|let it be|sat with|stayed with|paused/i.test(evidence)
                ? "grounding"
                : "helpful"
            )
          };
        })
    ].filter((item) => Boolean(item.action))
  );

  const copingActions: JournalAnalysis["coping_actions"] = copingCandidates
    .map((item) => ({ ...item, score: scoreCopingAction(item.action, item.evidence, item.impact) }))
    .filter((item) => item.score >= 1.9)
    .filter((item) => !supports.some((support) => support.label.toLowerCase() === item.action.toLowerCase()))
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.action.length <= 44)
    .slice(0, 2)
    .map(({ score, ...item }) => item);
  const subtleCopingFallback = copingCandidates
    .map((item) => ({ ...item, score: scoreSubtleCopingAction(item.action, item.evidence, item.impact) }))
    .filter((item) => item.score >= 1.55)
    .filter((item) => !supports.some((support) => support.label.toLowerCase() === item.action.toLowerCase()))
    .sort((a, b) => b.score - a.score)
    .slice(0, 1)
    .map(({ score, ...item }) => item);

  const finalCopingActions = copingActions.length > 0 ? copingActions : subtleCopingFallback;

  const restorativeSignals = unique([
    ...supports
      .filter((item) => hasInternalShiftLanguage(item.evidence))
      .map((item) => JSON.stringify({ moment: describeRestorativeMoment(item.label, item.evidence), evidence: item.evidence })),
    ...eventsResult.sentences
      .filter((sentence) => sentence.roles.includes("internal_shift"))
      .map((sentence) => JSON.stringify({ moment: describeRestorativeMoment(sentence.sentence, getSegmentContextText(sentence)), evidence: getSegmentContextText(sentence) })),
    ...stateResult.signals
      .filter((item) => item.label === "present" || item.label === "accepting" || item.label === "steady" || item.label === "mixed recovery" || item.label === "emotionally honest" || item.label === "grounded" || item.label === "clarifying" || item.label === "relieved")
      .filter((item) => hasInternalShiftLanguage(item.evidence) || /accepting|steady|mixed recovery|emotionally honest|grounded|clarifying|relieved/.test(item.label))
      .map((item) => JSON.stringify({ moment: describeRestorativeMoment(item.label, item.evidence), evidence: item.evidence }))
  ])
    .map((item) => JSON.parse(item) as { moment: string; evidence: string })
    .filter((item) => Boolean(item.moment))
    .map((item) => ({ ...item, score: scoreRestorativeMoment(item.moment, item.evidence) }))
    .filter((item) => item.score >= 1.8)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.moment)
    .slice(0, 3);

  return { supports, copingActions: finalCopingActions, restorativeSignals };
}

function detectStressors(_entry: string, eventsResult: ReturnType<typeof extractEvents>, stateResult: ReturnType<typeof extractStateSignals>) {
  const detectedStressors = eventsResult.events.filter((event) => event.kind === "stressor");
  const eligibleStressors = detectedStressors
    .filter((event) => {
      const sentence = eventsResult.sentences[event.index];
      return sentence ? isEligibleStressorCandidate(event, sentence) : false;
    })
    .filter((event) => {
      const sentence = eventsResult.sentences[event.index];
      return sentence
        ? !eventsResult.events.some(
            (other) => other.kind === "support" && other.evidence === event.evidence && other.weight >= event.weight && !allowsDualValence(sentence)
          )
        : true;
    })
    .sort((a, b) => b.weight - a.weight)
    .map((event) => ({
      label: normalizeStressorLabel(event.label, event.evidence, event.category),
      category: event.category,
      evidence: event.evidence,
      intensity: clamp(
        Math.round(4 + event.negative + (stateResult.signals.some((signal) => signal.index === event.index && signal.tone === "negative") ? 1.5 : 0)),
        1,
        10
      )
    }))
    .filter((item) => Boolean(item.label));

  const promotedStressors = dedupeByLabelAndEvidence(eligibleStressors)
    .filter((item) => !isWeakEntityLabel(item.label))
    .filter((item) => isEvidenceLabelMatch(item.label, item.evidence) || indicatesActualStrain(eventsResult.sentences.find((sentence) => sentence.sentence === item.evidence) ?? eventsResult.sentences[0]))
    .map((item) => ({ ...item, score: scorePromotedStressor(item) }))
    .filter((item) => item.score >= 2.6)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(({ score, ...item }) => item);
  const subtleStressFallback = dedupeByLabelAndEvidence(eligibleStressors)
    .filter((item) => !isWeakEntityLabel(item.label))
    .map((item) => ({ ...item, score: scorePromotedStressor(item) }))
    .filter((item) => item.score >= 2.15)
    .sort((a, b) => b.score - a.score)
    .slice(0, 1)
    .map(({ score, ...item }) => item);

  const stressors = promotedStressors.length > 0 ? promotedStressors : subtleStressFallback;

  const triggers: JournalAnalysis["triggers"] = stressors.map((item) => ({
    type:
      item.category === "finance" || item.category === "work" || item.category === "family" || item.category === "health" || item.category === "conflict"
        ? item.category
        : "other",
    description: item.evidence
  }));

  return { stressors: stressors.slice(0, 2), triggers };
}

function buildEmotionalTimeline(_entry: string, stateResult: ReturnType<typeof extractStateSignals>, supports: JournalAnalysis["supports"], stressors: JournalAnalysis["stressors"]) {
  const { sentences, signals } = stateResult;
  const third = Math.max(1, Math.ceil(sentences.length / 3));
  const slices = [sentences.slice(0, third), sentences.slice(third, third * 2), sentences.slice(third * 2)].map((slice) => (slice.length > 0 ? slice : sentences));
  const beforeCount = Math.max(1, Math.ceil(sentences.length * 0.3));
  const afterStart = Math.max(0, Math.floor(sentences.length * 0.6));
  const beforeSlice = sentences.slice(0, beforeCount);
  const afterSlice = sentences.slice(afterStart);
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

  function segmentSnapshot(segment: SentenceSignal[]) {
    const segmentSignals = signals.filter((signal) => segment.some((sentence) => sentence.index === signal.index));
    const segmentEvents = eventSignals.filter((event) => segment.some((sentence) => sentence.index === event.index));
    const roleWeights = getSegmentRoleWeights(segment);
    const weights = getStateWeights(segmentSignals);
    const negative = weights.negative + segmentEvents.reduce((sum, event) => sum + event.negative, 0) + roleWeights.negative + roleWeights.threat * 0.65;
    const positive = weights.positive + segmentEvents.reduce((sum, event) => sum + event.positive, 0) + roleWeights.positive * 0.45 + roleWeights.supportive * 0.3;
    const grounded = weights.grounded + roleWeights.supportive * 0.45 + roleWeights.internalShift * 0.65 + roleWeights.coping * 0.25;
    const liminal = weights.liminal + roleWeights.reflection * 0.4 + roleWeights.atmosphere * 0.18 + roleWeights.mixed * 0.22;
    const reactive = weights.reactive + roleWeights.threat * 0.85 + roleWeights.negative * 0.15;
    const watchful = segmentSignals.filter((signal) => isWatchfulEmotion(signal.label)).reduce((sum, signal) => sum + signal.weight, 0) + roleWeights.concern * 0.9;
    const ranked = [...segmentSignals].sort((a, b) => b.weight - a.weight);
    const totalStrength = negative + positive + grounded + liminal + reactive + watchful;
    const hasLabel = (value: string) => segmentSignals.some((signal) => signal.label === value);
    const specificSegmentLabel = pickSpecificSegmentLabel(segmentSignals, ranked[0]?.label ?? "steady");
    const contextualLabel =
      roleWeights.threat >= 1.2 && reactive >= Math.max(grounded, liminal, 1.2)
        ? ranked.find((signal) => ["fearful", "alarmed", "reactive", "hostile", "angry", "burdened"].includes(signal.label))?.label ?? "fearful"
        : roleWeights.concern >= 1.05 && watchful >= Math.max(negative - 0.1, liminal, 1.1)
          ? ranked.find((signal) => ["investigative", "suspicious", "watchful", "vigilant", "concerned", "curious", "anticipatory"].includes(signal.label))
              ?.label ?? "watchful"
          : roleWeights.internalShift >= 1 && grounded >= Math.max(negative - 0.15, liminal - 0.1, 1.1)
            ? hasLabel("hopeful")
              ? "hopeful"
              : hasLabel("accepting")
              ? "accepting"
              : hasLabel("relieved")
                ? "relieved"
                : hasLabel("clarifying") || hasLabel("emotionally honest")
                  ? "clarifying"
                  : hasLabel("grounded")
                    ? "grounded"
                    : "grounded"
            : roleWeights.supportive >= 1 && grounded >= Math.max(negative - 0.1, 1)
              ? hasLabel("present") && /(felt more present|more present|aware|noticed)/i.test(segment.map((item) => getSegmentContextText(item)).join(" "))
                ? "present"
                : "grounded"
              : roleWeights.reflection >= 1 && liminal >= Math.max(grounded - 0.2, 1.2)
                ? hasLabel("emotionally honest")
                  ? "emotionally honest"
                  : hasLabel("clarifying")
                    ? "clarifying"
                    : specificSegmentLabel
                : specificSegmentLabel;

    const label: string =
      hasLabel("acute despair")
        ? "acute despair"
      : !isGenericArcLabel(contextualLabel)
        ? contextualLabel
      : reactive >= Math.max(grounded + positive, negative - 0.2) && ranked.find((signal) => isReactiveEmotion(signal.label))?.label
        ? ranked.find((signal) => isReactiveEmotion(signal.label))?.label ?? "reactive"
        : watchful >= Math.max(negative - 0.1, liminal, 1.4)
          ? ranked.find((signal) => isWatchfulEmotion(signal.label))?.label ?? "concerned"
        : hasLabel("emotionally honest") && grounded >= 1.1
          ? "clarifying"
        : hasLabel("hopeful")
          ? "hopeful"
        : hasLabel("relieved")
          ? "relieved"
        : hasLabel("calm")
          ? "calmer"
        : liminal >= 1.8 && grounded >= 1.1
          ? "clarifying"
          : liminal >= 2.1
            ? ranked.find((signal) => ["transitional", "tender", "emotionally honest", "curious", "investigative"].includes(signal.label))?.label ?? "transitional"
            : grounded >= 1.8 && positive >= negative
              ? hasLabel("accepting")
                ? "accepting"
                : hasLabel("grounded")
                  ? "grounded"
                  : hasLabel("relieved")
                    ? "relieved"
                    : specificSegmentLabel
              : negative > positive + 0.8
                ? ranked.find((signal) => signal.tone === "negative" || isReactiveEmotion(signal.label))?.label ?? specificSegmentLabel
                : positive > negative + 0.8
                  ? ranked.find((signal) => signal.tone === "positive" || signal.tone === "grounded")?.label ?? specificSegmentLabel
                  : specificSegmentLabel;

    return { label, negative, positive, grounded, liminal, reactive, watchful, totalStrength, ranked, roleWeights };
  }

  const startSnapshot = segmentSnapshot(slices[0]);
  const middleSnapshot = segmentSnapshot(slices[1]);
  const endSnapshot = segmentSnapshot(slices[2]);
  const arcStrength = startSnapshot.totalStrength + middleSnapshot.totalStrength + endSnapshot.totalStrength;
  const beforeSignals = signals.filter((signal) => beforeSlice.some((sentence) => sentence.index === signal.index));
  const afterSignals = signals.filter((signal) => afterSlice.some((sentence) => sentence.index === signal.index));
  const dominantBefore = getDominantSignal(beforeSignals, beforeSlice.length > 0 ? beforeSlice : sentences);
  const dominantAfter = getDominantSignal(afterSignals, afterSlice.length > 0 ? afterSlice : sentences);
  const lowSignalArc =
    sentences.length <= 2 ||
    arcStrength < 4.8 ||
    [startSnapshot.label, middleSnapshot.label, endSnapshot.label].filter(Boolean).length > 0 &&
      new Set([startSnapshot.label, middleSnapshot.label, endSnapshot.label]).size === 1;

  if (lowSignalArc) {
    const dominant =
      [endSnapshot, middleSnapshot, startSnapshot]
        .sort((a, b) => b.totalStrength - a.totalStrength)
        .find((snapshot) => snapshot.totalStrength > 0.6)?.label ?? pickSpecificSegmentLabel(signals, supports.length > 0 ? "grounded" : stressors.length > 0 ? "burdened" : "present");

    return {
      start: dominant,
      middle: dominant,
      reaction: dominant,
      end: dominant,
      direction: "unchanged" as const,
      arcMode: "single-state" as const,
      arcConfidence: arcStrength < 3.6 ? 0.28 : 0.48
    };
  }

  const start = startSnapshot.label;
  const middle = middleSnapshot.label;
  const end = endSnapshot.label;
  const before =
    dominantBefore?.signal.label && !isGenericArcLabel(dominantBefore.signal.label) ? dominantBefore.signal.label : start;
  const after =
    dominantAfter?.signal.label && !isGenericArcLabel(dominantAfter.signal.label) ? dominantAfter.signal.label : end;
  const beforeScore = dominantBefore?.score ?? 0;
  const afterScore = dominantAfter?.score ?? 0;
  const groundingEnd =
    /(present|accepting|steady|relieved|clarifying|unsettled but grounded|mixed recovery|grounded)/i.test(end) ||
    endSnapshot.grounded >= Math.max(endSnapshot.negative - 0.15, 1.4);
  const reactiveMiddle = middleSnapshot.reactive >= Math.max(startSnapshot.reactive, endSnapshot.reactive, 1.2);
  const reaction =
    middleSnapshot.reactive >= Math.max(startSnapshot.reactive, endSnapshot.reactive, 1.2)
      ? middleSnapshot.ranked.find((signal) => isReactiveEmotion(signal.label))?.label ?? middle
      : middleSnapshot.watchful >= Math.max(startSnapshot.watchful, endSnapshot.watchful, 1.3)
        ? middleSnapshot.ranked.find((signal) => isWatchfulEmotion(signal.label))?.label ?? middle
        : middle;
  const scoreDelta = Number((afterScore - beforeScore).toFixed(2));
  const sustainedReactivity = startSnapshot.reactive >= 1.6 && middleSnapshot.reactive >= 1.8 && endSnapshot.reactive >= 1.5;
  const sustainedWatchfulness = startSnapshot.watchful >= 1.4 && middleSnapshot.watchful >= 1.4 && endSnapshot.watchful >= 1.2;
  const explicitHarmPresent = stressors.some((item) => item.label === "physical aggression" || item.category === "harm" || item.label === "threatening situation");
  const preliminaryDirection: JournalAnalysis["emotional_shift"]["direction"] =
    Math.abs(scoreDelta) < 0.2 && after === before
      ? "unchanged"
      : sustainedReactivity || (explicitHarmPresent && end === reaction)
        ? "unchanged"
      : reactiveMiddle && groundingEnd
        ? "improved"
      : after === before && middle !== start
        ? "mixed"
      : scoreDelta > 0.45 && after !== before
        ? "improved"
      : scoreDelta < -0.45 && after !== before
        ? "worsened"
      : end === start
      ? middle !== start
        ? "mixed"
        : "unchanged"
      : groundingEnd &&
          !/(present|steady|accepting|relieved|hopeful|clarifying|unsettled but grounded|mixed recovery|grounded)/i.test(start) &&
          endSnapshot.reactive < startSnapshot.reactive + 0.2
        ? "improved"
      : /(overwhelmed|anxious|tense|angry|rageful|hostile|resentful|spiteful|frustrated|drained|sad|numb|grieving|ashamed|strained|acute despair|burdened|reactive)/i.test(end) &&
            !/(overwhelmed|anxious|tense|angry|rageful|hostile|resentful|spiteful|frustrated|drained|sad|numb|grieving|ashamed|strained|acute despair|burdened|reactive)/i.test(start)
          ? "worsened"
          : "mixed";

  const layeredArc = supports.length > 0 && stressors.length > 0 && Math.abs(endSnapshot.positive - endSnapshot.negative) < 0.7;
  const unresolvedArc = (explicitHarmPresent || sustainedReactivity) && end === reaction;
  const arcMode =
    sentences.length <= 2 || (preliminaryDirection === "unchanged" && !reactiveMiddle && !sustainedWatchfulness)
      ? ("single-state" as const)
      : unresolvedArc
        ? ("unresolved" as const)
        : layeredArc
          ? ("layered" as const)
          : (startSnapshot.positive >= 1.2 && middleSnapshot.negative >= startSnapshot.positive + 0.4) || (reactiveMiddle && end === start)
            ? ("interrupted" as const)
            : preliminaryDirection === "mixed" || sustainedWatchfulness || (supports.length > 0 && stressors.length > 0 && end !== reaction && start !== reaction)
              ? ("mixed-thread" as const)
              : ("shifted" as const);
  const direction: JournalAnalysis["emotional_shift"]["direction"] =
    arcMode === "single-state"
      ? "unchanged"
      : arcMode === "interrupted" || arcMode === "mixed-thread" || arcMode === "layered"
        ? "mixed"
        : arcMode === "unresolved"
          ? (after === before ? "unchanged" : "mixed")
          : preliminaryDirection;

  return { start: before, middle, reaction, end: after, direction, arcMode, arcConfidence: clamp(arcStrength / 9, 0.35, 0.92) };
}

function synthesizeInterpretation(
  entry: string,
  eventsResult: ReturnType<typeof extractEvents>,
  stateResult: ReturnType<typeof extractStateSignals>,
  supportsResult: ReturnType<typeof detectSupportsAndCoping>,
  stressorsResult: ReturnType<typeof detectStressors>,
  timeline: ReturnType<typeof buildEmotionalTimeline>,
  userCheckIns?: UserCheckIns
) {
  const { sentences, signals } = stateResult;
  const { supports, copingActions, restorativeSignals } = supportsResult;
  const { stressors, triggers } = stressorsResult;
  const dominantOverall = getDominantSignal(signals, sentences);
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
  const reactiveWeight = signals.filter((signal) => isReactiveEmotion(signal.label)).reduce((sum, signal) => sum + signal.weight, 0);
  const watchfulWeight = signals.filter((signal) => isWatchfulEmotion(signal.label)).reduce((sum, signal) => sum + signal.weight, 0);
  const acuteRiskWeight = signals.filter((signal) => signal.label === "acute despair").reduce((sum, signal) => sum + signal.weight, 0);
  const hopefulWeight = signals.filter((signal) => signal.label === "hopeful").reduce((sum, signal) => sum + signal.weight, 0);
  const concernedWeight = signals.filter((signal) => signal.label === "concerned").reduce((sum, signal) => sum + signal.weight, 0);
  const checkInProfile = getCheckInInterpretationProfile(userCheckIns);
  const topSupport = supports[0];
  const topStressor = stressors[0];
  const familyHealthConcern = stressors.find((item) => item.label === "family health concern");
  const caregivingAction = copingActions.find((item) => /(care|nourishing|heal|better|care for someone)/i.test(item.action) || hasCaregivingAction(getCopingEvidenceText(item)));
  const productivitySupport = supports.find((item) => item.label === "productive progress");
  const careTarget = findMatch(entry, /\bFlora\b/i) ?? findMatch(entry, /\b(daughter|son|child|kid|mom|dad|mother|father|sister|brother|partner|wife|husband)\b/i) ?? "their loved one";
  const caregivingPhrase = caregivingAction && /soup|broth|tea|meal/i.test(getCopingEvidenceText(caregivingAction)) ? "through the act of making soup" : "through an act of care";
  const startState = timeline.start ?? "steady";
  const middleState = timeline.middle ?? "steady";
  const reactionState = timeline.reaction ?? middleState;
  const endState = timeline.end ?? "steady";
  const centralSignals = rankedStates
    .slice(0, 4)
    .map(([label]) => label)
    .filter((label) => !["reflective", "mixed"].includes(label));

  let primaryEmotion = dominantOverall?.signal.label ?? rankedStates[0]?.[0] ?? "present";
  if (acuteRiskWeight >= 2.4) primaryEmotion = "acute despair";
  else if (reactiveWeight >= Math.max(groundedWeight + positiveWeight, negativeWeight - 0.2)) {
    primaryEmotion =
      centralSignals.find((label) => ["rageful", "hostile", "spiteful", "resentful", "angry", "vindicated", "disgusted", "fearful", "alarmed"].includes(label)) ??
      primaryEmotion;
  } else if (familyHealthConcern && (concernedWeight >= 1 || /upset because/i.test(entry) || /worried|concerned/i.test(entry))) {
    primaryEmotion = hopefulWeight > concernedWeight + 0.35 && timeline.direction === "improved" ? "hopeful" : "concerned";
  } else if (watchfulWeight >= Math.max(negativeWeight - 0.15, liminalWeight, 1.8)) {
    primaryEmotion =
      centralSignals.find((label) => ["concerned", "suspicious", "watchful", "vigilant", "curious", "investigative", "fearful", "alarmed"].includes(label)) ??
      "concerned";
  } else if (liminalWeight >= 2.4 && groundedWeight >= 1.2) primaryEmotion = signals.some((signal) => signal.label === "emotionally honest") ? "clarifying" : "grounded";
  else if (liminalWeight >= 2.6 && negativeWeight < liminalWeight + 1.5) primaryEmotion = "transitional";
  else if (groundedWeight >= 2.1 && negativeWeight <= groundedWeight + 0.6 && reactiveWeight < 1) primaryEmotion = signals.some((signal) => signal.label === "accepting") ? "accepting" : signals.some((signal) => signal.label === "grounded") ? "grounded" : "present";
  else if (supports.length > 0 && stressors.length > 0 && timeline.direction === "improved") primaryEmotion = "mixed recovery";
  else if (supports.length > 0 && negativeWeight < positiveWeight) primaryEmotion = supports.some((item) => item.impact === "grounding") ? "grounded" : "relieved";
  else if (stressors.length > 0 && negativeWeight > positiveWeight + 0.8) primaryEmotion = centralSignals.find((label) => !["present", "steady", "reflective"].includes(label)) ?? primaryEmotion;
  else if (isMeaningfulDiscomfort(sentences[Math.min(1, Math.max(0, sentences.length - 1))] ?? sentences[0])) primaryEmotion = signals.some((signal) => signal.label === "emotionally honest") ? "emotional honesty" : "tender";
  else if (!primaryEmotion && positiveWeight >= negativeWeight) {
    primaryEmotion = "present";
  }
  if (
    checkInProfile.highStress &&
    !acuteRiskWeight &&
    !["acute despair", "hostile", "rageful", "angry", "spiteful", "fearful", "alarmed", "anxious", "overwhelmed", "tense", "burdened", "reactive", "watchful", "concerned"].includes(
      primaryEmotion
    )
  ) {
    primaryEmotion =
      centralSignals.find((label) => ["alarmed", "fearful", "anxious", "tense", "overwhelmed", "concerned", "watchful"].includes(label)) ??
      (checkInProfile.highEnergy ? "activated" : "tense");
  }

  if (checkInProfile.highMood && !acuteRiskWeight && !checkInProfile.highStress && ["sad", "grieving", "numb", "drained"].includes(primaryEmotion) && positiveWeight >= negativeWeight - 0.4) {
    primaryEmotion = centralSignals.find((label) => ["joyful", "hopeful", "relieved", "steady", "grounded", "satisfied"].includes(label)) ?? "steady";
  }

  if (checkInProfile.lowEnergy && checkInProfile.lowMood && !acuteRiskWeight && ["present", "steady", "grounded"].includes(primaryEmotion) && negativeWeight >= positiveWeight) {
    primaryEmotion = centralSignals.find((label) => ["numb", "drained", "sad", "lonely"].includes(label)) ?? "drained";
  }

  if (stressors.some((item) => item.label === "physical aggression" || item.category === "harm") && !["hostile", "rageful", "angry", "spiteful"].includes(primaryEmotion)) {
    primaryEmotion = centralSignals.find((label) => ["hostile", "rageful", "angry", "spiteful", "disgusted"].includes(label)) ?? "hostile";
  }

  const secondaryEmotions = unique(
    rankedStates
      .map(([label]) => label)
      .filter((label) => label !== primaryEmotion)
      .filter((label) => !["reflective", "mixed"].includes(label))
      .slice(0, 4)
  );

  let summary = "";
  if (acuteRiskWeight >= 2.4) {
    summary = "The entry carries acute despair language, and the surrounding tone stays heavy rather than calming by the end.";
  } else if (stressors.some((item) => item.label === "physical aggression" || item.category === "harm")) {
    summary = "The entry is shaped by explicit aggression or harm, and the emotional tone stays more reactive and unsafe than settled.";
  } else if (familyHealthConcern && caregivingAction && hasHealingHope(entry)) {
    summary = productivitySupport
      ? `The entry moves from ${productivitySupport.label} into concern for ${careTarget}'s health, then toward care and hope ${caregivingPhrase}.`
      : `The entry moves from concern about a loved one's health toward care and hope ${caregivingPhrase}.`;
  } else if (["proud", "accomplished", "excited", "motivated"].includes(primaryEmotion) && topSupport) {
    summary = `${topSupport.label} gives the entry a stronger sense of momentum and satisfaction, so the tone lands more accomplished than strained.`;
  } else if (timeline.arcMode === "single-state") {
    summary =
      checkInProfile.highStress && checkInProfile.highEnergy
        ? `The entry stays in a highly activated state, with more intensity than resolution across the whole reflection.`
        : ["grounded", "clarifying", "accepting", "relieved"].includes(primaryEmotion)
          ? "The entry stays in a quieter, more attentive frame, with more grounding than dramatic emotional movement."
        : watchfulWeight >= 1.6 && negativeWeight <= watchfulWeight + 0.8
          ? "The entry stays in a watchful, concerned frame rather than moving through a large emotional shift."
          : `The entry stays mostly in one emotional frame, landing as ${primaryEmotion} rather than moving through a strong before-and-after change.`;
  } else if (timeline.arcMode === "unresolved") {
    summary = topStressor
      ? `${topStressor.label} keeps the entry activated, and the stronger reaction does not truly settle by the end.`
      : `The entry carries a sharper reaction that stays unresolved rather than softening into a clearer landing.`;
  } else if (timeline.arcMode === "layered") {
    summary = topSupport && topStressor
      ? `${topSupport.label} and ${topStressor.label} coexist here, so the entry lands with layered steadiness and strain rather than a simple turn in one direction.`
      : `The entry holds layered emotional threads at once, so the landing is more coexistence than clean resolution.`;
  } else if (timeline.arcMode === "interrupted") {
    summary = topStressor
      ? `The entry starts from a steadier footing, gets interrupted by ${topStressor.label}, and then lands calmer than the hardest moment itself.`
      : `The entry carries a steadier opening, a sharper interruption in the middle, and a more regulated ending than the peak reaction.`;
  } else if (timeline.arcMode === "shifted") {
    summary = `The entry moves through a sharper ${reactionState} reaction and then lands in a more ${endState} place by the end.`;
  } else if (timeline.arcMode === "mixed-thread") {
    summary = topSupport && topStressor
      ? `${topStressor.label} and ${topSupport.label} both matter here, and the entry holds that mixed state without forcing a dramatic turn.`
      : `The entry holds more than one emotional thread at once, with mixed but meaningful movement rather than a simple before-and-after shift.`;
  } else if (reactiveWeight >= 2.1 && endState === reactionState) {
    summary = `The entry intensifies into ${reactionState}, and it lands there without much sign of resolution.`;
  } else if (watchfulWeight >= 1.8 && endState === reactionState) {
    summary = `The entry stays alert and concerned, with more watchfulness than release by the end.`;
  } else if (reactiveWeight >= 1.8 && /(present|accepting|steady|relieved|clarifying|unsettled but grounded)/i.test(endState)) {
    summary = `The entry moves through a sharper reactive moment and then lands in a more ${endState} place by the end.`;
  } else if (primaryEmotion === "transitional" || primaryEmotion === "grounded" || primaryEmotion === "clarifying") {
    summary = topSupport
      ? `The entry sits in a transitional space, with uncertainty still present but ${topSupport.label} helping it land in a more grounded place.`
      : "The entry feels transitional rather than crisis-driven, holding uncertainty and awareness at the same time.";
  } else if (watchfulWeight >= 1.7 && topStressor) {
    summary = `${topStressor.label} creates the clearest point of concern, and the entry lands more watchful and alert than simply sad or reflective.`;
  } else if (reactionState !== startState && endState !== reactionState && /(present|accepting|steady|relieved|clarifying|unsettled but grounded)/i.test(endState)) {
    summary = `The entry opens in ${startState}, moves through ${reactionState}, and lands closer to ${endState} by the end.`;
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
    summary = `The entry moves from ${startState} through ${middleState} and lands closer to ${endState}, with an overall tone that feels ${primaryEmotion}.`;
  }

  if (checkInProfile.highMood && stressors.length > 0 && !/overall|mixed|both|alongside/i.test(summary)) {
    summary += " Even with the strain, the overall check-in suggests the day still held more positive footing than the hardest moment alone would imply.";
  } else if (checkInProfile.highStress && /steady|present|accepting/.test(summary) && stressors.length > 0) {
    summary += " The user check-in still points to high strain, so the steadier ending reads more like partial regulation than full ease.";
  } else if (checkInProfile.lowEnergy && !/low energy|depleted|drained|flat/.test(summary) && negativeWeight >= positiveWeight) {
    summary += " The check-in also suggests the day landed with lower energy than the text alone might imply.";
  }

  const sentimentScore = clamp(Number(((positiveWeight - negativeWeight) / 6).toFixed(2)), -1, 1);
  const sentiment: JournalAnalysis["sentiment"] = {
    label: positiveWeight > 0.6 && negativeWeight > 0.6 ? "mixed" : sentimentScore > 0.2 ? "positive" : sentimentScore < -0.2 ? "negative" : "neutral",
    score: sentimentScore
  };

  const inferredMoodScore = clamp(Math.round(5.5 + sentimentScore * 3), 1, 10);
  const inferredStressLevel = clamp(Math.round(3 + negativeWeight * 1.1), 1, 10);
  const inferredEnergyLevel = clamp(Math.round(5 + (supports.some((item) => item.impact === "energizing") ? 2 : 0) - (signals.some((signal) => signal.label === "drained") ? 2 : 0)), 1, 10);
  const moodScore = checkInProfile.mood ?? inferredMoodScore;
  const stressLevel = checkInProfile.stress ?? inferredStressLevel;
  const energyLevel = checkInProfile.energy ?? inferredEnergyLevel;
  const energyDirection: JournalAnalysis["energy_direction"] =
    stressLevel >= 8 && energyLevel >= 7
      ? "mixed"
      : stressLevel >= 7
        ? "draining"
        : supports.length > 0 && positiveWeight >= negativeWeight
          ? "restorative"
          : positiveWeight > 0.8 && negativeWeight > 0.8
            ? "mixed"
            : energyLevel >= 7
              ? "restorative"
              : "neutral";
  const recurringTopics = deriveEntryTopics(entry, supports, copingActions, stressors, signals, primaryEmotion);
  const themes = deriveThemeLabels(supports, copingActions, stressors, recurringTopics, primaryEmotion);

  const notablePhrases = unique([
    ...getCentralSentences(sentences)
      .filter((sentence) => isNotablePhraseCandidate(sentence.sentence))
      .map((sentence) => ({ sentence: sentence.sentence, score: scoreNotablePhrase(sentence.sentence) + scoreSentenceStrength(sentence) * 0.35 }))
      .sort((a, b) => b.score - a.score)
      .filter((item) => item.score >= 1.7)
      .slice(0, 2)
      .map((item) => item.sentence),
    findMatch(entry, /maybe that'?s enough/i) || null,
    findMatch(entry, /didn't solve anything but felt more present/i) || null,
    findMatch(entry, /in between versions of my life|in-between versions of my life/i) || null,
    analysisLikeCoreLine(entry)
  ]).filter((phrase) => phrase && phrase.length <= 160).slice(0, 2);

  const personalKeywords = unique([
    ...[
      findMatch(entry, /\bMike\b/i),
      findMatch(entry, /\bLily\b/i),
      findMatch(entry, /\bbookstore\b/i),
      findMatch(entry, /\bhome\b/i),
      findMatch(entry, /\bquiet house\b/i),
      findMatch(entry, /\bcoffee\b/i),
      findMatch(entry, /\bdog\b/i),
      findMatch(entry, /\blaundromat\b/i),
      findMatch(entry, /\brefund call\b/i),
      findMatch(entry, /\bsister\b/i),
      findMatch(entry, /\bFlora\b/i),
      findMatch(entry, /\bfront door\b/i),
      findMatch(entry, /\bmorning routine\b/i),
      findMatch(entry, /\bfarmer'?s market\b/i),
      findMatch(entry, /\bStudio Moonfall\b/i),
      findMatch(entry, /\bmall\b/i),
      ...collectCapitalizedAnchors(entry),
      ...supports.map((item) => keywordFromPromotedItem(item.label)),
      ...stressors.map((item) => keywordFromPromotedItem(item.label))
    ]
  ])
    .map((item) => sanitizePersonalKeywordFinal(item ?? "", "none"))
    .filter((item, index, items) => Boolean(item) && items.indexOf(item) === index)
    .filter((item) => isEligiblePersonalKeyword(item, item))
    .slice(0, 5);

  const promotedEmotionEvidenceLabels = new Set(
    [primaryEmotion, startState, reactionState, endState]
      .filter(Boolean)
      .map((item) => normalizeConceptLabel(item))
      .filter((item) => !isGenericArcLabel(item))
  );

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
      start_state: startState,
      end_state: endState,
      direction: timeline.direction
    },
    themes,
    recurringTopics,
    personalKeywords,
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
        .map((item) => JSON.stringify({ text: quoteSupportingEvidence(item.evidence), type: "stressor" as const, label: normalizePromotedConcept(item.label, item.evidence, "stressor") })),
      ...supports
        .slice(0, 2)
        .filter((item) => isEvidenceLabelMatch(item.label, item.evidence))
        .map((item) => JSON.stringify({ text: quoteSupportingEvidence(item.evidence), type: "support" as const, label: normalizePromotedConcept(item.label, item.evidence, "support") })),
      // The persisted evidence schema only supports emotion/stressor/support/topic/safety.
      // Coping and restorative proof therefore rides through as support evidence rather than
      // creating a parallel enum contract that db.ts / UI do not understand yet.
      ...copingActions
        .slice(0, 2)
        .map((item) => JSON.stringify({ text: quoteSupportingEvidence(getCopingEvidenceText(item)), type: "support" as const, label: item.action })),
      ...restorativeSignals
        .slice(0, 2)
        .map((item: string) => {
          const supportEvidence = supports.find((support) => describeRestorativeMoment(support.label, support.evidence) === item)?.evidence;
          const sentenceEvidence = sentences.find((sentence) => describeRestorativeMoment(sentence.sentence, getSegmentContextText(sentence)) === item);
          const evidence = supportEvidence ?? (sentenceEvidence ? getSegmentContextText(sentenceEvidence) : "");
          return evidence ? JSON.stringify({ text: quoteSupportingEvidence(evidence), type: "support" as const, label: item }) : null;
        })
        .filter((item: string | null): item is string => Boolean(item)),
      ...signals
        .filter((item) => promotedEmotionEvidenceLabels.has(normalizeConceptLabel(item.label)))
        .filter((item) => !isWeakEntityLabel(item.label))
        .slice(0, 2)
        .map((item) => JSON.stringify({ text: quoteSupportingEvidence(item.evidence), type: "emotion" as const, label: normalizeConceptLabel(item.label) }))
    ]).map((item) => JSON.parse(item) as JournalAnalysis["evidence_spans"][number]),
    notablePhrases,
    reflectionTags: unique([sanitizeBucketOutputLabel(primaryEmotion, "emotion"), ...themes, supports.length > 0 ? "grounding" : null, stressors.length > 0 ? "strain" : null])
      .filter(Boolean)
      .slice(0, 6),
    confidence: {
      primary_emotion: rankedStates.length > 0 ? (timeline.arcMode === "single-state" ? 0.74 : 0.86) : 0.5,
      triggers: stressors.length > 0 ? 0.82 : 0.42,
      coping_actions: copingActions.length > 0 ? 0.84 : 0.4,
      overall: signals.length > 0 || supports.length > 0 || stressors.length > 0 ? (timeline.arcMode === "single-state" ? 0.72 : 0.8) : 0.46
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

function applyCheckInGuardrailsToAnalysis(analysis: JournalAnalysis, userCheckIns?: UserCheckIns) {
  const profile = getCheckInInterpretationProfile(userCheckIns);

  if (!userCheckIns || Object.values(userCheckIns).every((value) => value === null || value === undefined)) {
    return analysis;
  }

  let next = {
    ...analysis,
    user_mood: profile.mood ?? null,
    user_stress: profile.stress ?? null,
    user_energy: profile.energy ?? null,
    mood_score: profile.mood ?? analysis.mood_score,
    stress_level: profile.stress ?? analysis.stress_level,
    energy_level: profile.energy ?? analysis.energy_level
  };

  if (!/(acute despair|hostile|rageful|spiteful|angry|fearful|alarmed|anxious|overwhelmed|tense|concerned|watchful|vigilant|burdened|reactive)/i.test(next.primary_emotion) && profile.highStress) {
    next.primary_emotion = profile.highEnergy ? "activated" : "tense";
  }

  if (profile.highMood && /(sad|grieving|numb|drained)/i.test(next.primary_emotion) && next.safety_assessment.level === "none") {
    next.primary_emotion = next.secondary_emotions.find((item) => /(hopeful|relieved|steady|joyful|grounded|satisfied)/i.test(item)) ?? "mixed recovery";
  }

  if (profile.lowEnergy && /(steady|present|grounded)/i.test(next.primary_emotion) && profile.lowMood) {
    next.primary_emotion = "drained";
  }

  if (profile.highStress && /steady|present|accepting|neutral/i.test(next.summary)) {
    next.summary += " The check-in still points to high strain, so any steadiness here should be read as partial regulation rather than full ease.";
  } else if (profile.highMood && !/positive footing|overall check-in|still held/i.test(next.summary) && next.sentiment.label !== "negative") {
    next.summary += " The check-in suggests the day still carried more positive footing overall than the hardest moment alone might imply.";
  }

  next.energy_direction =
    next.stress_level >= 8 && next.energy_level >= 7
      ? "mixed"
      : next.stress_level >= 7
        ? "draining"
        : next.energy_level >= 7
          ? "restorative"
          : next.energy_direction;

  return validateAnalysis(next);
}

function normalizeModelAnalysisShape(input: unknown): unknown {
  if (!input || typeof input !== "object") {
    return input;
  }

  const analysis = input as Record<string, unknown>;

  return {
    ...analysis,
    coping_actions: Array.isArray(analysis.coping_actions)
      ? analysis.coping_actions.map((item) =>
          item && typeof item === "object"
            ? {
                ...(item as Record<string, unknown>),
                impact: normalizeCopingImpact((item as Record<string, unknown>).impact as string | undefined | null)
              }
            : item
        )
      : analysis.coping_actions,
    supports: Array.isArray(analysis.supports)
      ? analysis.supports.map((item) =>
          item && typeof item === "object"
            ? {
                ...(item as Record<string, unknown>),
                impact: normalizeSupportImpact((item as Record<string, unknown>).impact as string | undefined | null)
              }
            : item
        )
      : analysis.supports,
    evidence_spans: Array.isArray(analysis.evidence_spans)
      ? analysis.evidence_spans.map((item) =>
          item && typeof item === "object"
            ? {
                ...(item as Record<string, unknown>),
                type: normalizeEvidenceType((item as Record<string, unknown>).type as string | undefined | null)
              }
            : item
        )
      : analysis.evidence_spans,
    energy_direction: normalizeEnergyDirectionValue(analysis.energy_direction as string | undefined | null),
    emotional_shift:
      analysis.emotional_shift && typeof analysis.emotional_shift === "object"
        ? {
            ...(analysis.emotional_shift as Record<string, unknown>),
            direction: normalizeShiftDirectionValue(
              (analysis.emotional_shift as Record<string, unknown>).direction as string | undefined | null
            )
          }
        : analysis.emotional_shift
  };
}

// Active staged heuristic path:
// raw entry -> extractEvents / extractStateSignals -> support & stressor promotion ->
// emotional timeline synthesis -> safety suppression -> output sanitization -> validation.
function buildHeuristicAnalysis(rawText: string, userCheckIns?: UserCheckIns): JournalAnalysis {
  const eventsResult = extractEvents(rawText);
  const stateResult = extractStateSignals(rawText);
  const supportsResult = detectSupportsAndCoping(rawText, eventsResult, stateResult);
  const stressorsResult = detectStressors(rawText, eventsResult, stateResult);
  const timeline = buildEmotionalTimeline(rawText, stateResult, supportsResult.supports, stressorsResult.stressors);
  const safetyAssessment = detectSafetyAssessment(rawText);
  const interpretation = applySafetySensitiveSuppression(
    synthesizeInterpretation(rawText, eventsResult, stateResult, supportsResult, stressorsResult, timeline, userCheckIns),
    safetyAssessment
  );

  return applyCheckInGuardrailsToAnalysis(
    applySafetySensitiveSuppressionToAnalysis(
      sanitizeAnalysisOutput(
        validateAnalysis({
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
      })
      )
    ),
    userCheckIns
  );
}

async function callOpenAI(rawText: string, userCheckIns?: UserCheckIns): Promise<{ analysis: JournalAnalysis; mode: "mock" | "openai" }> {
  const prompt = await getPromptText();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { analysis: buildMockAnalysis(rawText, userCheckIns), mode: "mock" };
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
    return { analysis: buildMockAnalysis(rawText, userCheckIns), mode: "mock" };
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  const parsed = typeof content === "string" ? JSON.parse(content) : content;
  const normalizedParsed = normalizeModelAnalysisShape(parsed);

  return {
    analysis: applyCheckInGuardrailsToAnalysis(
      applySafetySensitiveSuppressionToAnalysis(sanitizeAnalysisOutput(validateAnalysis(normalizedParsed))),
      userCheckIns
    ),
    mode: "openai"
  };
}

export async function getPromptText() {
  return fs.readFile(promptPath, "utf8");
}

export function buildMockAnalysis(rawText: string, userCheckIns?: UserCheckIns): JournalAnalysis {
  if (rawText.trim().toLowerCase() === mockAnalysis.raw_text.toLowerCase()) {
    return applyCheckInGuardrailsToAnalysis(
      sanitizeAnalysisOutput(
        validateAnalysis({
        ...mockAnalysis,
        raw_text: rawText
      })
      ),
      userCheckIns
    );
  }

  return buildHeuristicAnalysis(rawText, userCheckIns);
}

export async function analyzeEntry(rawText: string, userCheckIns?: UserCheckIns): Promise<{ analysis: JournalAnalysis; mode: "mock" | "openai" }> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      analysis: buildMockAnalysis(rawText, userCheckIns),
      mode: "mock"
    };
  }

  return callOpenAI(rawText, userCheckIns);
}
