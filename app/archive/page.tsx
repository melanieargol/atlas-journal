import type { Metadata } from "next";

import { AppFrame } from "@/components/AppFrame";
import { ArchiveEntryList } from "@/components/ArchiveEntryList";
import { requireUser } from "@/lib/auth";
import { getArchiveEntries } from "@/lib/db";

export const metadata: Metadata = {
  title: "Atlas Journal | Archive"
};

export default async function ArchivePage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; theme?: string; emotion?: string }>;
}) {
  await requireUser();
  const entries = await getArchiveEntries();
  const params = searchParams ? await searchParams : undefined;
  const initialSearch = params?.q ?? "";
  const initialTheme = params?.theme ?? "all";
  const initialEmotion = params?.emotion ?? "all";

  return (
    <AppFrame
      title="Journal archive"
      description="Review saved entries in one place. Each entry keeps the original writing and the structured analysis together so longer-term patterns stay connected to lived context."
    >
      <section className="overview-grid">
        <article className="panel intro-panel">
          <p className="section-label">Archive overview</p>
          <h2>A more complete record of your entries</h2>
          <p className="muted-text">
            Search across saved entries, filter by emotion or theme, browse grouped date clusters, and open any entry for the full raw text and analysis.
          </p>
        </article>

        <article className="panel metric-panel">
          <p className="section-label">Saved entries</p>
          <strong>{entries.length}</strong>
          <span className="muted-text">available in the archive</span>
        </article>
      </section>

      <ArchiveEntryList entries={entries} initialSearch={initialSearch} initialTheme={initialTheme} initialEmotion={initialEmotion} />
    </AppFrame>
  );
}
