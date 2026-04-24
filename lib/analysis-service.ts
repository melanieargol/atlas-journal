import { analyzeEntry } from "@/lib/ai";
import { saveEntry } from "@/lib/db";
import { validateAnalysis } from "@/lib/validators";

export type AnalysisMode = "demo" | "authenticated";

type AnalysisCheckIns = {
  user_mood?: number | null;
  user_stress?: number | null;
  user_energy?: number | null;
};

export type AnalyzeOptions = {
  mode: AnalysisMode;
  persist: boolean;
  entryDate?: string;
  checkIns?: AnalysisCheckIns;
};

function normalizeCheckIns(checkIns?: AnalysisCheckIns) {
  return {
    user_mood: checkIns?.user_mood ?? null,
    user_stress: checkIns?.user_stress ?? null,
    user_energy: checkIns?.user_energy ?? null
  };
}

export async function analyzeJournalEntry(rawText: string, options: AnalyzeOptions) {
  const normalizedCheckIns = normalizeCheckIns(options.checkIns);
  const result = await analyzeEntry(rawText, normalizedCheckIns);
  const analysis = validateAnalysis({
    ...result.analysis,
    raw_text: rawText,
    ...normalizedCheckIns
  });

  if (!options.persist) {
    return {
      analysis,
      mode: result.mode,
      entryId: null
    };
  }

  if (options.mode !== "authenticated") {
    throw new Error("Demo analysis cannot be persisted.");
  }

  if (!options.entryDate) {
    throw new Error("An entry date is required when persisting an analyzed entry.");
  }

  const savedEntry = await saveEntry(analysis, options.entryDate);

  return {
    analysis,
    mode: result.mode,
    entryId: savedEntry.id
  };
}
