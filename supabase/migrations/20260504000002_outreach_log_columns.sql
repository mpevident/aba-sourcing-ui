-- Ensure outreach_log has the columns the UI compose form + Apollo webhook
-- write to. Idempotent — `add column if not exists` is a no-op when present.
--
-- Why: the existing `/outreach` page only reads `outreach_type`, `recipient_name`,
-- `recipient_email`, `status`, `sent_at`, `replied_at` so we can't infer whether
-- `body` and `apollo_raw` exist. This migration adds both if absent.

alter table public.outreach_log
  add column if not exists body       text,
  add column if not exists apollo_raw jsonb;

comment on column public.outreach_log.body is
  'Free-form notes / message body. Written by the UI compose form. Plain text.';

comment on column public.outreach_log.apollo_raw is
  'Raw payload received from Apollo webhook for this row, when applicable.';
