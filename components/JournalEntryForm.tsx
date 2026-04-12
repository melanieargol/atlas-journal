"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

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

const starterEntry =
  "";

function CheckInControl({
  id,
  label,
  description,
  scaleLabels,
  value,
  onChange
}: {
  id: string;
  label: string;
  description: string;
  scaleLabels: { min: string; mid: string; max: string };
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className="checkin-card">
      <div className="checkin-head">
        <label className="field-label" htmlFor={id}>
          {label}
        </label>
        <button className="ghost-button" type="button" onClick={() => onChange(null)}>
          Clear
        </button>
      </div>
      <p className="muted-text checkin-description">{description}</p>
      <div className="checkin-value">{value ?? "Not set"}</div>
      <input
        id={id}
        className="checkin-slider"
        type="range"
        min={1}
        max={10}
        step={1}
        value={value ?? 5}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
      />
      <div className="checkin-scale" aria-hidden="true">
        <span>{`1 - ${scaleLabels.min}`}</span>
        <span>{`5 - ${scaleLabels.mid}`}</span>
        <span>{`10 - ${scaleLabels.max}`}</span>
      </div>
    </div>
  );
}

export function JournalEntryForm() {
  const router = useRouter();
  const [rawText, setRawText] = useState(starterEntry);
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [userMood, setUserMood] = useState<number | null>(null);
  const [userStress, setUserStress] = useState<number | null>(null);
  const [userEnergy, setUserEnergy] = useState<number | null>(null);
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
          entry_date: entryDate,
          user_mood: userMood,
          user_stress: userStress,
          user_energy: userEnergy
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
          <p className="muted-text field-help">
            Use the date the experience happened.
          </p>
        </div>
        <textarea
          id="journal-entry"
          className="entry-input"
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
          placeholder="Write freely. Atlas Journal will keep the original entry and add structured insight alongside it."
        />

        <div className="checkin-section">
          <div className="section-head compact-head">
            <div>
              <p className="section-label">Optional check-ins</p>
              <h3>Anchor today’s trends with your own numbers.</h3>
            </div>
            <p className="muted-text">These are optional. Without them, Atlas Journal infers based off your entry for analysis.</p>
          </div>
          <div className="checkin-grid">
            <CheckInControl
              id="user-mood"
              label="Mood"
              description="How positive or negative the overall emotional tone felt."
              scaleLabels={{ min: "very negative", mid: "neutral", max: "very positive" }}
              value={userMood}
              onChange={setUserMood}
            />
            <CheckInControl
              id="user-stress"
              label="Stress"
              description="How activated, pressured, or overwhelmed your system felt."
              scaleLabels={{ min: "very relaxed", mid: "moderate stress", max: "panic-level stress" }}
              value={userStress}
              onChange={setUserStress}
            />
            <CheckInControl
              id="user-energy"
              label="Energy"
              description="How physically or mentally energized you felt overall."
              scaleLabels={{ min: "exhausted", mid: "moderate energy", max: "very energetic" }}
              value={userEnergy}
              onChange={setUserEnergy}
            />
          </div>
        </div>

        <div className="composer-footer">
          <button className="primary-button" type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving entry..." : "Analyze Entry"}
          </button>
          <p className="muted-text">Atlas Journal will analyze your entry.</p>
        </div>

        {error ? <div className="error-box">{error}</div> : null}
      </section>
    </div>
  );
}
