# Atlas Journal

Atlas Journal is a Next.js + TypeScript MVP for turning raw journal entries into structured emotional insight. It keeps the original writing intact, validates the extracted analysis with Zod, saves the result to a local JSON file, and visualizes trends in a clean emotional-intelligence dashboard.

## What this MVP includes

- Journal entry form
- Analysis API route
- Results card showing raw text plus extracted insights
- Dashboard with 3 charts:
  - Emotion Trends
  - Trigger Sources
  - Energy Patterns
- Journal archive with entry detail pages
- Time range filtering for dashboard trends
- Restorative insights based on saved entries
- Local JSON persistence
- Seed data for immediate testing
- Automatic mock analysis when `OPENAI_API_KEY` is missing

## Source of truth files

- [`lib/schema.ts`](/C:/Users/spiri/OneDrive/Desktop/AtlasJournal/lib/schema.ts)
  Zod validation for the MVP analysis shape.
- [`data/sampleEntries.json`](/C:/Users/spiri/OneDrive/Desktop/AtlasJournal/data/sampleEntries.json)
  Seed data used to initialize the local JSON database.
- [`analyzeEntry.prompt.txt`](/C:/Users/spiri/OneDrive/Desktop/AtlasJournal/analyzeEntry.prompt.txt)
  Extraction rules used for AI analysis.

## MVP analysis fields

The app currently validates and stores only these fields:

- `raw_text`
- `summary`
- `primary_emotion`
- `secondary_emotions`
- `triggers`
- `coping_actions`
- `sentiment`
- `mood_score`
- `stress_level`
- `energy_level`
- `energy_direction`
- `emotional_shift`
- `themes`
- `notable_phrases`
- `reflection_tags`
- `confidence`

## File structure

```text
app/
  api/analyze/route.ts      API route for analysis and persistence
  archive/page.tsx          Archive list page
  archive/[id]/page.tsx     Full saved-entry detail page
  dashboard/page.tsx        Dashboard page with 3 charts
  journal/page.tsx          Journal workspace
  globals.css               Global design system and layout styles
  layout.tsx                Shared metadata and root layout
  page.tsx                  Landing page

components/
  AppFrame.tsx              Shared top-level app frame
  ArchiveEntryDetail.tsx    Full saved-entry detail presentation
  ArchiveEntryList.tsx      Archive cards for all saved entries
  DashboardRangeFilter.tsx  Range selector for dashboard filtering
  RestorativeInsights.tsx   Supportive pattern-recognition summary cards
  JournalEntryForm.tsx      Client-side journal form and API call
  ResultsCard.tsx           Structured analysis display
  EmotionTrendsChart.tsx    Mood and stress chart
  TriggerSourcesChart.tsx   Trigger frequency chart
  EnergyPatternsChart.tsx   Energy-over-time chart

data/
  sampleEntries.json        Seed entries
  journalEntries.json       Local JSON persistence file

lib/
  ai.ts                     Mock/OpenAI analysis logic
  db.ts                     Explicit local JSON persistence helpers
  schema.ts                 Zod schemas
  validators.ts             Validation utilities

types/
  journal.ts                Shared TypeScript types inferred from Zod
```

## How persistence works

This MVP uses a simple local JSON file instead of a database service.

- `data/sampleEntries.json` holds the seed dataset.
- `data/journalEntries.json` is the working store.
- On first run, if `journalEntries.json` is missing, Atlas Journal creates it from the sample seed file.
- Every valid analysis result is appended to `journalEntries.json`.

## Install and run

1. Install Node.js 20 or newer.
2. Install dependencies:

```bash
npm install
```

3. Start the dev server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## OpenAI behavior

- If `OPENAI_API_KEY` is not set, the app uses a mock analysis automatically.
- If `OPENAI_API_KEY` is set, the analysis layer attempts an OpenAI request and falls back to the mock analysis if the request fails.

## Recent additions

- Archive:
  Saved entries can now be browsed from `/archive`, with each item showing the entry date, summary, primary emotion, themes, and energy direction.
- Entry detail:
  Each archived entry has its own detail page that shows the raw text and full structured analysis together.
- Time range filters:
  The dashboard supports `last 7 days`, `last 30 days`, `last 90 days`, and `all time`.
- Restorative insights:
  The dashboard now surfaces patterns in helpful coping actions, themes, and emotional shifts that tend to appear when outcomes improve.

## Notes

- All analysis is validated with Zod before saving.
- The original journal entry is always preserved.
- The interface is intentionally small, polished, and structured to keep the MVP easy to extend.
