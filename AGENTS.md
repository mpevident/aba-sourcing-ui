<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version (16.x) has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

Hot spots:
- `params` and `searchParams` are `Promise`s. Use `await params` (server) or `use(params)` (client).
- `cookies()`, `headers()`, `draftMode()` are async — `(await cookies()).get(...)`.
- `PageProps<'/route'>` and `LayoutProps<'/route'>` are globally available helpers (no import) generated during `next dev` / `next build`.
<!-- END:nextjs-agent-rules -->

---

## What this repo is

The **operator dashboard** for the CST Academy ABA acquisition sourcing engine. Reads from Supabase. Does not scrape, score, or send outreach — those run elsewhere (OpenClaw on Jarvis at 192.168.50.56, Apify, Apollo) and write into the same Supabase project.

Master spec: `../ABA-SOURCING-ENGINE-SPEC.md` — read it before making architectural changes.

## What this repo is NOT

- **Not a place for scrapers** — no Apify SDK, no `puppeteer`, no `cheerio`. Scrapers live in OpenClaw.
- **Not a place for scoring** — no Anthropic/OpenAI SDK calls. Scoring is the engine's job.
- **Not a place for outbound messaging** — no email send, no Apollo API. Outreach engine handles that.

If you find yourself reaching for any of those, you're in the wrong repo.

---

## Data contracts (what UI may read vs. write)

| Table              | UI reads | UI writes                           | Owner / writer        |
|--------------------|----------|-------------------------------------|-----------------------|
| `practices`        | yes      | **never**                           | OpenClaw scrapers     |
| `broker_signals`   | yes      | only `status` field (kanban moves)  | OpenClaw scrapers     |
| `bcba_individuals` | yes      | **never**                           | OpenClaw scrapers     |
| `brokers`          | yes      | yes (`notes` only via UI editor)    | OpenClaw + manual ops |
| `signals`          | yes      | **never**                           | Scoring engine        |
| `scores`           | yes      | **never**                           | Scoring engine        |
| `outreach_log`     | yes      | yes (compose / status updates)      | UI + Apollo webhook   |
| `status_changes`   | yes      | **never** (trigger writes only)     | Postgres trigger      |
| `scraper_runs`     | yes      | **never** (Route Handler only)      | `POST /api/scrapers/run` |
| `inbound_emails`   | yes      | **never** (Route Handler only)      | `POST /api/webhooks/email` |

> **Rule of thumb:** if a table holds upstream truth (universe, signals, scores), it is read-only here. The dashboard shows what the engine produced; it does not invent the truth.

`status_changes` is created by `supabase/migrations/20260504000000_status_changes.sql` — apply via Supabase SQL editor or `supabase db push`.

---

## File / route conventions

- All authenticated app routes live under `app/(dashboard)/` so they inherit the sidebar layout.
- `/login` is outside the dashboard group.
- Dynamic routes use `[id]` (e.g. `app/(dashboard)/practice/[id]/page.tsx`).
- Top-level route additions require a sidebar entry — see `components/sidebar.tsx`.
- Any page that hits Supabase exports `dynamic = 'force-dynamic'` and `revalidate = 0`. Static-render on a request-time data source breaks `next build`.

## Supabase client choice

| Where                                | Use                                |
|--------------------------------------|------------------------------------|
| Server component / page              | `createClient()` from `@/lib/supabase/server` (async, cookies-bound) |
| Client component                     | `createClient()` from `@/lib/supabase/client` (browser, no cookies) |
| Route Handler under `app/api`        | `createAdminClient()` from `@/lib/supabase/admin` (service role, bypasses RLS) — **server-only** |
| User-driven mutation                 | Prefer client component + browser client + RPC; never reach for the service-role client to "fix" RLS |

Anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY) is exposed to the browser. Use a publishable key (`sb_publishable_*`) or RLS-protected legacy anon key. **Never** the service role key here.

Service role key (SUPABASE_SERVICE_ROLE_KEY) lives **only** as a non-public env var consumed by `lib/supabase/admin.ts`. The file `import "server-only"` directive will fail the build if it ever lands in a Client Component bundle.

---

## Styling & design tokens

The repo uses a custom token system in `app/globals.css` — `var(--bg-base)`, `var(--bg-card)`, `var(--text-1)` / `text-2` / `text-3`, `var(--data)`, `var(--signal)`, `var(--positive)`, `var(--warning)`, `var(--critical)`, `var(--action)`, `var(--border)`, `var(--border-subtle)`, `var(--border-bright)`.

- **Use the tokens.** Don't hardcode hex like `#0C0E14` or `#2A3347` (some legacy spots still do — don't add more).
- Score visualization: always use `<ScoreBadge score={n} />` from `@/components/score-badge`. Don't reimplement.
- Money: `fmtMoney` helper pattern (`$2.4M` / `$340K` / `$50`) — keep consistent.

---

## Realtime

`/outreach` subscribes to `outreach_log` changes via Supabase Realtime so Apollo webhook updates land in the UI without a refresh. The publication membership is set up by `supabase/migrations/20260504000003_outreach_realtime.sql`. If you add another route that wants live updates on a different table:

1. Write a similar migration adding the table to `supabase_realtime` publication.
2. Build a watcher component modeled on `components/outreach-realtime.tsx` (`postgres_changes` subscription + debounced `router.refresh()`).
3. Mount the watcher inside the route's server component.

The watcher renders an inline `LIVE / CONNECTING / OFFLINE / ERROR` badge so operators can tell at a glance whether the channel is healthy.

---

## Performance gotchas

- **Default Supabase row cap is 1000.** Aggregation queries that pull rows for client-side bucketing must `.limit(10000)` or higher (or move to a Postgres view / RPC). Today this matters most on the home page's `scoreRows` and `trendRows` queries.
- **Per-page query fanout** — pages parallelize all queries with `Promise.all`. Add new queries to the existing array; don't add sequential awaits.
- The home page's state-map / score histogram aggregates run on every request. If practice volume crosses ~5K, push these into a materialized view.

---

## Security & PII

- Owner data in this DB comes from **public-record sources only** (BACB registry, state Medicaid directories, SoS portals, public LinkedIn). Anything scraped from behind authentication walls without legal sign-off does not belong here.
- RLS must be on for every table the anon key can reach. Verify in Supabase Studio before deploying schema changes.
- Auth proxy is currently a no-op (`proxy.ts`, renamed from the deprecated `middleware.ts` in Next 16). The original auth-enforcing middleware lives in commit `52781b4` and the `/login` page exists. To re-enable, port the body into `proxy.ts` and rename the export from `middleware` to `proxy`.

---

## Naming the company

Per the master spec: CST Academy is a **strategic acquirer**. Never the phrase "search fund" anywhere user-visible — copy, comments, alt text, screenshots. If outreach drafts are ever rendered in the UI for review, the same rule applies.

---

## Before you commit

```bash
npx tsc --noEmit   # must be clean
npx next build     # must pass — production deploy is Vercel
```
