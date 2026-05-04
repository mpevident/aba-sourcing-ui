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

### Required env

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable or legacy anon key>
```

Both are exposed to the browser, so use a publishable key (`sb_publishable_*`) or a row-level-security-protected legacy anon key — never the secret key.

## Routes

| Route | Purpose |
|---|---|
| `/` | Intelligence Feed — KPIs, state map, score histogram, source bar, lead table, activity feed, scraper health, scheduled runs |
| `/pipeline` | 5-stage Kanban (new → reviewing → pursuing → passed → closed); click stage buttons to move a deal |
| `/universe` | Filterable table of every scored broker listing (search / state / score) |
| `/outreach` | Outreach log joined to practices |
| `/login` | Supabase email/password sign-in |

## Database tables (public schema, read-only from UI)

| Table | What's there | UI uses |
|---|---|---|
| `practices` | Layer-1 universe of ABA practices (NPI, Medicaid, SoS, owner) | KPI count, outreach join |
| `broker_signals` | Layer-1 scraped broker listings (BizBuySell, BizQuest, etc.) | every dashboard surface |
| `bcba_individuals` | BACB-cert holders feeding owner identification | not yet surfaced |
| `brokers` | Broker firms / dealmakers | not yet surfaced |
| `signals` | Layer-3 weighted signals per practice | not yet surfaced |
| `scores` | Layer-3 rolling seller-probability scores per practice | not yet surfaced |
| `outreach_log` | Layer-4 outreach activity | `/outreach` |

## Auth

Currently **disabled** — `middleware.ts` no-ops while we iterate. The original Supabase-auth-enforcing middleware lives in git history (commit `52781b4`) and a login page exists at `/login`. Re-enable by restoring the prior middleware.

## Deploying

Production target is Vercel. Server components on `/` and `/outreach` are explicitly `dynamic = 'force-dynamic'` to avoid static-render attempts on Supabase queries.

## See also

- Master spec: [`../ABA-SOURCING-ENGINE-SPEC.md`](../ABA-SOURCING-ENGINE-SPEC.md) — full architecture, build phases, model routing, source index
- `AGENTS.md` — Next.js 16 breaking-change note for AI assistants
