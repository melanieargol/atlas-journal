import type { ReminderSnapshot } from "@/types/journal";

export function NudgePanel({ snapshot }: { snapshot: ReminderSnapshot }) {
  return (
    <section className="panel nudges-panel">
      <div className="section-head">
        <div>
          <p className="section-label">Smart nudges</p>
          <h2>Low-pressure signals based on your own rhythm</h2>
        </div>
      </div>

      <div className="nudge-meta-row">
        <div className="nudge-meta">
          <span className="section-label">Last entry</span>
          <strong>{snapshot.daysSinceLastEntry === null ? "No entries yet" : `${snapshot.daysSinceLastEntry} day${snapshot.daysSinceLastEntry === 1 ? "" : "s"} ago`}</strong>
        </div>
        <div className="nudge-meta">
          <span className="section-label">Last 7 days</span>
          <strong>{snapshot.entriesInLast7Days} entries</strong>
        </div>
      </div>

      <div className="nudge-grid">
        {snapshot.nudges.map((nudge) => (
          <article key={nudge.id} className="nudge-card">
            <p className="section-label">{nudge.label}</p>
            <p className="muted-text">{nudge.message}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
