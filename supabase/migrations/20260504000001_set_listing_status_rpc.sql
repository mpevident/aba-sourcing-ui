-- set_listing_status RPC + trigger source-detection.
--
-- Why: 20260504000000_status_changes.sql installed an audit trigger that
-- always stamps source = 'trigger', so we couldn't tell apart UI moves from
-- engine / Apollo moves. This migration teaches the trigger to read a
-- per-transaction setting (app.audit_source) and adds an RPC that sets the
-- setting + does the update inside one transaction. UI calls the RPC; other
-- writers can do the same with their own source string. Direct UPDATEs that
-- skip the RPC fall back to source='trigger'.
--
-- Idempotent — safe to re-run.

-- ---------------------------------------------------------------------------
-- Updated trigger: read source from session config, fall back to 'trigger'.
-- ---------------------------------------------------------------------------
create or replace function public.log_broker_signal_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source text;
begin
  if (old.status is distinct from new.status) then
    -- current_setting(name, missing_ok=true) returns '' when unset.
    v_source := coalesce(nullif(current_setting('app.audit_source', true), ''), 'trigger');
    insert into public.status_changes (
      target_table, target_id, from_status, to_status, changed_by, source
    )
    values (
      'broker_signals', new.id::text, old.status, new.status, auth.uid(), v_source
    );
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: set_listing_status — single-transaction status update with explicit
-- source. The audit row is written by the trigger reading app.audit_source.
-- ---------------------------------------------------------------------------
create or replace function public.set_listing_status(
  p_id uuid,
  p_status text,
  p_source text default 'ui'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- set_config(name, value, is_local=true) scopes to this transaction only.
  perform set_config('app.audit_source', p_source, true);
  update public.broker_signals set status = p_status where id = p_id;
end;
$$;

-- The function is security-definer, so anon / authenticated can call it
-- without direct write access on broker_signals (RLS-friendly).
grant execute on function public.set_listing_status(uuid, text, text) to anon, authenticated;
