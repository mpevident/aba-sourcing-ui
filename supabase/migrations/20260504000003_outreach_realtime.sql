-- Enable Supabase Realtime on public.outreach_log so the dashboard's
-- /outreach page picks up Apollo webhook updates (and UI compose inserts)
-- without a manual refresh.
--
-- Idempotent — only adds the table to the publication if it isn't already
-- there. `alter publication ... add table` would otherwise error on re-run.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname    = 'supabase_realtime'
      and schemaname = 'public'
      and tablename  = 'outreach_log'
  ) then
    execute 'alter publication supabase_realtime add table public.outreach_log';
  end if;
end
$$;
