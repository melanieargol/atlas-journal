"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { CheckInFields, type CheckInValues } from "@/components/CheckInFields";

type AnalyzeResponse =
  | {
      ok: true;
      entryId: string;
    }
  | {
      ok: false;
      error: string;
      details?: string;
    };

const starterEntry = "";

export function JournalEntryForm() {
  const router = useRouter();
  const [rawText, setRawText] = useState(starterEntry);
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [checkIns, setCheckIns] = useState<CheckInValues>({
    mood: null,
    stress: null,
    energy: null
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const wordCount = useMemo(() => (rawText.trim() ? rawText.trim().split(/\s+/).length : 0), [rawText]);

  function handleCheckInChange(key: keyof CheckInValues, value: number | null) {
    setCheckIns((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handleSubmit() {
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          raw_text: rawText,
          entry_date: entryDate,
          user_mood: checkIns.mood,
          user_stress: checkIns.stress,
          user_energy: checkIns.energy
        })
      });

      const payload = (await response.json()) as AnalyzeResponse;

      if (!response.ok || payload.ok === false) {
        setError(payload.ok === false ? payload.details || payload.error : "The analysis request failed.");
        return;
      }

      router.push(`/archive/${payload.entryId}`);
      router.refresh();
    });
  }

  return (
    <div className="journal-grid">
      <section className="panel composer-panel">
        <div className="section-head">
          <div>
            <p className="section-label">Journal form</p>
            <h2>Write first, then let the patterns emerge.</h2>
          </div>
          <div className="entry-stats">
            <span>{wordCount} words</span>
            <span>Raw text preserved</span>
          </div>
        </div>

        <label className="field-label" htmlFor="journal-entry">
          Journal entry
        </label>
        <div className="date-field-row">
          <label className="field-label" htmlFor="entry-date">
            Entry date
          </label>
          <input
            id="entry-date"
            className="date-input"
            type="date"
            value={entryDate}
            onChange={(event) => setEntryDate(event.target.value)}
          />
          <p className="muted-text field-help">Use the date the experience happened.</p>
        </div>

        <textarea
          id="journal-entry"
          className="entry-input"
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
          placeholder="Write freely. Atlas Journal will keep the original entry and add structured insight alongside it."
        />

        <CheckInFields
          values={checkIns}
          onChange={handleCheckInChange}
          helperText="These stay optional. If you set them, Atlas Journal uses your check-ins in charts before falling back to AI estimates."
        />

        <div className="composer-footer">
          <button className="primary-button" type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving entry..." : "Analyze Entry"}
          </button>
          <p className="muted-text">
            After analysis finishes, Atlas Journal takes you straight into the saved entry view so you can review, edit, or revisit it later.
          </p>
        </div>

        {error ? <div className="error-box">{error}</div> : null}
      </section>
    </div>
  );
}
