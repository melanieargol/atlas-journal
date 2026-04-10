import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppFrame } from "@/components/AppFrame";
import { ArchiveEntryDetail } from "@/components/ArchiveEntryDetail";
import { getEntryById } from "@/lib/db";

export const metadata: Metadata = {
  title: "Atlas Journal | Entry Detail"
};

export default async function ArchiveEntryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = await getEntryById(id);

  if (!entry) {
    notFound();
  }

  return (
    <AppFrame
      title="Entry detail"
      description="A complete view of the saved entry, including the original journal text and the structured analysis generated from it."
    >
      <ArchiveEntryDetail entry={entry} />
    </AppFrame>
  );
}
