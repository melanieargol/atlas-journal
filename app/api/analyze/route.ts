import { NextResponse } from "next/server";

import { analyzeEntry } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { saveEntry } from "@/lib/db";
import { formatValidationError, validateAnalysis, validateAnalyzeEntryInput } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json();
    const input = validateAnalyzeEntryInput(body);
    const entryDate = input.entry_date ?? new Date().toISOString().slice(0, 10);

    const { analysis, mode } = await analyzeEntry(input.raw_text);
    const validated = validateAnalysis({
      ...analysis,
      raw_text: input.raw_text
    });

    await saveEntry(validated, entryDate);

    return NextResponse.json({
      ok: true,
      analysis: validated,
      mode
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Atlas Journal could not validate the analysis payload.",
        details: formatValidationError(error)
      },
      { status: 400 }
    );
  }
}
