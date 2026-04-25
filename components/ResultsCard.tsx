import Link from "next/link";

import { SafetySupportCard } from "@/components/SafetySupportCard";
import type { JournalAnalysis } from "@/types/journal";

type ResultsCardProps = {
  analysis: JournalAnalysis;
  mode?: "mock" | "openai";
  archiveBasePath?: string;
  linkTags?: boolean;
};

function normalizeLooseText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function phrasesSubstantiallyOverlap(a: string, b: string) {
  const normalizedA = normalizeLooseText(a);
  const normalizedB = normalizeLooseText(b);

  if (!normalizedA || !normalizedB) return false;
  if (normalizedA === normalizedB) return true;

  const [shorter, longer] =
    normalizedA.length <= normalizedB.length ? [normalizedA, normalizedB] : [normalizedB, normalizedA];

  if (shorter.length >= 16 && longer.includes(shorter)) return true;

  const shorterWords = shorter.split(" ").filter(Boolean);
  const longerWords = new Set(longer.split(" ").filter(Boolean));
  const overlapCount = shorterWords.filter((word) => longerWords.has(word)).length;

  return shorterWords.length >= 4 && overlapCount / shorterWords.length >= 0.8;
}

function semanticLabelOverlap(a: string, b: string) {
  const normalizedA = normalizeLooseText(a);
  const normalizedB = normalizeLooseText(b);

  if (!normalizedA || !normalizedB) return false;
  if (normalizedA === normalizedB) return true;

  const [shorter, longer] =
    normalizedA.length <= normalizedB.length ? [normalizedA, normalizedB] : [normalizedB, normalizedA];

  return shorter.length >= 6 && longer.includes(shorter);
}

function isPhraseLikeLanguage(text: string) {
  const normalized = normalizeLooseText(text);
  const wordCount = normalized.split(" ").filter(Boolean).length;

  return wordCount >= 3;
}

function buildTopicsAndThemes(analysis: JournalAnalysis) {
  const blocked = [
    analysis.primary_emotion,
    ...analysis.secondary_emotions,
    ...analysis.supports.map((item) => item.label),
    ...analysis.stressors.map((item) => item.label),
    ...analysis.personal_keywords
  ].filter(Boolean);

  const candidates = [...(analysis.recurring_topics ?? []), ...(analysis.themes ?? []), ...(analysis.reflection_tags ?? [])]
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !/^(fearful|scared|relieved|grounded|present|steady|watchful|curious|sad|tense|burdened|stress|strain)$/i.test(item))
    .filter((item) => !blocked.some((blockedItem) => semanticLabelOverlap(item, blockedItem)));

  const prioritized = [...candidates].sort((a, b) => {
    const score = (value: string) => {
      let total = 0;
      if (/\b(social connection|home safety|reappraisal|self-regulation|family|friendship|creativity|school|money|boundaries|caregiving|recovery|productivity|academic achievement|investigation|watchfulness)\b/i.test(value)) {
        total += 3;
      }
      if (value.includes(" ")) total += 1;
      return total;
    };

    return score(b) - score(a) || b.length - a.length;
  });

  const kept: string[] = [];

  for (const candidate of prioritized) {
    if (kept.some((item) => semanticLabelOverlap(item, candidate))) continue;
    kept.push(candidate);
    if (kept.length >= 6) break;
  }

  return kept;
}

function buildNotableLanguage(analysis: JournalAnalysis) {
  const blockedSingleTerms = [analysis.primary_emotion, ...analysis.secondary_emotions].map((item) => normalizeLooseText(item));
  const candidates = [
    ...analysis.notable_phrases.map((item) => ({ text: item.trim(), score: 3 })),
    ...analysis.custom_emotion_terms
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item) => isPhraseLikeLanguage(item))
      .filter((item) => !blockedSingleTerms.includes(normalizeLooseText(item)))
      .map((item) => ({ text: item, score: 2 }))
  ]
    .filter((item) => item.text)
    .sort((a, b) => b.score - a.score || b.text.length - a.text.length);

  const kept: string[] = [];

  for (const candidate of candidates) {
    if (kept.some((item) => phrasesSubstantiallyOverlap(item, candidate.text))) continue;
    kept.push(candidate.text);
    if (kept.length >= 3) break;
  }

  return kept;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-chip">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SectionTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="section-title-row">
      <p className="section-label section-title-copy">{title}</p>
      <span className="section-hint" title={hint} aria-label={hint} tabIndex={0}>
        <span aria-hidden="true">i</span>
        <span className="section-tooltip" role="tooltip">
          {hint}
        </span>
      </span>
    </div>
  );
}

function FilterTag({
  label,
  href,
  linkTags
}: {
  label: string;
  href: string;
  linkTags: boolean;
}) {
  if (!linkTags) {
    return <span className="tag">{label}</span>;
  }

  return (
    <Link href={href as any} className="tag tag-link">
      {label}
    </Link>
  );
}

