"use client";

import { useMemo, useState, useTransition } from "react";

import { ResultsCard } from "@/components/ResultsCard";
import type { JournalAnalysis } from "@/types/journal";

type AnalyzeResponse =
  | {
      ok: true;
      analysis: JournalAnalysis;
      mode: "mock" | "openai";
    }
  | {
      ok: false;
      error: string;
      details?: string;
    };

const starterEntry =
  "";

export function JournalEntryForm() {
  const [rawText, setRawText] = useState(starterEntry);
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [analysis, setAnalysis] = useState<JournalAnalysis | null>(null);
  const [mode, setMode] = useState<"mock" | "openai">("mock");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const wordCount = useMemo(() => (rawText.trim() ? rawText.trim().split(/\s+/).length : 0), [rawText]);

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
          entry_date: entryDate
        })
      });

      const payload = (await response.json()) as AnalyzeResponse;

      if (!response.ok || payload.ok === false) {
        setAnalysis(null);
        setError(payload.ok === false ? payload.details || payload.error : "The analysis request failed.");
        return;
      }

      setAnalysis(payload.analysis);
      setMode(payload.mode);
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
          <p className="muted-text field-help">
            Use the date the experience happened if you are writing about something after the fact.
          </p>
        </div>
        <textarea
          id="journal-entry"
          className="entry-input"
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
          placeholder="Write freely. Atlas Journal will keep the original entry and add structured insight alongside it."
        />

        <div className="composer-footer">
          <button className="primary-button" type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Analyzing..." : "Analyze Entry"}
          </button>
          <p className="muted-text">The original entry stays intact while Atlas Journal adds structured insight alongside it.</p>
        </div>

        {error ? <div className="error-box">{error}</div> : null}
      </section>

      {analysis ? <ResultsCard analysis={analysis} mode={mode} /> : null}
    </div>
  );
}
