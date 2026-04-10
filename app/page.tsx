import Link from "next/link";
import type { Metadata } from "next";

import { AppFrame } from "@/components/AppFrame";
import { NudgePanel } from "@/components/NudgePanel";
import { getDemoDashboardData } from "@/lib/demo";

export const metadata: Metadata = {
  title: "Atlas Journal | Home"
};

export default async function HomePage() {
  const { entries, recurringEmotions, triggerSources, reminderSnapshot, restorativeInsights } = await getDemoDashboardData();
  const topRestorativeLabel = restorativeInsights[0] ? restorativeInsights[0].title.split(" ").slice(0, 2).join(" ") : "n/a";

  return (
    <AppFrame
      title="Raw journaling in. Structured insight out."
      description="Atlas Journal turns free-form journaling into patterns you can actually revisit: emotional movement, recurring triggers, restorative actions, and grounded trend signals over time."
    >
      <section className="overview-grid">
        <article className="panel intro-panel">
          <p className="section-label">Product preview</p>
          <h2>See the full story quickly, then sign in for your own private journal.</h2>
          <p className="muted-text">
            The demo starts with the dashboard so visitors can immediately see emotion trends, trigger sources, nudges, and restorative insights. From there, the archive and detail views make the underlying entries easy to explore.
          </p>
          <div className="cta-row">
            <Link href="/demo/dashboard" className="primary-button">
              Try Demo
            </Link>
            <Link href="/auth/sign-in" className="secondary-button">
              Sign In
            </Link>
          </div>
        </article>

        <article className="panel metric-panel">
          <p className="section-label">Demo dataset</p>
          <strong>{entries.length}</strong>
          <span className="muted-text">seeded sample entries and insights</span>
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

      <section className="overview-grid">
        <article className="panel intro-panel">
          <p className="section-label">Why the demo starts here</p>
          <h2>Recruiter-friendly by design</h2>
          <p className="muted-text">
            The strongest walkthrough is dashboard first, archive and search second, then entry detail. That path shows both the high-level pattern intelligence and the care taken with the underlying writing.
          </p>
          <div className="tag-row">
            <span className="tag">Dashboard first</span>
            <span className="tag">Archive + search</span>
            <span className="tag">Entry detail</span>
            <span className="tag">Read-only demo</span>
          </div>
        </article>

        <article className="panel metric-panel">
          <p className="section-label">Restorative insight</p>
          <strong>{topRestorativeLabel}</strong>
          <span className="muted-text">pattern surfaced from sample entries</span>
        </article>
      </section>

      <NudgePanel snapshot={reminderSnapshot} />
    </AppFrame>
  );
}