function formatRestorativeMoment(value: string) {
  if (/^moment of /i.test(value)) {
    return value;
  }

  if (/clarity|clearer|honest/i.test(value)) return "moment of clarity";
  if (/ground|steady|calm|settled|present/i.test(value)) return "moment of grounding";
  if (/quiet|slow|slowed/i.test(value)) return "moment of quiet";
  if (/aware|noticed/i.test(value)) return "moment of awareness";
  if (/relief|relieved|lighter|eased/i.test(value)) return "moment of release";
  return `moment of ${value}`;
}

export function ResultsCard({ analysis, archiveBasePath = "/archive", linkTags = true }: ResultsCardProps) {
  const displayMood = analysis.user_mood ?? analysis.mood_score;
  const displayStress = analysis.user_stress ?? analysis.stress_level;
  const displayEnergy = analysis.user_energy ?? analysis.energy_level;
  const topicsAndThemes = buildTopicsAndThemes(analysis);
  const notableLanguage = buildNotableLanguage(analysis);
  const safetyLevel = analysis.safety_assessment.level;
  const isHighConcern = safetyLevel === "high";
  const isModerateConcern = safetyLevel === "moderate";

  return (
    <section className="panel results-panel results-panel-mobile-safe reveal-group">
      {isHighConcern ? <div className="safety-veil" aria-hidden="true" /> : null}
      <SafetySupportCard assessment={analysis.safety_assessment} />

      <div className="section-head">
        <div>
          <p className="section-label">Analysis result</p>
          <h2>Entry insights</h2>
        </div>
      </div>

      {isHighConcern ? (
        <div className="results-grid results-grid-mobile-safe">
          <article className="detail-panel detail-panel-strong reveal-panel">
            <SectionTitle
              title="Support first"
              hint="When concern is high, Atlas Journal pauses interpretation and prioritizes immediate support."
            />
            <p>
              This entry deserves care before interpretation. The normal analysis is intentionally paused here so the support guidance stays front and center.
            </p>
          </article>

          <article className="detail-panel reveal-panel">
            <SectionTitle
              title="Raw entry"
              hint="The original writing is preserved exactly as written."
            />
            <p className="raw-entry">{analysis.raw_text}</p>
          </article>
        </div>
      ) : (
        <div className="results-grid">
          <article className="detail-panel detail-panel-strong reveal-panel">
            <SectionTitle title="Raw entry" hint="The original journal text stays intact so the interpretation remains anchored in your actual language." />
            <p className="raw-entry">{analysis.raw_text}</p>
          </article>

          <article className="detail-panel reveal-panel">
            <SectionTitle title="Summary" hint="A grounded synthesis of what shaped the entry, including strain, support, and how the tone landed." />
            <p>{analysis.summary}</p>
            <div className="chip-row results-stat-grid">
              <Stat label="Primary emotion" value={analysis.primary_emotion} />
              <Stat label={analysis.user_mood !== null ? "Mood check-in" : "Mood"} value={`${displayMood}/10`} />
              <Stat label={analysis.user_stress !== null ? "Stress check-in" : "Stress"} value={`${displayStress}/10`} />
              <Stat label={analysis.user_energy !== null ? "Energy check-in" : "Energy"} value={`${displayEnergy}/10`} />
              <Stat label="Energy direction" value={analysis.energy_direction} />
            </div>
            {analysis.user_mood !== null || analysis.user_stress !== null || analysis.user_energy !== null ? (
              <p className="muted-text">Your check-ins are shown directly and shape the interpretation and trend views for this entry before AI fallbacks are used.</p>
            ) : null}
          </article>

          <article className="detail-panel emotional-shift-panel reveal-panel">
            <SectionTitle
              title="Emotional transformation"
              hint="How the entry seems to move from its opening state to where it lands, without forcing a dramatic arc when the writing stays mostly in one frame."
            />
            <div className="shift-journey">
              <div className="shift-state">
                <span className="section-label">Before</span>
                <strong>{analysis.emotional_shift.start_state}</strong>
              </div>
              <div className="shift-arrow" aria-hidden="true">
                {"->"}
              </div>
              <div className="shift-state">
                <span className="section-label">After</span>
                <strong>{analysis.emotional_shift.end_state}</strong>
              </div>
            </div>
            <p className="muted-text shift-caption">Movement: {analysis.emotional_shift.direction}</p>
            <div className="tag-row results-tag-row">
              {analysis.secondary_emotions.map((item) => (
                <span key={item} className="tag">
                  {item}
                </span>
              ))}
            </div>
          </article>

          <article className="detail-panel reveal-panel">
            <SectionTitle
              title="Stressors"
              hint="What burdened, pressured, disrupted, or created meaningful strain in the entry."
            />
            <div className="stack-list">
              {analysis.stressors.length > 0 ? (
                analysis.stressors.map((item, index) => (
                  <div key={`${item.label}-${index}`} className="stack-item results-stack-item">
                    <div className="stack-item-copy">
                      <strong>{item.label}</strong>
                      <p className="stack-subcopy">{item.evidence}</p>
                    </div>
                    <span>
                      {item.category} · {item.intensity}/10
                    </span>
                  </div>
                ))
              ) : (
                <span className="muted-text">No clear burden or destabilizing strain stood out strongly enough to surface here.</span>
              )}
            </div>
          </article>

          <article className="detail-panel reveal-panel">
            <SectionTitle
              title="Supports"
              hint="What around you helped hold the moment."
            />
            <div className="stack-list">
              {analysis.supports.length > 0 ? (
                analysis.supports.map((item, index) => (
                  <div key={`${item.label}-${index}`} className="stack-item results-stack-item">
                    <div className="stack-item-copy">
                      <strong>{item.label}</strong>
                      <p className="stack-subcopy">{item.evidence}</p>
                    </div>
                    <span>
                      {item.category} · {item.impact}
                    </span>
                  </div>
                ))
              ) : (
                <span className="muted-text">No clear outside support or environmental stabilizer was strong enough to surface here.</span>
              )}
            </div>
          </article>

          <article className="detail-panel reveal-panel">
            <SectionTitle
              title="Coping actions"
              hint="What you intentionally did to move through the moment."
            />
            <div className="stack-list">
              {analysis.coping_actions.length > 0 ? (
                analysis.coping_actions.map((item, index) => (
                  <div key={`${item.action}-${index}`} className="stack-item results-stack-item">
                    <strong>{item.action}</strong>
                    <span>{item.impact}</span>
                  </div>
                ))
              ) : (
                <span className="muted-text">No clear intentional coping action was explicit enough to surface here.</span>
              )}
            </div>
          </article>

          {!isModerateConcern ? (
            <article className="detail-panel reveal-panel">
              <SectionTitle
                title="Restorative moments"
                hint="Internal moments of settling, clarity, or grounding."
              />
              <div className="tag-row results-tag-row">
                {analysis.restorative_signals.length > 0 ? (
                  analysis.restorative_signals.slice(0, 3).map((item) => (
                    <span key={item} className="tag">
                      {formatRestorativeMoment(item)}
                    </span>
                  ))
                ) : (
                  <span className="muted-text">No clear internal moment of settling or clarity was strong enough to surface here.</span>
                )}
              </div>
            </article>
          ) : null}

          {!isModerateConcern ? (
          <article className="detail-panel reveal-panel">
              <SectionTitle
                title="Notable language"
                hint="Emotionally meaningful wording from the entry itself, combining standout phrases and distinctive user language."
              />
              {notableLanguage.length > 0 ? (
                <ul className="phrase-list">
                  {notableLanguage.map((phrase) => (
                    <li key={phrase}>{phrase}</li>
                  ))}
                </ul>
              ) : (
                <span className="muted-text">No especially distinctive language stood out beyond the core analysis cards.</span>
              )}
            </article>
          ) : null}

          <article className="detail-panel reveal-panel">
            <SectionTitle
              title="Topics & themes"
              hint="The broader concepts and patterns this entry connects to, combining topics, themes, and reflection tags into one cleaner view."
            />
            <div className="tag-row">
              {topicsAndThemes.length > 0 ? (
                topicsAndThemes.map((item) => (
                  <FilterTag key={item} label={item} href={`${archiveBasePath}?q=${encodeURIComponent(item)}`} linkTags={linkTags} />
                ))
              ) : (
                <span className="muted-text">No broader topic or pattern stood out strongly enough beyond the main analysis cards.</span>
              )}
            </div>
          </article>

          {!isModerateConcern ? (
          <article className="detail-panel reveal-panel">
            <SectionTitle
              title="Personal keywords"
              hint="Personal anchors from the writing itself: meaningful names, places, objects, or recurring motifs worth noticing over time."
            />
            <div className="tag-row">
              {analysis.personal_keywords.length > 0 ? (
                analysis.personal_keywords.map((item) => (
                  <FilterTag key={item} label={item} href={`${archiveBasePath}?q=${encodeURIComponent(item)}`} linkTags={linkTags} />
                ))
              ) : (
                <span className="muted-text">No especially strong personal anchor stood out yet.</span>
              )}
            </div>
          </article>
          ) : null}

          {!isModerateConcern ? (
            <article className="detail-panel reveal-panel">
              <SectionTitle
                title="Evidence from the entry"
                hint="Lines that support why Atlas surfaced the interpretation."
              />
              <div className="stack-list">
                {analysis.evidence_spans.length > 0 ? (
                  analysis.evidence_spans.slice(0, 5).map((item, index) => (
                    <div key={`${item.label}-${index}`} className="stack-item results-stack-item">
                      <div className="stack-item-copy">
                        <strong>{item.label}</strong>
                        <p className="stack-subcopy">{item.text}</p>
                      </div>
                      <span>{item.type}</span>
                    </div>
                  ))
                ) : (
                  <span className="muted-text">Atlas Journal did not preserve any especially strong supporting evidence span for this entry.</span>
                )}
              </div>
            </article>
          ) : null}
        </div>
      )}
    </section>
  );
}


