import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppFrame } from "@/components/AppFrame";
import { ArchiveEntryDetail } from "@/components/ArchiveEntryDetail";
import { getDemoEntryById } from "@/lib/demo";

export const metadata: Metadata = {
  title: "Atlas Journal | Demo Entry Detail"
};

export default async function DemoArchiveEntryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = await getDemoEntryById(id);

  if (!entry) {
    notFound();
  }

  return (
    <AppFrame
      title="Entry detail preview"
      description="This read-only detail view shows the original journal writing alongside the structured analysis so the emotional insights stay grounded in real language."
      demoMode
      demoNote="sample data"
    >
      <ArchiveEntryDetail entry={entry} readOnly />
    </AppFrame>
  );
}

