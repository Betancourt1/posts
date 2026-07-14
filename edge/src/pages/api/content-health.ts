import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

import { contentStats } from "../../lib/content-store.mjs";

export const prerender = false;

export const GET: APIRoute = async () => {
  const [stats, latestRun] = await Promise.all([
    contentStats(env.DB),
    env.DB.prepare(`
      SELECT commit_sha, status, finished_at
      FROM sync_runs
      ORDER BY id DESC
      LIMIT 1
    `).first(),
  ]);
  const ready = Number(stats.documents || 0) > 0;

  return new Response(JSON.stringify({ ready, stats, latestRun }), {
    status: ready ? 200 : 503,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
};
