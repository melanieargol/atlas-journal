import type { Metadata } from "next";

import { AppFrame } from "@/components/AppFrame";
import { JournalEntryForm } from "@/components/JournalEntryForm";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Atlas Journal | Journal"
};

export default async function JournalPage() {
  await requireUser();

  return (
    <AppFrame
      title="Journal entry analysis"
      description="Write in your own language first. Atlas Journal keeps the raw entry intact, validates the analysis result with Zod, and saves both for later review."
    >
      <JournalEntryForm />
    </AppFrame>
  );
}
