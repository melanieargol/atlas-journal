import Link from "next/link";
import type { Metadata } from "next";

import { AppFrame } from "@/components/AppFrame";
import { NudgePanel } from "@/components/NudgePanel";
import { getDashboardData } from "@/lib/db";

export const metadata: Metadata = {
  title: "Atlas Journal | Home"
};

export default async function HomePage() {
  const { entries, recurringEmotions, triggerSources, reminderSnapshot } = await getDashboardData();

  return (
    <AppFrame
      title="Raw journaling in. Structured insight out."
      description="Atlas Journal is a focused MVP for emotional pattern analysis. It stores the original entry, validates the extracted insight, and shows the trends that start to matter over time."
    >
      <section className="overview-grid">
        <article className="panel intro-panel">
          <p className="section-label">MVP overview</p>
          <h2>Designed for clarity, not clutter.</h2>
          <p className="muted-text">
            Start in the journal workspace, analyze an entry, then move into the dashboard to see emotion trends, trigger sources, and energy patterns across saved entries.
          </p>
          <div className="cta-row">
            <Link href="/journal" className="primary-button">
              Open journal
            </Link>
            <Link href="/dashboard" className="secondary-button">
              View dashboard
            </Link>
          </div>
        </article>

        <article className="panel metric-panel">
          <p className="section-label">Entries</p>
          <strong>{entries.length}</strong>
          <span className="muted-text">seeded for local testing</span>
        </article>

        <article className="panel metric-panel">
          <p className="section-label">Top emotion</p>
          <strong>{recurringEmotions[0]?.emotion ?? "n/a"}</strong>
          <span className="muted-text">{recurringEmotions[0]?.count ?? 0} occurrences</span>
        </article>

        <article className="panel metric-panel">
          <p className="section-label">Top trigger</p>
          <strong>{triggerSources[0]?.label ?? "n/a"}</strong>
          <span className="muted-text">{triggerSources[0]?.count ?? 0} occurrences</span>
        </article>
      </section>

      <NudgePanel snapshot={reminderSnapshot} />
    </AppFrame>
  );
}
