# ABA Sourcing UI

Operator-facing dashboard for the **CST Academy ABA acquisition sourcing engine**. Surfaces scraped broker listings, scored leads, the practice universe, and outreach status.

This repo is the UI layer only. The scrapers, signal stream, and scoring engine run elsewhere (OpenClaw + Apify) and write into Supabase. This dashboard reads that database.

## Stack

- Next.js 16 + React 19 (App Router) — see `AGENTS.md` for the breaking-change note
- Supabase (Postgres + auth) via `@supabase/ssr` and `@supabase/supabase-js`
- Tailwind 4, shadcn / Base UI, Recharts
- TypeScript

## Setup

```bash
npm install
# create .env.local with the two NEXT_PUBLIC_ vars below, then:
npm run dev
```

### Required env (browser-exposed)

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable or legacy anon key>
```

Both are exposed to the browser, so use a publishable key (`sb_publishable_*`) or a row-level-security-protected legacy anon key — never the secret key.

### Server-only env (Vercel project settings, NOT NEXT_PUBLIC_)

Required for `/api/webhooks/apollo` and any future server-only paths:

```
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # bypasses RLS — server-only
APOLLO_WEBHOOK_SECRET=<random shared secret>    # required to authenticate Apollo webhook calls
SCRAPER_INGEST_SECRET=<random shared secret>    # required for OpenClaw to POST scraper run history
EMAIL_INGEST_SECRET=<random shared secret>      # required for Gmail / forwarder to POST inbound broker email
```

`/settings` will flag the publishable / legacy / secret status of the anon key on page load.

## Routes

| Route | Purpose |
|---|---|
| `/` | Intelligence Feed — KPIs, state map, score histogram, source bar, lead table, Layer 1 + Layer 3 activity, scraper health, scheduled runs |
| `/pipeline` | 5-stage Kanban (new → reviewing → pursuing → passed → closed); click stage buttons to move a deal |
| `/universe` | Filterable table of every scored broker listing (search / state / score) |
| `/signals` | Layer 3 signal stream — per-practice seller-intent breadcrumbs, filterable by window and signal_type |
| `/practice/[id]` | Per-practice detail — owner card, profile, latest score with rationale, signal timeline, outreach log, status history, matching listings |
| `/brokers` | Broker CRM list — firms / dealmakers, deal volume, last contact |
| `/brokers/[id]` | Broker detail — contact info, every listing they've sourced |
| `/outreach` | Outreach log joined to practices |
| `/settings` | Connection diagnostic — env, key class, table probes, pipeline freshness |
| `/login` | Supabase email/password sign-in |

### API routes

| Route | Purpose |
|---|---|
| `POST /api/webhooks/apollo` | Apollo outreach webhook receiver. Validates `X-Apollo-Secret` header, normalizes `{ event, outreach_id?, recipient_email?, occurred_at, raw? }`, updates or orphan-logs into `outreach_log`. Service-role write — bypasses RLS. |
| `GET /api/practice/[id]/score-snapshot` | Stable JSON contract (`schema_version: 1`) for the deal-memo flow. Aggregates practice profile, latest score, last 50 signals, last 20 listings, last 20 outreach rows, and totals. Anon-key access (RLS-protected). |
| `GET /api/health` | Liveness + Supabase connectivity ping for the OpenClaw watchdog. 200 when healthy, 503 when DB unreachable. |
| `POST /api/scrapers/run` | OpenClaw run telemetry. Validates `X-Scraper-Secret`, upserts on `(scraper_key, run_id)` if `run_id` is provided (so start + finish update the same row), else inserts. Service-role write — bypasses RLS. |
| `GET /api/digest` | Daily digest contract (per master spec, Phase 1). Returns `new_listings` (top 10 last 24h, midwest-first), `high_fit_today` (≥70 last 24h), `high_weight_signals` (top 10 weighted Layer 3). OpenClaw cron formats + forwards to Telegram at 7am Central. |
| `POST /api/webhooks/email` | Phase 4 inbox triage receiver — Gmail / forwarder POSTs broker email blasts. Validates `X-Email-Secret`, dedupes on `message_id`, lands `triaged=false` row in `inbound_emails`. Classifier reads + creates broker_signals from there. |

## Database tables (public schema, read-only from UI)

| Table | What's there | UI uses |
|---|---|---|
| `practices` | Layer-1 universe of ABA practices (NPI, Medicaid, SoS, owner) | KPI count, outreach join |
| `broker_signals` | Layer-1 scraped broker listings (BizBuySell, BizQuest, etc.) | every dashboard surface |
| `bcba_individuals` | BACB-cert holders feeding owner identification | not yet surfaced |
| `brokers` | Broker firms / dealmakers | `/brokers`, `/brokers/[id]` |
| `signals` | Layer-3 weighted signals per practice | `/signals`, `/practice/[id]`, home stream panel |
| `scores` | Layer-3 rolling seller-probability scores per practice | `/practice/[id]`, home top-probability panel |
| `outreach_log` | Layer-4 outreach activity | `/outreach`, `/practice/[id]` |
| `status_changes` | Append-only audit of status transitions on `broker_signals` | `/practice/[id]` status history panel; written by trigger from `supabase/migrations/20260504000000_status_changes.sql` |
| `scraper_runs` | First-class OpenClaw run history (start / finish / metrics) | created by `supabase/migrations/20260504000004_scraper_runs.sql`; written by `POST /api/scrapers/run`; surfaced on `/settings` (Recent Runs panel), feeds `ScraperHealth` |
| `inbound_emails` | Phase 4 inbox triage landing zone (broker email blasts) | created by `supabase/migrations/20260504000008_inbound_emails.sql`; written by `POST /api/webhooks/email`; not yet surfaced (classifier + UI follow-on) |

## Auth

Currently **disabled** — `proxy.ts` (renamed from the deprecated `middleware.ts` per Next 16) no-ops while we iterate. The original Supabase-auth-enforcing middleware lives in git history (commit `52781b4`) and a login page exists at `/login`. To re-enable, port the body of that middleware into `proxy.ts` and rename the export from `middleware` to `proxy`.

## Deploying

Production target is Vercel. Server components on `/` and `/outreach` are explicitly `dynamic = 'force-dynamic'` to avoid static-render attempts on Supabase queries.

## See also

- Master spec: [`../ABA-SOURCING-ENGINE-SPEC.md`](../ABA-SOURCING-ENGINE-SPEC.md) — full architecture, build phases, model routing, source index
- `AGENTS.md` — Next.js 16 breaking-change note for AI assistants
