"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { CheckInFields, type CheckInValues } from "@/components/CheckInFields";
import { ResultsCard } from "@/components/ResultsCard";
import type { JournalAnalysis } from "@/types/journal";

const DEMO_MAX_CHARS = 3000;
const MIN_ANALYSIS_EXPERIENCE_MS = 1800;

const demoAnalysisSteps = [
  "Reading emotional cues...",
  "Looking for stress and support signals...",
  "Identifying coping patterns...",
  "Mapping the emotional arc...",
  "Building your reflection..."
];

const starterIdeas = [
  {
    label: "Quiet ritual",
    text: "I made coffee and didn't rush it. The house was still, and that quiet stayed long enough for me to notice I felt a little more grounded."
  },
  {
    label: "Mixed day",
    text: "I had a great time with my friends at the mall, but when I got home my front door was open. I was scared for a minute, then realized I probably left it that way."
  },
  {
    label: "Watchful",
    text: "I asked a detective to follow my sister. I feel watchful and curious more than sad, like I'm waiting to understand what has really been happening."
  }
];

type DemoAnalyzeResponse =
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

export function DemoSandboxSurface({
  accountHref,
  accountLabel
}: {
  accountHref: string;
  accountLabel: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [rawText, setRawText] = useState("");
  const [checkIns, setCheckIns] = useState<CheckInValues>({
    mood: null,
    stress: null,
    energy: null
  });
  const [analysis, setAnalysis] = useState<JournalAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [resultVersion, setResultVersion] = useState(0);

  const trimmedText = rawText.trim();
  const characterCount = rawText.length;
  const remainingCharacters = DEMO_MAX_CHARS - characterCount;

  useEffect(() => {
    if (!isAnalyzing) {
      setActiveStep(0);
      return;
    }

    setActiveStep(0);
    const interval = window.setInterval(() => {
      setActiveStep((current) => Math.min(current + 1, demoAnalysisSteps.length - 1));
    }, 420);

    return () => window.clearInterval(interval);
  }, [isAnalyzing]);

  const entryStatusText = useMemo(() => {
    if (remainingCharacters < 0) {
      return `${Math.abs(remainingCharacters)} characters over the demo limit`;
    }

    return `${remainingCharacters} characters left`;
  }, [remainingCharacters]);

  function handleCheckInChange(key: keyof CheckInValues, value: number | null) {
    setCheckIns((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handleLoadStarter(text: string) {
    setRawText(text);
    setError(null);
    setAnalysis(null);
    textareaRef.current?.focus();
  }

  function handleReset() {
    setRawText("");
    setCheckIns({
      mood: null,
      stress: null,
      energy: null
    });
    setAnalysis(null);
    setError(null);
    setIsAnalyzing(false);
    setActiveStep(0);
    textareaRef.current?.focus();
  }

  async function handleAnalyze() {
    if (isAnalyzing) {
      return;
    }

    if (!trimmedText) {
      setError("Write a little something first so Atlas has a real moment to reflect back.");
      return;
    }

    if (characterCount > DEMO_MAX_CHARS) {
      setError("Demo entries are limited to 3,000 characters so the sandbox stays quick and private.");
      return;
    }

    if (trimmedText.length < 20) {
      setError("Write a little more so Atlas Journal has enough context to analyze.");
      return;
    }

    setError(null);
    setAnalysis(null);
    setIsAnalyzing(true);

    const startedAt = Date.now();

    try {
      const response = await fetch("/api/demo/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          raw_text: trimmedText,
          user_mood: checkIns.mood,
          user_stress: checkIns.stress,
          user_energy: checkIns.energy
        })
      });

      const payload = (await response.json()) as DemoAnalyzeResponse;
      const elapsed = Date.now() - startedAt;

      if (elapsed < MIN_ANALYSIS_EXPERIENCE_MS) {
        await new Promise((resolve) => window.setTimeout(resolve, MIN_ANALYSIS_EXPERIENCE_MS - elapsed));
      }

      if (!response.ok || payload.ok === false) {
        setError(payload.ok === false ? payload.details || payload.error : "The demo analysis request failed.");
        return;
      }

      setAnalysis(payload.analysis);
      setResultVersion((current) => current + 1);
    } catch (requestError) {
      const elapsed = Date.now() - startedAt;

      if (elapsed < MIN_ANALYSIS_EXPERIENCE_MS) {
        await new Promise((resolve) => window.setTimeout(resolve, MIN_ANALYSIS_EXPERIENCE_MS - elapsed));
      }

      setError(requestError instanceof Error ? requestError.message : "The demo analysis request failed.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="journal-grid demo-sandbox-layout">
      <section className="panel composer-panel demo-sandbox-panel demo-sandbox-main">
        <div className="section-head">
          <div>
            <p className="section-label">Guest sandbox</p>
            <h2>Try the real Atlas reflection flow without creating an account.</h2>
          </div>
          <div className="entry-stats">
            <span>{characterCount} characters</span>
            <span>Temporary only</span>
          </div>
        </div>

        <div className="demo-sandbox-message">
          <p className="demo-sandbox-message-title">Temporary sandbox</p>
          <p className="muted-text">
            This is a temporary sandbox. Demo entries are analyzed only to generate this reflection and are not saved.
          </p>
        </div>

        <div className="demo-sandbox-starters">
          <p className="section-label">Need a quick starting point?</p>
          <div className="tag-row">
            {starterIdeas.map((item) => (
              <button
                key={item.label}
                type="button"
                className="secondary-button demo-sandbox-starter"
                onClick={() => handleLoadStarter(item.text)}
                disabled={isAnalyzing}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <label className="field-label" htmlFor="demo-journal-entry">
          Demo journal entry
        </label>
        <textarea
          ref={textareaRef}
          id="demo-journal-entry"
          className="entry-input"
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
          placeholder="Write freely. Atlas will analyze this entry in real time, but nothing here will be saved."
        />
        <div className="demo-sandbox-meta">
          <p className={remainingCharacters < 0 ? "muted-text demo-sandbox-meta-warning" : "muted-text"}>{entryStatusText}</p>
          <p className="muted-text field-help">Refresh the page and this sandbox resets completely.</p>
        </div>

        <CheckInFields
          values={checkIns}
          onChange={handleCheckInChange}
          helperText="Optional check-ins help Atlas ground the reflection in your own numbers first. In demo mode they stay in memory only."
        />

        <div className="composer-footer demo-sandbox-actions">
          <button className="primary-button" type="button" onClick={handleAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? "Analyzing..." : "Analyze My Entry"}
          </button>
          <Link href="/demo/dashboard" className="secondary-button">
            Explore sample patterns
          </Link>
          <Link href="/demo/archive" className="secondary-button">
            Browse sample archive
          </Link>
        </div>

        {error ? <div className="error-box">{error}</div> : null}

        {isAnalyzing ? (
          <div className="demo-sandbox-progress reveal-panel">
            <div className="section-head compact-head">
              <div>
                <p className="section-label">Live analysis</p>
                <h3>Atlas is reading this entry now.</h3>
              </div>
              <div className="analysis-pulse" aria-live="polite">
                <span className="analysis-dot" />
                <span>{demoAnalysisSteps[activeStep]}</span>
              </div>
            </div>

            <div className="demo-sandbox-step-list" aria-live="polite">
              {demoAnalysisSteps.map((step, index) => (
                <div
                  key={step}
                  className={
                    index === activeStep
                      ? "demo-sandbox-step demo-sandbox-step-active"
                      : index < activeStep
                        ? "demo-sandbox-step demo-sandbox-step-complete"
                        : "demo-sandbox-step"
                  }
                >
                  <span className="demo-sandbox-step-dot" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="panel demo-sandbox-sidecar reveal-panel">
        <p className="section-label">Also in demo mode</p>
        <h2>See how Atlas looks across time with sample history.</h2>
        <p className="muted-text">
          The dashboard and archive still use seeded sample entries, so you can compare the live sandbox with Atlas&apos;s saved-entry views, pattern panels, and archive filters.
        </p>
        <div className="cta-row demo-sandbox-actions">
          <Link href="/demo/dashboard" className="secondary-button">
            Open sample dashboard
          </Link>
          <Link href="/demo/archive" className="secondary-button">
            Open sample archive
          </Link>
        </div>
      </section>

      {analysis ? (
        <>
          <div key={resultVersion} className="reveal-panel demo-sandbox-result-block">
            <ResultsCard analysis={analysis} archiveBasePath="/demo/archive" linkTags={false} />
          </div>

          <section className="panel demo-sandbox-cta-panel reveal-panel">
            <div className="section-head compact-head">
              <div>
                <p className="section-label">Next step</p>
                <h2>Your demo reflection is temporary.</h2>
              </div>
            </div>
            <div className="success-box demo-sandbox-result-note">
              This demo entry was not saved. Create an account to save entries and track patterns over time.
            </div>
            <div className="cta-row demo-sandbox-actions">
              <Link href={accountHref as any} className="primary-button">
                {accountLabel}
              </Link>
              <button type="button" className="secondary-button" onClick={handleReset}>
                Try another demo entry
              </button>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
