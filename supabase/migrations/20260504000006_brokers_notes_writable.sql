-- Allow the dashboard to update broker notes via the anon key.
--
-- Threat model with auth currently disabled (proxy.ts no-op): anyone with the
-- URL can already read everything the anon key can reach, so a permissive
-- write policy on `brokers` is the same effective trust level. When auth is
-- restored, this should be tightened to require an authenticated session.
--
-- Idempotent.

drop policy if exists "brokers update by anon" on public.brokers;
create policy "brokers update by anon"
  on public.brokers
  for update
  to anon, authenticated
  using (true)
  with check (true);

-- Same justification for inserts so the /brokers compose form can add manual entries.
drop policy if exists "brokers insert by anon" on public.brokers;
create policy "brokers insert by anon"
  on public.brokers
  for insert
  to anon, authenticated
  with check (true);
