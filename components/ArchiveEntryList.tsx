"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { ArchiveListItem } from "@/types/journal";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${date}T00:00:00`));
}

function formatGroupLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(new Date(`${date}T00:00:00`));
}

export function ArchiveEntryList({ entries, basePath = "/archive" }: { entries: ArchiveListItem[]; basePath?: string }) {
  const [search, setSearch] = useState("");
  const [emotionFilter, setEmotionFilter] = useState("all");
  const [themeFilter, setThemeFilter] = useState("all");

  const emotionOptions = useMemo(() => ["all", ...Array.from(new Set(entries.map((entry) => entry.primary_emotion)))], [entries]);
  const themeOptions = useMemo(
    () => ["all", ...Array.from(new Set(entries.flatMap((entry) => entry.themes))).sort((a, b) => a.localeCompare(b))],
    [entries]
  );

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();

    return entries.filter((entry) => {
      const matchesSearch =
        query.length === 0 ||
        entry.summary.toLowerCase().includes(query) ||
        entry.preview.toLowerCase().includes(query) ||
        entry.primary_emotion.toLowerCase().includes(query) ||
        entry.themes.some((theme) => theme.toLowerCase().includes(query));

      const matchesEmotion = emotionFilter === "all" || entry.primary_emotion === emotionFilter;
      const matchesTheme = themeFilter === "all" || entry.themes.includes(themeFilter);

      return matchesSearch && matchesEmotion && matchesTheme;
    });
  }, [emotionFilter, entries, search, themeFilter]);

  const groupedEntries = useMemo(() => {
    const groups = new Map<string, ArchiveListItem[]>();

    for (const entry of filteredEntries) {
      const label = formatGroupLabel(entry.entry_date);
      const current = groups.get(label) ?? [];
      current.push(entry);
      groups.set(label, current);
    }

    return Array.from(groups.entries());
  }, [filteredEntries]);

  return (
    <div className="archive-explorer">
      <section className="panel archive-controls">
        <div className="archive-search-row">
          <label className="field-label archive-search-field" htmlFor="archive-search">
            Search entries
          </label>
          <input
            id="archive-search"
            className="archive-search-input"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search summaries, preview text, emotions, or themes"
          />
        </div>

        <div className="archive-filter-row">
          <label className="archive-select-wrap">
            <span className="section-label">Emotion</span>
            <select className="archive-select" value={emotionFilter} onChange={(event) => setEmotionFilter(event.target.value)}>
              {emotionOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All emotions" : option}
                </option>
              ))}
            </select>
          </label>

          <label className="archive-select-wrap">
            <span className="section-label">Theme</span>
            <select className="archive-select" value={themeFilter} onChange={(event) => setThemeFilter(event.target.value)}>
              {themeOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All themes" : option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {groupedEntries.length > 0 ? (
        groupedEntries.map(([label, items]) => (
          <section key={label} className="archive-group reveal-panel">
            <div className="archive-group-head">
              <p className="section-label">Date group</p>
              <h2 className="archive-group-title">{label}</h2>
            </div>

            <div className="archive-grid">
              {items.map((entry) => (
                <Link key={entry.id} href={`${basePath}/${entry.id}`} className="panel archive-card">
                  <div className="archive-topline">
                    <span className="section-label">{formatDate(entry.entry_date)}</span>
                    <span className="archive-energy">{entry.energy_direction}</span>
                  </div>
                  <h2 className="archive-title">{entry.summary}</h2>
                  <p className="muted-text archive-preview">{entry.preview}{entry.preview.length >= 160 ? "..." : ""}</p>
                  <div className="archive-meta-row">
                    <span className="emotion-badge">{entry.primary_emotion}</span>
                    <span className="archive-open-hint">Open entry</span>
                  </div>
                  <div className="tag-row">
                    {entry.themes.slice(0, 3).map((theme) => (
                      <span key={theme} className="tag">
                        {theme}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))
      ) : (
        <section className="panel archive-empty">
          <p className="section-label">No matches</p>
          <h2 className="archive-group-title">No entries match the current search and filters</h2>
          <p className="muted-text">Try a broader search or clear one of the active filters.</p>
        </section>
      )}
    </div>
  );
}
