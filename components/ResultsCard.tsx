import type { JournalAnalysis } from "@/types/journal";
import { SafetySupportCard } from "@/components/SafetySupportCard";

type ResultsCardProps = {
  analysis: JournalAnalysis;
  mode?: "mock" | "openai";
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-chip">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function ResultsCard({ analysis }: ResultsCardProps) {
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
  return (
    <section className="panel results-panel reveal-group">
      <SafetySupportCard assessment={analysis.safety_assessment} />

      <div className="section-head">
        <div>
          <p className="section-label">Analysis result</p>
          <h2>Entry insights</h2>
        </div>
      </div>

      <div className="results-grid">
        <article className="detail-panel detail-panel-strong reveal-panel">
          <p className="section-label">Raw entry</p>
          <p className="raw-entry">{analysis.raw_text}</p>
        </article>

        <article className="detail-panel reveal-panel">
          <p className="section-label">Summary</p>
          <p>{analysis.summary}</p>
          <div className="chip-row">
            <Stat label="Primary emotion" value={analysis.primary_emotion} />
            <Stat label={analysis.user_mood !== null ? "Mood check-in" : "Mood"} value={`${displayMood}/10`} />
            <Stat label={analysis.user_stress !== null ? "Stress check-in" : "Stress"} value={`${displayStress}/10`} />
            <Stat label={analysis.user_energy !== null ? "Energy check-in" : "Energy"} value={`${displayEnergy}/10`} />
            <Stat label="Energy direction" value={analysis.energy_direction} />
          </div>
          {analysis.user_mood !== null || analysis.user_stress !== null || analysis.user_energy !== null ? (
            <p className="muted-text">Your check-ins are shown directly and will take priority in trend views for this entry.</p>
          ) : null}
        </article>

        <article className="detail-panel emotional-shift-panel reveal-panel">
          <p className="section-label">Emotional transformation</p>
          <div className="shift-journey">
            <div className="shift-state">
              <span className="section-label">Before</span>
              <strong>{analysis.emotional_shift.start_state}</strong>
            </div>
            <div className="shift-arrow" aria-hidden="true">{"->"}</div>
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
          <p className="section-label">Stressors</p>
          <div className="stack-list">
            {analysis.stressors.length > 0 ? (
              analysis.stressors.map((item, index) => (
                <div key={`${item.label}-${index}`} className="stack-item">
                  <div>
                    <strong>{item.label}</strong>
                    <p className="stack-subcopy">{item.evidence}</p>
                  </div>
                  <span>
                    {item.category} - {item.intensity}/10
                  </span>
                </div>
              ))
            ) : (
              analysis.triggers.map((item, index) => (
                <div key={`${item.type}-${index}`} className="stack-item">
                  <strong>{item.type}</strong>
                  <span>{item.description}</span>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="detail-panel reveal-panel">
          <p className="section-label">Supports</p>
          <div className="stack-list">
            {analysis.supports.length > 0 ? (
              analysis.supports.map((item, index) => (
                <div key={`${item.label}-${index}`} className="stack-item">
                  <div>
                    <strong>{item.label}</strong>
                    <p className="stack-subcopy">{item.evidence}</p>
                  </div>
                  <span>
                    {item.category} - {item.impact}
                  </span>
                </div>
              ))
            ) : (
              <span className="muted-text">No clear support or grounding moment was detected in this entry.</span>
            )}
          </div>
        </article>

        <article className="detail-panel reveal-panel">
          <p className="section-label">Coping actions</p>
          <div className="stack-list">
            {analysis.coping_actions.length > 0 ? (
              analysis.coping_actions.map((item, index) => (
                <div key={`${item.action}-${index}`} className="stack-item">
                  <strong>{item.action}</strong>
                  <span>{item.impact}</span>
                </div>
              ))
            ) : (
              <span className="muted-text">No explicit coping action detected in the entry.</span>
            )}
          </div>
        </article>

        <article className="detail-panel reveal-panel">
          <p className="section-label">Recurring topics</p>
          <div className="tag-row">
            {analysis.recurring_topics.length > 0 ? (
              analysis.recurring_topics.map((item) => (
                <span key={item} className="tag">
                  {item}
                </span>
              ))
            ) : (
              <span className="muted-text">No repeated topic surfaced from this entry alone.</span>
            )}
          </div>
        </article>

        <article className="detail-panel reveal-panel">
          <p className="section-label">Personal keywords</p>
          <div className="tag-row">
            {analysis.personal_keywords.length > 0 ? (
              analysis.personal_keywords.map((item) => (
                <span key={item} className="tag">
                  {item}
                </span>
              ))
            ) : (
              <span className="muted-text">No strong personal keyword stood out yet.</span>
            )}
          </div>
        </article>

        <article className="detail-panel reveal-panel">
          <p className="section-label">Restorative signals</p>
          <div className="tag-row">
            {analysis.restorative_signals.length > 0 ? (
              analysis.restorative_signals.map((item) => (
                <span key={item} className="tag">
                  {item}
                </span>
              ))
            ) : (
              <span className="muted-text">No restorative signal was explicit in this entry.</span>
            )}
          </div>
        </article>

        <article className="detail-panel reveal-panel">
          <p className="section-label">Evidence from the entry</p>
          <div className="stack-list">
            {analysis.evidence_spans.length > 0 ? (
              analysis.evidence_spans.map((item, index) => (
                <div key={`${item.label}-${index}`} className="stack-item">
                  <div>
                    <strong>{item.label}</strong>
                    <p className="stack-subcopy">{item.text}</p>
                  </div>
                  <span>{item.type}</span>
                </div>
              ))
            ) : (
              <span className="muted-text">Atlas Journal did not preserve any specific evidence span for this entry.</span>
            )}
          </div>
        </article>

        <article className="detail-panel reveal-panel">
          <p className="section-label">Themes and tags</p>
          <div className="tag-row">
            {mergedTags.map((item) => (
              <span key={item} className="tag">
                {item}
              </span>
            ))}
          </div>
        </article>

        <article className="detail-panel reveal-panel">
          <p className="section-label">Notable phrases</p>
          <ul className="phrase-list">
            {analysis.notable_phrases.map((phrase) => (
              <li key={phrase}>{phrase}</li>
            ))}
          </ul>
        </article>

        <article className="detail-panel reveal-panel">
          <p className="section-label">Custom emotion language</p>
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
    </section>
  );
}


