import { NextResponse } from "next/server";

import { analyzeEntry } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { saveEntry } from "@/lib/db";
import {
  formatValidationError,
  validateAnalysis,
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

    let analysis: Awaited<ReturnType<typeof analyzeEntry>>["analysis"];
    let mode: Awaited<ReturnType<typeof analyzeEntry>>["mode"];

    try {
      const result = await analyzeEntry(input.raw_text);
      analysis = result.analysis;
      mode = result.mode;
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: "Atlas Journal could not generate analysis.",
          details: error instanceof Error ? error.message : "Unknown analysis error."
        },
        { status: 500 }
      );
    }

    let validated;
    try {
      validated = validateAnalysis({
        ...analysis,
        raw_text: input.raw_text,
        user_mood: input.user_mood ?? null,
        user_stress: input.user_stress ?? null,
        user_energy: input.user_energy ?? null
      });
    } catch (error) {
      console.error("validateAnalysis failed:", error);
      console.error("analysis payload:", analysis);

      return NextResponse.json(
        {
          ok: false,
          error: "Analysis schema validation failed.",
          details: formatValidationError(error)
        },
        { status: 400 }
      );
    }

    let savedEntry;
    try {
      savedEntry = await saveEntry(validated, entryDate);
    } catch (error) {
      console.error("saveEntry failed:", error);

      return NextResponse.json(
        {
          ok: false,
          error: "Analysis succeeded, but the entry could not be saved.",
          details: error instanceof Error ? error.message : "Unknown save error."
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      analysis: validated,
      mode,
      entryId: savedEntry.id
    });
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
