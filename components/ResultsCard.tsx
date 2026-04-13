import Link from "next/link";

import { SafetySupportCard } from "@/components/SafetySupportCard";
import type { JournalAnalysis } from "@/types/journal";

type ResultsCardProps = {
  analysis: JournalAnalysis;
  mode?: "mock" | "openai";
  archiveBasePath?: string;
};

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
      <p className="section-label">{title}</p>
      <span className="section-hint" title={hint} aria-label={hint}>
        i
      </span>
    </div>
  );
}

function FilterTag({
  label,
  href
}: {
  label: string;
  href: string;
}) {
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

export function ResultsCard({ analysis, archiveBasePath = "/archive" }: ResultsCardProps) {
  const displayMood = analysis.user_mood ?? analysis.mood_score;
  const displayStress = analysis.user_stress ?? analysis.stress_level;
  const displayEnergy = analysis.user_energy ?? analysis.energy_level;
  const mergedTags = Array.from(
    new Map(
      [...(analysis.themes ?? []), ...(analysis.reflection_tags ?? [])]
        .filter(Boolean)
        .map((item) => {
          const clean = item.trim();
          return [clean.toLowerCase(), clean];
        })
    ).values()
  );
  const safetyLevel = analysis.safety_assessment.level;
  const isHighConcern = safetyLevel === "high";
  const isModerateConcern = safetyLevel === "moderate";

  return (
    <section className="panel results-panel reveal-group">
      {isHighConcern ? <div className="safety-veil" aria-hidden="true" /> : null}
      <SafetySupportCard assessment={analysis.safety_assessment} />

      <div className="section-head">
        <div>
          <p className="section-label">Analysis result</p>
          <h2>Entry insights</h2>
        </div>
      </div>

      {isHighConcern ? (
        <div className="results-grid">
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
            <div className="chip-row">
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
            <div className="tag-row">
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
                  <div key={`${item.label}-${index}`} className="stack-item">
                    <div>
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
              hint="External or environmental stabilizers: people, places, routines, comforts, or experiences that helped."
            />
            <div className="stack-list">
              {analysis.supports.length > 0 ? (
                analysis.supports.map((item, index) => (
                  <div key={`${item.label}-${index}`} className="stack-item">
                    <div>
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
              hint="Intentional things the writer actively did to regulate, endure, orient, or move through the moment."
            />
            <div className="stack-list">
              {analysis.coping_actions.length > 0 ? (
                analysis.coping_actions.map((item, index) => (
                  <div key={`${item.action}-${index}`} className="stack-item">
                    <strong>{item.action}</strong>
                    <span>{item.impact}</span>
                  </div>
                ))
              ) : (
                <span className="muted-text">No clear intentional coping action was explicit enough to surface here.</span>
              )}
            </div>
          </article>

          <article className="detail-panel reveal-panel">
            <SectionTitle
              title="Entry topics"
              hint="Concepts that appear central in this entry itself. Recurring patterns across time appear separately in pattern context."
            />
            <div className="tag-row">
              {analysis.recurring_topics.length > 0 ? (
                analysis.recurring_topics.map((item) => (
                  <FilterTag key={item} label={item} href={`${archiveBasePath}?q=${encodeURIComponent(item)}`} />
                ))
              ) : (
                <span className="muted-text">This entry does not surface a strong concept-level topic beyond the broader themes below.</span>
              )}
            </div>
          </article>

          <article className="detail-panel reveal-panel">
            <SectionTitle
              title="Personal keywords"
              hint="Personal anchors from the writing itself: meaningful phrases, names, places, or motifs worth noticing over time."
            />
            <div className="tag-row">
              {analysis.personal_keywords.length > 0 ? (
                analysis.personal_keywords.map((item) => (
                  <FilterTag key={item} label={item} href={`${archiveBasePath}?q=${encodeURIComponent(item)}`} />
                ))
              ) : (
                <span className="muted-text">No especially strong personal anchor stood out yet.</span>
              )}
            </div>
          </article>

          {!isModerateConcern ? (
            <article className="detail-panel reveal-panel">
              <SectionTitle
                title="Restorative moments"
                hint="Internal moments where the tone seems to soften toward grounding, clarity, release, awareness, or steadiness."
              />
              <div className="tag-row">
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
                title="Evidence from the entry"
                hint="The strongest phrases that actually support the promoted interpretation, not just surface-level detections."
              />
              <div className="stack-list">
                {analysis.evidence_spans.length > 0 ? (
                  analysis.evidence_spans.slice(0, 5).map((item, index) => (
                    <div key={`${item.label}-${index}`} className="stack-item">
                      <div>
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

          <article className="detail-panel reveal-panel">
              <SectionTitle
                title="Themes and tags"
                hint="Current-entry concepts that help group this entry with related moments in the archive."
              />
              <div className="tag-row">
                {mergedTags.map((item) => (
                  <FilterTag key={item} label={item} href={`${archiveBasePath}?q=${encodeURIComponent(item)}`} />
                ))}
              </div>
            </article>

          {!isModerateConcern ? (
            <article className="detail-panel reveal-panel">
              <SectionTitle
                title="Notable phrases"
                hint="The line or lines that best capture the emotional core, symbolic center, or strongest insight of the entry."
              />
              <ul className="phrase-list">
                {analysis.notable_phrases.map((phrase) => (
                  <li key={phrase}>{phrase}</li>
                ))}
              </ul>
            </article>
          ) : null}

          <article className="detail-panel reveal-panel">
            <SectionTitle
              title="Custom emotion language"
              hint="Emotion wording preserved from the entry when it adds useful nuance beyond the headline emotion."
            />
            <div className="tag-row">
              {analysis.custom_emotion_terms.length > 0 ? (
                analysis.custom_emotion_terms.map((item) => (
                  <span key={item} className="tag">
                    {item}
                  </span>
                ))
              ) : (
                <span className="muted-text">No more specific emotion wording stood out beyond the main emotion tags.</span>
              )}
            </div>
          </article>
        </div>
      )}
    </section>
  );
}


