import { ZodError } from "zod";

import { analyzeEntryInputSchema, journalAnalysisSchema, journalRecordSchema, updateEntryInputSchema } from "@/lib/schema";

export function validateAnalyzeEntryInput(input: unknown) {
  return analyzeEntryInputSchema.parse(input);
}

export function validateUpdateEntryInput(input: unknown) {
  return updateEntryInputSchema.parse(input);
}

export function validateAnalysis(input: unknown) {
  return journalAnalysisSchema.parse(input);
}

export function validateRecord(input: unknown) {
  return journalRecordSchema.parse(input);
}

export function formatValidationError(error: unknown) {
  if (!(error instanceof ZodError)) {
    return "Validation failed.";
  }

  return error.issues
    .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
    .join("; ");
}
