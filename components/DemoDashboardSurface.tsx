"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";

import { AnimatedCount } from "@/components/AnimatedCount";
import { EmotionTrendsChart } from "@/components/EmotionTrendsChart";
import { EnergyPatternsChart } from "@/components/EnergyPatternsChart";
import { NudgePanel } from "@/components/NudgePanel";
import { RestorativeInsights } from "@/components/RestorativeInsights";
import { TriggerSourcesChart } from "@/components/TriggerSourcesChart";
import { buildDemoDashboardData, getEmotionColor } from "@/lib/demo";
import type { JournalRecord, TimeRange } from "@/types/journal";

const rangeOptions: { value: TimeRange; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" }
];

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(new Date(`${date}T00:00:00`));
}

function getDotSize(entry: JournalRecord) {
  return 24 + entry.analysis.stress_level * 3;
}

export function DemoDashboardSurface({ allEntries, initialRange }: { allEntries: JournalRecord[]; initialRange: TimeRange }) {
  const [range, setRange] = useState<TimeRange>(initialRange);
  const [selectedId, setSelectedId] = useState<string | null>(allEntries[0]?.id ?? null);
  const [showPulse, setShowPulse] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!showPulse) {
      return;
    }

    const timeout = window.setTimeout(() => setShowPulse(false), 420);
    return () => window.clearTimeout(timeout);
  }, [showPulse]);

  const dashboard = useMemo(() => buildDemoDashboardData(allEntries, range), [allEntries, range]);

  useEffect(() => {
    if (!dashboard.entries.some((entry) => entry.id === selectedId)) {
      setSelectedId(dashboard.entries[0]?.id ?? null);
    }
  }, [dashboard.entries, selectedId]);

  const selectedEntry = dashboard.entries.find((entry) => entry.id === selectedId) ?? dashboard.entries[0] ?? null;

  function handleRangeChange(nextRange: TimeRange) {
    if (nextRange === range) {
      return;
    }

    startTransition(() => {
      setShowPulse(true);
      setRange(nextRange);
    });
  }

  return (
    <>
      <section className="overview-grid">
        <article className="panel intro-panel reveal-panel">
          <p className="section-label">Try this</p>
          <h2>Click an entry in the timeline, then open the detail view to see the full emotional arc.</h2>
          <p className="muted-text">
            The dashboard, archive, filters, and entry views all run locally from seeded sample data, so the demo stays fast, responsive, and impossible to break.
          </p>
          <div className="cta-row">
            <a href="#emotional-journey" className="secondary-button">
              Jump to timeline
            </a>
            <Link href="/demo/archive" className="secondary-button">
              Explore archive search
            </Link>
          </div>
        </article>

        <article className="panel metric-panel reveal-panel">
          <p className="section-label">Entries in range</p>
          <strong><AnimatedCount value={dashboard.entries.length} /></strong>
          <span className="muted-text">{range === "all" ? "all demo entries" : `from ${dashboard.allEntriesCount} demo entries`}</span>
        </article>

        <article className="panel metric-panel reveal-panel">
          <p className="section-label">Most common emotion</p>
          <strong>{dashboard.recurringEmotions[0]?.emotion ?? "n/a"}</strong>
          <span className="muted-text"><AnimatedCount value={dashboard.recurringEmotions[0]?.count ?? 0} suffix=" times" /></span>
        </article>

        <article className="panel metric-panel reveal-panel">
          <p className="section-label">Most common trigger</p>
          <strong>{dashboard.triggerSources[0]?.label ?? "n/a"}</strong>
          <span className="muted-text"><AnimatedCount value={dashboard.triggerSources[0]?.count ?? 0} suffix=" times" /></span>
        </article>
      </section>

      <section className="panel filter-panel reveal-panel">
        <div className="section-head compact-head">
          <div>
            <p className="section-label">Time range</p>
            <h2>Filter the trend window instantly</h2>
          </div>
          <div className="analysis-pulse-wrap">
            {showPulse || isPending ? (
              <div className="analysis-pulse">
                <span className="analysis-dot" />
                <span>Refreshing analysis</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="filter-row">
          {rangeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={option.value === range ? "filter-chip filter-chip-active filter-chip-button" : "filter-chip filter-chip-button"}
              onClick={() => handleRangeChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section id="emotional-journey" className="panel timeline-panel reveal-panel">
        <div className="section-head">
          <div>
            <p className="section-label">Emotional journey timeline</p>
            <h2>See the pattern at a glance, then open any entry</h2>
          </div>
        </div>

        <div className="timeline-track">
          {dashboard.entries.map((entry, index) => {
            const isActive = entry.id === selectedEntry?.id;
            const size = getDotSize(entry);

            return (
              <Link
                key={entry.id}
                href={`/demo/archive/${entry.id}`}
                className={isActive ? "timeline-node timeline-node-active" : "timeline-node"}
                style={{
                  animationDelay: `${index * 70}ms`,
                  borderColor: getEmotionColor(entry.analysis.primary_emotion)
                }}
                onMouseEnter={() => setSelectedId(entry.id)}
                onFocus={() => setSelectedId(entry.id)}
              >
                <div
                  className="timeline-dot"
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    background: getEmotionColor(entry.analysis.primary_emotion),
                    boxShadow: `0 0 0 8px ${getEmotionColor(entry.analysis.primary_emotion)}18`
                  }}
                />
                <div className="timeline-meta">
                  <span className="section-label">{formatDate(entry.entry_date)}</span>
                  <strong>{entry.analysis.primary_emotion}</strong>
                </div>
                <div className="timeline-preview">
                  <p className="section-label">{formatDate(entry.entry_date)}</p>
                  <strong>{entry.analysis.primary_emotion}</strong>
                  <p className="muted-text">{entry.analysis.summary}</p>
                </div>
              </Link>
            );
          })}
        </div>

        {selectedEntry ? (
          <div className="timeline-selection">
            <div>
              <p className="section-label">Selected entry</p>
              <h3>{selectedEntry.analysis.summary}</h3>
              <p className="muted-text">
                {formatDate(selectedEntry.entry_date)} · {selectedEntry.analysis.primary_emotion} · mood {selectedEntry.analysis.mood_score}/10 · stress {selectedEntry.analysis.stress_level}/10
              </p>
            </div>
            <Link href={`/demo/archive/${selectedEntry.id}`} className="primary-button">
              Open detail view
            </Link>
          </div>
        ) : null}
      </section>

      <section className="panel emotion-cloud-panel reveal-panel">
        <div className="section-head">
          <div>
            <p className="section-label">Emotion cloud</p>
            <h2>High-frequency feelings become visible fast</h2>
          </div>
        </div>

        <div className="emotion-cloud">
          {dashboard.emotionCloud.map((item) => (
            <button
              key={item.emotion}
              type="button"
              className="emotion-cloud-tag"
              style={{
                color: item.color,
                borderColor: `${item.color}40`,
                fontSize: `${0.92 + item.count * 0.12}rem`
              }}
              onClick={() => {
                const match = dashboard.entries.find((entry) => entry.analysis.primary_emotion === item.emotion || entry.analysis.secondary_emotions.includes(item.emotion));
                if (match) {
                  setSelectedId(match.id);
                }
              }}
            >
              {item.emotion}
            </button>
          ))}
        </div>
      </section>

      <section className="panel recent-entries-panel reveal-stagger">
        <div className="section-head">
          <div>
            <p className="section-label">Recent entries</p>
            <h2>Clickable examples that connect the charts back to lived context</h2>
          </div>
        </div>

        <div className="recent-entry-list">
          {dashboard.entries.slice(0, 6).map((entry, index) => (
            <Link
              key={entry.id}
              href={`/demo/archive/${entry.id}`}
              className={entry.id === selectedEntry?.id ? "recent-entry-card recent-entry-card-active" : "recent-entry-card"}
              style={{ animationDelay: `${index * 80}ms` }}
              onMouseEnter={() => setSelectedId(entry.id)}
              onFocus={() => setSelectedId(entry.id)}
            >
              <div className="recent-entry-topline">
                <span className="section-label">{formatDate(entry.entry_date)}</span>
                <span className="archive-energy">{entry.analysis.energy_direction}</span>
              </div>
              <h3>{entry.analysis.summary}</h3>
              <p className="muted-text">{entry.analysis.raw_text.slice(0, 132).trim()}...</p>
              <div className="tag-row">
                <span className="tag" style={{ borderColor: `${getEmotionColor(entry.analysis.primary_emotion)}40`, color: getEmotionColor(entry.analysis.primary_emotion) }}>
                  {entry.analysis.primary_emotion}
                </span>
                {entry.analysis.themes.slice(0, 2).map((theme) => (
                  <span key={theme} className="tag">
                    {theme}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <NudgePanel snapshot={dashboard.reminderSnapshot} />

      <section id="demo-charts" className={showPulse || isPending ? "charts-grid reveal-group charts-loading" : "charts-grid reveal-group"}>
        <EmotionTrendsChart data={dashboard.emotionTrends} />
        <TriggerSourcesChart data={dashboard.triggerSources} />
        <EnergyPatternsChart data={dashboard.energyPatterns} />
      </section>

      <RestorativeInsights insights={dashboard.restorativeInsights} />
    </>
  );
}
