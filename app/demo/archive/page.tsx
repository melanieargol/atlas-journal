import type { Metadata } from "next";

import { AppFrame } from "@/components/AppFrame";
import { ArchiveEntryList } from "@/components/ArchiveEntryList";
import { getDemoArchiveEntries } from "@/lib/demo";

export const metadata: Metadata = {
  title: "Atlas Journal | Demo Archive"
};

export default async function DemoArchivePage() {
  const entries = await getDemoArchiveEntries();

  return (
    <AppFrame
      title="Archive preview"
      description="Explore the seeded archive exactly the way a recruiter or product reviewer would: search across summaries, themes, and emotions, then open any entry for the full context."
      demoMode
      demoNote="sample data"
    >
      <section className="overview-grid">
        <article className="panel intro-panel">
          <p className="section-label">Searchable archive</p>
          <h2>Review the writing behind the patterns</h2>
          <p className="muted-text">
            Demo mode keeps the experience clear and read-only. You can search, filter, and open entries without any risk of changing stored account data.
          </p>
        </article>

        <article className="panel metric-panel">
          <p className="section-label">Saved demo entries</p>
          <strong>{entries.length}</strong>
          <span className="muted-text">available in the showcase archive</span>
        </article>
      </section>

      <ArchiveEntryList entries={entries} basePath="/demo/archive" />
    </AppFrame>
  );
}

