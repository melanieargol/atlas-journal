import type { Metadata } from "next";

import { AppFrame } from "@/components/AppFrame";
import { JournalEntryForm } from "@/components/JournalEntryForm";

export const metadata: Metadata = {
  title: "Atlas Journal | Journal"
};

export default function JournalPage() {
  return (
    <AppFrame
      title="Journal entry analysis"
      description="Write in your own language first. Atlas Journal keeps the raw entry intact, validates the analysis result with Zod, and saves both for later review."
    >
      <JournalEntryForm />
    </AppFrame>
  );
}
