import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { analyzeEntry } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth";
import { deleteEntry, getEntryById, updateEntry } from "@/lib/db";
import { formatValidationError, validateAnalysis, validateUpdateEntryInput } from "@/lib/validators";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
    }

    const { id } = await params;
    const existing = await getEntryById(id);

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Entry not found." }, { status: 404 });
    }

    const body = await request.json();
    const input = validateUpdateEntryInput(body);
    const hasUserMood = Object.prototype.hasOwnProperty.call(input, "user_mood");
    const hasUserStress = Object.prototype.hasOwnProperty.call(input, "user_stress");
    const hasUserEnergy = Object.prototype.hasOwnProperty.call(input, "user_energy");

    const mergedCheckIns = {
      user_mood: hasUserMood ? input.user_mood ?? null : existing.analysis.user_mood ?? null,
      user_stress: hasUserStress ? input.user_stress ?? null : existing.analysis.user_stress ?? null,
      user_energy: hasUserEnergy ? input.user_energy ?? null : existing.analysis.user_energy ?? null
    };

    const nextAnalysis = input.reanalyze
      ? validateAnalysis({
          ...(await analyzeEntry(input.raw_text)).analysis,
          raw_text: input.raw_text,
          ...mergedCheckIns
        })
      : validateAnalysis({
          ...existing.analysis,
          raw_text: input.raw_text,
          ...mergedCheckIns
        });

    const updated = await updateEntry(id, {
      entry_date: input.entry_date,
      analysis: nextAnalysis
    });

    if (!updated) {
      return NextResponse.json({ ok: false, error: "Entry not found." }, { status: 404 });
    }

    revalidatePath("/archive");
    revalidatePath(`/archive/${id}`);
    revalidatePath("/dashboard");

    return NextResponse.json({
      ok: true,
      entry: updated,
      analysisMode: input.reanalyze ? "reanalyzed" : "saved"
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "Atlas Journal could not update the entry.",
        details: formatValidationError(error)
      },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await deleteEntry(id);

  if (!deleted) {
    return NextResponse.json({ ok: false, error: "Entry not found." }, { status: 404 });
  }

  revalidatePath("/archive");
  revalidatePath(`/archive/${id}`);
  revalidatePath("/dashboard");

  return NextResponse.json({ ok: true });
}
