import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

import { errorResponse, jsonResponse, readJson } from "../../../../../functions/_lib/http.js";
import { invokeAuthorPagesFunction } from "../../../lib/pages-function-adapter.mjs";

export const prerender = false;

async function onRequestPost({ env: runtimeEnv, request }: { env: Cloudflare.Env; request: Request }) {
  try {
    const payload = await readJson(request);
    const id = Number(payload?.id);
    if (!Number.isInteger(id) || id <= 0) {
      return jsonResponse({ ok: false, error: "id_invalid" }, 400);
    }
    await runtimeEnv.DB.prepare("DELETE FROM guestbook_entries WHERE id = ?1").bind(id).run();
    return jsonResponse({ ok: true, id });
  } catch (error) {
    return errorResponse(error);
  }
}

export const POST: APIRoute = ({ request }) => invokeAuthorPagesFunction(onRequestPost, { env, request });
