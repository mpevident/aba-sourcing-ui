-- status_changes: append-only audit log of every status transition the UI
-- (or any agent) makes on broker_signals. Populated by trigger so writers
-- don't have to remember to log.
--
-- This unblocks closed-loop tracking required by the master spec
-- (Phase 6 — outreach engine, success criteria "5+ qualified leads/week").
--
-- Apply via Supabase SQL editor or:
--   supabase db push
-- Idempotent — safe to re-run.

create table if not exists public.status_changes (
  id          uuid        primary key default gen_random_uuid(),
  target_table text       not null,
  target_id    text       not null,
  from_status  text,
  to_status    text       not null,
  changed_at   timestamptz not null default now(),
  changed_by   uuid        references auth.users(id),
  source       text        default 'ui',     -- 'ui' | 'trigger' | 'apollo' | 'engine' | etc
  context      jsonb
);

comment on table public.status_changes is
  'Append-only audit of status transitions on broker_signals (and other deal-flow tables). Populated by trigger. Read-only from clients.';

create index if not exists status_changes_target_idx
  on public.status_changes (target_table, target_id, changed_at desc);

create index if not exists status_changes_changed_at_idx
  on public.status_changes (changed_at desc);

-- ---------------------------------------------------------------------------
-- Trigger fn: log every change to broker_signals.status
-- ---------------------------------------------------------------------------
create or replace function public.log_broker_signal_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (old.status is distinct from new.status) then
    insert into public.status_changes (
      target_table, target_id, from_status, to_status, changed_by, source
    )
    values (
      'broker_signals', new.id::text, old.status, new.status, auth.uid(), 'trigger'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_broker_signal_status_change on public.broker_signals;
create trigger trg_broker_signal_status_change
after update of status on public.broker_signals
for each row execute function public.log_broker_signal_status_change();

-- ---------------------------------------------------------------------------
-- RLS — clients can read their own org's audit, but cannot write directly.
-- The trigger runs with security definer so it bypasses RLS on insert.
-- ---------------------------------------------------------------------------
alter table public.status_changes enable row level security;

-- Drop and recreate so the migration is rerunnable.
drop policy if exists "status_changes read" on public.status_changes;
create policy "status_changes read"
  on public.status_changes
  for select
  to anon, authenticated
  using (true);

-- Explicitly deny direct writes from clients. The trigger is the only writer.
drop policy if exists "status_changes no client writes" on public.status_changes;
create policy "status_changes no client writes"
  on public.status_changes
  for all
  to anon, authenticated
  using (false)
  with check (false);
