# Atlas Journal

Atlas Journal is a production-ready journaling app that turns raw writing into emotionally intelligent, structured reflection.

It supports two parallel experiences:
- a private authenticated product with Supabase-backed user data
- a fully separate demo mode with seeded sample entries for public showcase use

## Live app

- Production: [https://atlasjournal.dev](https://atlasjournal.dev)
- Local development: `http://localhost:3000`

## What Atlas Journal does

- preserves the original journal text
- analyzes emotional movement, stressors, supports, recurring topics, and restorative signals
- lets users optionally add mood, stress, and energy check-ins that take priority in trend charts
- keeps broad categories stable for charts while preserving personal language for richer insight
- surfaces repeated personal signals over time
- shows a dedicated support banner for higher-concern entries

## Core product areas

- Journal composer with AI-assisted analysis
- Dashboard for emotion trends, trigger sources, energy patterns, and repeated signals
- Archive with search, filters, and entry detail views
- Demo mode that mirrors the real product without touching real account data
- Supabase email magic-link authentication for private accounts

## Architecture

### App shell

- `app/`
  - App Router pages for home, demo, auth, journal, archive, and dashboard

### Shared components

- `components/AppFrame.tsx`
  - shared layout and navigation for both demo and authenticated product surfaces
- `components/ResultsCard.tsx`
  - renders structured analysis for live and archived entries
- `components/SafetySupportCard.tsx`
  - shows the dedicated support banner for moderate and high concern entries
- `components/RepeatedSignalsPanel.tsx`
  - surfaces repeated personal signals on the dashboard

### Analysis layer

- `lib/ai.ts`
  - AI call + local fallback analysis
- `lib/schema.ts`
  - Zod schema for analysis, adaptive fields, repeated-signal support, and safety assessment
- `lib/validators.ts`
  - request and analysis validation helpers

### Data layer

- `lib/db.ts`
  - authenticated Supabase-backed journal storage and dashboard aggregation
- `lib/demo.ts`
  - separate seeded demo data loader and dashboard aggregation
- `lib/supabase/`
  - browser, server, and proxy Supabase helpers

### Seed/demo data

- `data/demoEntries.json`
  - seeded public showcase data used only in demo mode
- `data/sampleEntries.json`
  - local sample analysis data used by the fallback analyzer

## Authentication

- Supabase Auth with email magic links
- callback route: `/auth/callback`
- sign-out route: `/auth/sign-out`
- protected product routes redirect unauthenticated users to sign-in
- demo mode does not require authentication and does not access private user data

## Analysis model

Atlas Journal uses a hybrid analysis model:

- stable fields for charts and longitudinal patterns
- adaptive fields that preserve user-specific language

Current analysis includes:

- `raw_text`
- `summary`
- `primary_emotion`
- `secondary_emotions`
- `custom_emotion_terms`
- `stressors`
- `supports`
- `themes`
- `recurring_topics`
- `personal_keywords`
- `notable_entities`
- `restorative_signals`
- `evidence_spans`
- `mood_score`
- `stress_level`
- `energy_level`
- `energy_direction`
- `emotional_shift`
- `reflection_tags`
- `confidence`
- `safety_assessment`

## Safety support behavior

Atlas Journal includes a support escalation layer for entries that appear more concerning.

- `none` and `low` concern entries continue through the normal flow
- `moderate` and `high` concern entries show a dedicated support banner above the rest of the analysis
- the banner includes:
  - 988 for the U.S. and territories
  - Samaritans 116 123 for the UK and Ireland
  - guidance to contact local emergency services if there may be immediate danger

This is a support layer, not a diagnostic feature.

## Demo mode

Demo mode is intentionally separate from private account data.

- routes live under `/demo`
- data comes from `data/demoEntries.json`
- demo users can explore dashboard, archive, search, and detail views
- demo mode is read-only

## Environment variables

Create a local `.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
OPENAI_API_KEY=
```

Notes:
- `OPENAI_API_KEY` is optional. If it is missing, Atlas Journal uses the local mock/fallback analyzer.
- Supabase email delivery is configured through your Supabase Auth settings. If Supabase is using Resend SMTP, that is managed in Supabase rather than in app runtime code.

## Local development

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Production notes

- production domain: `https://atlasjournal.dev`
- preview deployments may run on Vercel URLs
- Supabase redirect URLs should include:
  - `https://atlasjournal.dev/auth/callback`
  - your Vercel preview callback URL
  - `http://localhost:3000/auth/callback`

## Tech stack

- Next.js
- TypeScript
- Supabase Auth
- Supabase Postgres
- Zod
- Recharts

## Notes

- All analysis is validated with Zod before saving.
- Older records are normalized safely on read so schema expansion does not break the archive or dashboard.
- Demo data remains fully separate from real user data.
