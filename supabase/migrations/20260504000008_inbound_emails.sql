-- inbound_emails: Phase 4 inbox triage landing zone.
--
-- Per the master spec, deals@cstacademy.com receives broker email blasts.
-- Gmail forwards each message to POST /api/webhooks/email which stores it
-- here. A separate scoring pass (Haiku 4.5 classifier) reads `triaged=false`
-- rows, decides if the email is a relevant CIM teaser, and either inserts
-- into broker_signals or marks the row as not-relevant.
--
-- This migration ships the table only — classification + UI surface are
-- follow-ons.
--
-- Idempotent.

create table if not exists public.inbound_emails (
  id              uuid        primary key default gen_random_uuid(),
  message_id      text,                                -- email Message-ID header for dedup
  from_address    text,
  from_name       text,
  subject         text,
  body_text       text,
  body_html       text,
  received_at     timestamptz not null default now(),
  raw             jsonb,                               -- full webhook payload
  triaged         boolean     not null default false,  -- classifier has processed
  is_relevant     boolean,                             -- classifier verdict (null until triaged)
  practice_id     uuid        references public.practices(id),
  broker_signal_id uuid       references public.broker_signals(id),
  notes           text,
  created_at      timestamptz not null default now()
);

comment on table public.inbound_emails is
  'Inbound broker email landing zone. Phase 4 inbox triage. Populated by POST /api/webhooks/email; classifier reads triaged=false rows.';

-- Dedup on message_id when present (NULLs allowed; multiple NULLs distinct).
create unique index if not exists inbound_emails_message_id_unique
  on public.inbound_emails (message_id)
  where message_id is not null;

create index if not exists inbound_emails_triaged_idx
  on public.inbound_emails (triaged, received_at desc);

create index if not exists inbound_emails_received_idx
  on public.inbound_emails (received_at desc);

-- ---------------------------------------------------------------------------
-- RLS — clients read; only the service-role API route writes.
-- ---------------------------------------------------------------------------
alter table public.inbound_emails enable row level security;

drop policy if exists "inbound_emails read" on public.inbound_emails;
create policy "inbound_emails read"
  on public.inbound_emails
  for select
  to anon, authenticated
  using (true);

drop policy if exists "inbound_emails no client writes" on public.inbound_emails;
create policy "inbound_emails no client writes"
  on public.inbound_emails
  for all
  to anon, authenticated
  using (false)
  with check (false);
