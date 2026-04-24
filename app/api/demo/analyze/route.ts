import { NextResponse } from "next/server";

import { analyzeJournalEntry } from "@/lib/analysis-service";
import { formatValidationError, validateDemoAnalyzeEntryInput } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    let input: ReturnType<typeof validateDemoAnalyzeEntryInput>;
    try {
      input = validateDemoAnalyzeEntryInput(body);
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: "Demo entry input is invalid.",
          details: formatValidationError(error)
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store"
          }
        }
      );
    }

    const result = await analyzeJournalEntry(input.raw_text, {
      mode: "demo",
      persist: false,
      checkIns: {
        user_mood: input.user_mood ?? null,
        user_stress: input.user_stress ?? null,
        user_energy: input.user_energy ?? null
      }
    });

    return NextResponse.json(
      {
        ok: true,
        analysis: result.analysis,
        mode: result.mode
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Atlas Journal could not analyze this demo entry.",
        details: error instanceof Error ? error.message : "Unknown analysis error."
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }
}
