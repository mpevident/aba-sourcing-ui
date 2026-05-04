-- Enable Supabase Realtime on the remaining tables that drive live UI:
--   - signals + scores → /practice/[id] live signal timeline + score updates
--   - broker_signals + status_changes → / home page live ingest + audit
--
-- Idempotent — only adds tables to the supabase_realtime publication if not
-- already present.

do $$
declare
  t text;
begin
  for t in select unnest(array['signals', 'scores', 'broker_signals', 'status_changes']) loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname    = 'supabase_realtime'
        and schemaname = 'public'
        and tablename  = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end
$$;
