import Link from "next/link";

import type { JournalRecord } from "@/types/journal";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(new Date(`${date}T00:00:00`));
}

export function DemoRecentEntries({ entries }: { entries: JournalRecord[] }) {
  return (
    <section className="panel recent-entries-panel reveal-stagger">
      <div className="section-head">
        <div>
          <p className="section-label">Recent entries</p>
          <h2>Open a real entry to see how the analysis holds together</h2>
        </div>
      </div>

      <div className="recent-entry-list">
        {entries.map((entry, index) => (
          <Link
            key={entry.id}
            href={`/demo/archive/${entry.id}`}
            className="recent-entry-card"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div className="recent-entry-topline">
              <span className="section-label">{formatDate(entry.entry_date)}</span>
              <span className="archive-energy">{entry.analysis.energy_direction}</span>
            </div>
            <h3>{entry.analysis.summary}</h3>
            <p className="muted-text">{entry.analysis.raw_text.slice(0, 132).trim()}...</p>
            <div className="tag-row">
              <span className="tag">{entry.analysis.primary_emotion}</span>
              {entry.analysis.themes.slice(0, 2).map((theme) => (
                <span key={theme} className="tag">
                  {theme}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
