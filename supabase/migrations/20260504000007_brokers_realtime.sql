-- Enable Supabase Realtime on `brokers` for live updates on the broker
-- detail page (notes editor + future writes from other tabs).
--
-- Idempotent.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname    = 'supabase_realtime'
      and schemaname = 'public'
      and tablename  = 'brokers'
  ) then
    execute 'alter publication supabase_realtime add table public.brokers';
  end if;
end
$$;
