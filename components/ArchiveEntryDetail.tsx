"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ResultsCard } from "@/components/ResultsCard";
import type { JournalRecord } from "@/types/journal";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${date}T00:00:00`));
}

export function ArchiveEntryDetail({ entry, readOnly = false }: { entry: JournalRecord; readOnly?: boolean }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [rawText, setRawText] = useState(entry.analysis.raw_text);
  const [entryDate, setEntryDate] = useState(entry.entry_date);
  const [currentEntry, setCurrentEntry] = useState(entry);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetDraft() {
    setRawText(currentEntry.analysis.raw_text);
    setEntryDate(currentEntry.entry_date);
    setError(null);
    setStatus(null);
  }

  function handleSave(reanalyze: boolean) {
    if (readOnly) {
      return;
    }

    setError(null);
    setStatus(null);

    startTransition(async () => {
      const response = await fetch(`/api/entries/${currentEntry.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          raw_text: rawText,
          entry_date: entryDate,
          reanalyze
        })
      });

      const payload = (await response.json()) as
        | { ok: true; entry: JournalRecord; analysisMode: "saved" | "reanalyzed" }
        | { ok: false; error: string; details?: string };

      if (!response.ok || payload.ok === false) {
        setError(payload.ok === false ? payload.details || payload.error : "The entry could not be updated.");
        return;
      }

      setCurrentEntry(payload.entry);
      setRawText(payload.entry.analysis.raw_text);
      setEntryDate(payload.entry.entry_date);
      setIsEditing(false);
      setStatus(
        reanalyze
          ? "Entry saved and analysis re-ran to stay in sync."
          : "Entry saved. Structured analysis was kept as-is."
      );
      router.refresh();
    });
  }

  function handleDelete() {
    if (readOnly) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/entries/${currentEntry.id}`, {
        method: "DELETE"
      });

      const payload = (await response.json()) as { ok: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        setError(payload.error || "The entry could not be deleted.");
        return;
      }

      router.push("/archive");
      router.refresh();
    });
  }

  return (
    <div className="archive-detail-layout">
      <section className="panel entry-summary-panel">
        <div className="section-head">
          <div>
            <p className="section-label">Archive detail</p>
            <h2>{formatDate(currentEntry.entry_date)}</h2>
          </div>
          <div className="entry-stats">
            <span>{currentEntry.analysis.primary_emotion}</span>
            <span>{currentEntry.analysis.energy_direction}</span>
          </div>
        </div>
        <p className="muted-text">
          This view keeps the full raw entry alongside the structured analysis so patterns can be revisited with more context. The experience date can differ from when the note was actually written.
        </p>
        <div className="entry-meta-stack">
          <p className="muted-text">Entry date: {formatDate(currentEntry.entry_date)}</p>
          <p className="muted-text">Written at: {new Date(currentEntry.created_at).toLocaleString()}</p>
        </div>

        {readOnly ? (
          <div className="entry-management-row">
            <button className="secondary-button button-disabled" type="button" disabled>
              Edit entry
            </button>
            <button className="danger-button button-disabled" type="button" disabled>
              Delete entry
            </button>
            <p className="muted-text demo-action-note">
              Demo mode is view-only. You can explore the entry, search the archive, and review insights here. Sign in to save, edit, or delete entries in a private account.
            </p>
          </div>
        ) : (
          <div className="entry-management-row">
            <button className="secondary-button" type="button" onClick={() => {
              setIsEditing((value) => !value);
              setIsConfirmingDelete(false);
              resetDraft();
            }}>
              {isEditing ? "Close editor" : "Edit entry"}
            </button>
            {!isConfirmingDelete ? (
              <button className="danger-button" type="button" onClick={() => setIsConfirmingDelete(true)}>
                Delete entry
              </button>
            ) : (
              <div className="confirm-delete-row">
                <span className="muted-text">Delete permanently?</span>
                <button className="danger-button" type="button" onClick={handleDelete} disabled={isPending}>
                  Confirm delete
                </button>
                <button className="secondary-button" type="button" onClick={() => setIsConfirmingDelete(false)}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
        {status ? <div className="success-box">{status}</div> : null}
        {error ? <div className="error-box">{error}</div> : null}
      </section>

      {isEditing && !readOnly ? (
        <section className="panel entry-editor-panel">
          <div className="section-head">
            <div>
              <p className="section-label">Edit entry</p>
              <h2>Update the text or experience date</h2>
            </div>
          </div>
          <label className="field-label" htmlFor="detail-entry-date">
            Entry date
          </label>
          <input
            id="detail-entry-date"
            className="date-input"
            type="date"
            value={entryDate}
            onChange={(event) => setEntryDate(event.target.value)}
          />
          <p className="muted-text field-help">
            This can reflect when the experience happened, even if you wrote about it later.
          </p>

          <label className="field-label" htmlFor="detail-raw-text">
            Raw journal text
          </label>
          <textarea
            id="detail-raw-text"
            className="entry-input"
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
          />

          <div className="entry-management-row">
            <button className="secondary-button" type="button" onClick={() => handleSave(false)} disabled={isPending}>
              Save text only
            </button>
            <button className="primary-button" type="button" onClick={() => handleSave(true)} disabled={isPending}>
              Save and re-run analysis
            </button>
          </div>
          <p className="muted-text field-help">
            If you change the text substantially, re-running analysis keeps the structured insights aligned with the edited entry.
          </p>
        </section>
      ) : null}

      <ResultsCard analysis={currentEntry.analysis} />
    </div>
  );
}
