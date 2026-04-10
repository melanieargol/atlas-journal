import type { JournalAnalysis } from "@/types/journal";

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
  return (
    <section className="panel results-panel reveal-group">
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
            <Stat label="Mood" value={`${analysis.mood_score}/10`} />
            <Stat label="Stress" value={`${analysis.stress_level}/10`} />
            <Stat label="Energy" value={`${analysis.energy_level}/10`} />
            <Stat label="Energy direction" value={analysis.energy_direction} />
          </div>
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
          <p className="section-label">Trigger Sources</p>
          <div className="stack-list">
            {analysis.triggers.map((item, index) => (
              <div key={`${item.type}-${index}`} className="stack-item">
                <strong>{item.type}</strong>
                <span>{item.description}</span>
              </div>
            ))}
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
          <p className="section-label">Themes and tags</p>
          <div className="tag-row">
            {[...analysis.themes, ...analysis.reflection_tags].map((item) => (
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
      </div>
    </section>
  );
}

