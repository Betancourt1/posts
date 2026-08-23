import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

import { errorResponse, jsonResponse } from "../../../../../functions/_lib/http.js";
import { invokeAuthorPagesFunction } from "../../../lib/pages-function-adapter.mjs";

export const prerender = false;

async function onRequestGet({ env: runtimeEnv }: { env: Cloudflare.Env }) {
  try {
    const result = await runtimeEnv.DB
      .prepare("SELECT id, name, site, message, ip_hash, created_at FROM guestbook_entries ORDER BY created_at DESC LIMIT 500")
      .all();
    return jsonResponse({ ok: true, entries: result.results });
  } catch (error) {
    return errorResponse(error);
  }
}

export const GET: APIRoute = ({ request }) => invokeAuthorPagesFunction(onRequestGet, { env, request });
