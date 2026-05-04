-- scraper_runs: first-class run history for OpenClaw / Apify scrapers.
--
-- Today we infer scraper health by looking at the most recent
-- broker_signals.first_seen_at per source_site, which conflates "scraper ran"
-- with "scraper found something." This table separates the two.
--
-- POST /api/scrapers/run upserts into this table at the start of each run
-- (status='running'), then again when finished (status='ok' | 'error' |
-- 'partial'). Caller passes a `run_id` for idempotency on retries.
--
-- Idempotent — safe to re-run.

create table if not exists public.scraper_runs (
  id                uuid        primary key default gen_random_uuid(),
  run_id            text,                                       -- caller-supplied idempotency key (nullable)
  scraper_key       text        not null,                       -- 'bizbuysell' | 'bizquest' | etc
  status            text        not null
                                check (status in ('running', 'ok', 'error', 'partial')),
  started_at        timestamptz not null default now(),
  finished_at       timestamptz,
  duration_ms       integer,
  listings_seen     integer,
  listings_inserted integer,
  listings_updated  integer,
  error_message     text,
  meta              jsonb,
  created_at        timestamptz not null default now()
);

comment on table public.scraper_runs is
  'First-class run history for scrapers. Populated by POST /api/scrapers/run.';

-- Non-partial unique index. NULL run_ids are treated as distinct, so anonymous
-- inserts (no run_id) are unrestricted, while runs WITH a run_id are uniquely
-- keyed by (scraper_key, run_id) — exactly what upsert needs.
create unique index if not exists scraper_runs_key_runid_unique
  on public.scraper_runs (scraper_key, run_id);

create index if not exists scraper_runs_key_started_idx
  on public.scraper_runs (scraper_key, started_at desc);

create index if not exists scraper_runs_status_started_idx
  on public.scraper_runs (status, started_at desc);

-- ---------------------------------------------------------------------------
-- RLS — clients read; only the service-role API route writes.
-- ---------------------------------------------------------------------------
alter table public.scraper_runs enable row level security;

drop policy if exists "scraper_runs read" on public.scraper_runs;
create policy "scraper_runs read"
  on public.scraper_runs
  for select
  to anon, authenticated
  using (true);

drop policy if exists "scraper_runs no client writes" on public.scraper_runs;
create policy "scraper_runs no client writes"
  on public.scraper_runs
  for all
  to anon, authenticated
  using (false)
  with check (false);
