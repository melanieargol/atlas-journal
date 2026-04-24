import { NextResponse } from "next/server";

import { analyzeJournalEntry } from "@/lib/analysis-service";
import { getCurrentUser } from "@/lib/auth";
import {
  formatValidationError,
  validateAnalyzeEntryInput
} from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json();

    let input: ReturnType<typeof validateAnalyzeEntryInput>;
    try {
      input = validateAnalyzeEntryInput(body);
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: "Journal entry input is invalid.",
          details: formatValidationError(error)
        },
        { status: 400 }
      );
    }

    const entryDate = input.entry_date ?? new Date().toISOString().slice(0, 10);

    try {
      const result = await analyzeJournalEntry(input.raw_text, {
        mode: "authenticated",
        persist: true,
        entryDate,
        checkIns: {
          user_mood: input.user_mood ?? null,
          user_stress: input.user_stress ?? null,
          user_energy: input.user_energy ?? null
        }
      });
      return NextResponse.json({
        ok: true,
        analysis: result.analysis,
        mode: result.mode,
        entryId: result.entryId
      });
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: "Atlas Journal could not analyze and save the entry.",
          details: error instanceof Error ? error.message : formatValidationError(error)
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unexpected server error.",
        details: error instanceof Error ? error.message : "Unknown error."
      },
      { status: 500 }
    );
  }
}
