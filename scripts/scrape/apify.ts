/**
 * Apify actor runner.
 *
 * Triggers an Apify actor synchronously, waits for its dataset, and returns
 * the items. Each scrape source has its own actor id (set per-source via
 * env vars; see ACTOR_BY_SOURCE below).
 *
 * Required env:
 *   APIFY_API_TOKEN
 *
 * Per-source actor IDs — set whichever sources you've configured in Apify:
 *   APIFY_ACTOR_BIZBUYSELL
 *   APIFY_ACTOR_BIZQUEST
 *   APIFY_ACTOR_DEALSTREAM
 *   APIFY_ACTOR_BUSINESSESFORSALE
 *   APIFY_ACTOR_BIZBEN
 */

import type { SourceKey } from "./lib";

const APIFY_BASE = "https://api.apify.com/v2";

export const ACTOR_ENV: Record<SourceKey, string> = {
  bizbuysell: "APIFY_ACTOR_BIZBUYSELL",
  bizquest: "APIFY_ACTOR_BIZQUEST",
  dealstream: "APIFY_ACTOR_DEALSTREAM",
  businessesforsale: "APIFY_ACTOR_BUSINESSESFORSALE",
  bizben: "APIFY_ACTOR_BIZBEN",
};

export interface ApifyRunResult<T = unknown> {
  runId: string;
  datasetId: string;
  items: T[];
  /** ms wall time. */
  durationMs: number;
}

interface ApifyRun {
  id: string;
  status: "READY" | "RUNNING" | "SUCCEEDED" | "FAILED" | "ABORTED" | "TIMING-OUT" | "TIMED-OUT";
  defaultDatasetId: string;
}

/**
 * Trigger an actor and wait for it to finish, then download the dataset.
 *
 * Polls every 4s up to a timeout (default 5min). Long-running scrapes may
 * need a higher timeout.
 */
export async function runApifyActor<T = unknown>(opts: {
  actorId: string;
  input: unknown;
  timeoutMs?: number;
  pollIntervalMs?: number;
}): Promise<ApifyRunResult<T>> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("runApifyActor: APIFY_API_TOKEN env var required");

  const startedAt = Date.now();
  const timeout = opts.timeoutMs ?? 5 * 60 * 1000;
  const poll = opts.pollIntervalMs ?? 4000;

  // Start run
  const startResp = await fetch(`${APIFY_BASE}/acts/${encodeURIComponent(opts.actorId)}/runs?token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts.input),
  });
  if (!startResp.ok) {
    const body = await startResp.text().catch(() => "");
    throw new Error(`apify start failed (${startResp.status}): ${body.slice(0, 300)}`);
  }
  const startBody = (await startResp.json()) as { data: ApifyRun };
  let run = startBody.data;

  // Poll until done
  while (run.status === "READY" || run.status === "RUNNING" || run.status === "TIMING-OUT") {
    if (Date.now() - startedAt > timeout) {
      throw new Error(`apify run ${run.id} timed out after ${timeout}ms (status=${run.status})`);
    }
    await new Promise((r) => setTimeout(r, poll));
    const r = await fetch(`${APIFY_BASE}/actor-runs/${run.id}?token=${token}`);
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      throw new Error(`apify poll failed (${r.status}): ${body.slice(0, 300)}`);
    }
    run = ((await r.json()) as { data: ApifyRun }).data;
  }

  if (run.status !== "SUCCEEDED") {
    throw new Error(`apify run ${run.id} ended with status ${run.status}`);
  }

  // Fetch dataset items
  const itemsResp = await fetch(
    `${APIFY_BASE}/datasets/${run.defaultDatasetId}/items?token=${token}&format=json&clean=1`
  );
  if (!itemsResp.ok) {
    const body = await itemsResp.text().catch(() => "");
    throw new Error(`apify dataset fetch failed (${itemsResp.status}): ${body.slice(0, 300)}`);
  }
  const items = (await itemsResp.json()) as T[];

  return {
    runId: run.id,
    datasetId: run.defaultDatasetId,
    items,
    durationMs: Date.now() - startedAt,
  };
}

/**
 * Resolve an actor id from env for a source. Returns null if the env var
 * isn't set, so the orchestrator can skip sources gracefully.
 */
export function actorIdForSource(source: SourceKey): string | null {
  return process.env[ACTOR_ENV[source]] || null;
}
