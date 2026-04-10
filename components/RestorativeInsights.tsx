import type { RestorativeInsight } from "@/types/journal";

export function RestorativeInsights({ insights }: { insights: RestorativeInsight[] }) {
  return (
    <section className="panel insights-panel">
      <div className="section-head">
        <div>
          <p className="section-label">Restorative insights</p>
          <h2>What seems to help when things begin to shift</h2>
        </div>
      </div>

      <div className="insight-grid">
        {insights.map((insight) => (
          <article key={insight.title} className="insight-card">
            <h3>{insight.title}</h3>
            <p className="muted-text">{insight.description}</p>
            <ul className="signal-list">
              {insight.supportingSignals.map((signal) => (
                <li key={signal}>{signal}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
