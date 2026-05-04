import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Admin Supabase client using the SERVICE ROLE key. Bypasses RLS.
 *
 * Server-only — the `import "server-only"` directive at the top of this file
 * makes Next.js refuse to bundle it into a Client Component. Never import this
 * from anywhere under `components/` or files marked `"use client"`.
 *
 * Use only in:
 *   - Route Handlers under app/api (route.ts files)
 *   - server actions (when we add them)
 *   - background scripts / scheduled jobs
 *
 * Required env vars (set in Vercel project settings, NOT NEXT_PUBLIC_):
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - NEXT_PUBLIC_SUPABASE_URL is reused (URL alone is not sensitive)
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "createAdminClient requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return createSupabaseClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
