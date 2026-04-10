"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const journalLine = "Today felt tense at first, but writing helped me slow down and see the day more clearly.";
const analysisSteps = [
  "Analyzing your entry...",
  "Detecting emotional patterns...",
  "Identifying shifts...",
  "Generating insight..."
];

const DEMO_INTRO_KEY = "atlas-journal-demo-intro-played";
const TYPING_DURATION_MS = 1100;
const TOTAL_DURATION_MS = 2800;

export default function DemoPage() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [visibleChars, setVisibleChars] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [revealedShift, setRevealedShift] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hasPlayed = window.sessionStorage.getItem(DEMO_INTRO_KEY) === "true";

    if (hasPlayed) {
      router.replace("/demo/dashboard");
      return;
    }

    setIsReady(true);
  }, [router]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const typingInterval = window.setInterval(() => {
      setVisibleChars((current) => {
        if (current >= journalLine.length) {
          window.clearInterval(typingInterval);
          return current;
        }

        return current + 2;
      });
    }, Math.max(24, Math.floor(TYPING_DURATION_MS / journalLine.length)));

    const analysisInterval = window.setInterval(() => {
      setActiveStep((current) => {
        if (current >= analysisSteps.length - 1) {
          window.clearInterval(analysisInterval);
          return current;
        }

        return current + 1;
      });
    }, 360);

    const shiftTimeout = window.setTimeout(() => setRevealedShift(true), 1900);
    const redirectTimeout = window.setTimeout(() => {
      window.sessionStorage.setItem(DEMO_INTRO_KEY, "true");
      router.replace("/demo/dashboard");
    }, TOTAL_DURATION_MS);

    return () => {
      window.clearInterval(typingInterval);
      window.clearInterval(analysisInterval);
      window.clearTimeout(shiftTimeout);
      window.clearTimeout(redirectTimeout);
    };
  }, [isReady, router]);

  const typedText = useMemo(() => journalLine.slice(0, visibleChars), [visibleChars]);

  function skipIntro() {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(DEMO_INTRO_KEY, "true");
    }

    router.replace("/demo/dashboard");
  }

  if (!isReady) {
    return null;
  }

  return (
    <main
      className="demo-intro-shell"
      onClick={skipIntro}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          skipIntro();
        }
      }}
    >
      <div className="demo-intro-backdrop demo-intro-backdrop-left" />
      <div className="demo-intro-backdrop demo-intro-backdrop-right" />

      <div className="demo-intro-stage">
        <button
          type="button"
          className="demo-intro-skip"
          onClick={(event) => {
            event.stopPropagation();
            skipIntro();
          }}
        >
          Skip
        </button>

        <div className="demo-intro-copy">
          <p className="eyebrow">Demo intro</p>
          <h1>Welcome to Atlas Journal</h1>
          <p className="hero-copy">Watch how a single entry becomes insight</p>
        </div>

        <section className="demo-intro-panel demo-intro-entry">
          <p className="section-label">Journal entry</p>
          <p className="demo-intro-typed">
            {typedText}
            <span className="demo-intro-caret" aria-hidden="true" />
          </p>
        </section>

        <section className="demo-intro-panel demo-intro-analysis">
          <p className="section-label">Analysis</p>
          <div className="demo-intro-step-list">
            {analysisSteps.map((step, index) => (
              <div
                key={step}
                className={
                  index === activeStep
                    ? "demo-intro-step demo-intro-step-active"
                    : index < activeStep
                      ? "demo-intro-step demo-intro-step-complete"
                      : "demo-intro-step"
                }
              >
                <span className="demo-intro-step-dot" />
                <span>{step}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={revealedShift ? "demo-intro-shift demo-intro-shift-visible" : "demo-intro-shift"}>
          <span>Tense</span>
          <span className="demo-intro-shift-arrow">{"->"}</span>
          <span>Reflective</span>
        </section>
      </div>
    </main>
  );
}
