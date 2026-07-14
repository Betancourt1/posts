import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

import { errorResponse, jsonResponse, readJson } from "../../../../../functions/_lib/http.js";
import { deleteImageFromR2 } from "../../../lib/media-store.mjs";
import { invokeAuthorPagesFunction } from "../../../lib/pages-function-adapter.mjs";

export const prerender = false;

async function onRequestPost({ env: runtimeEnv, request }: { env: Cloudflare.Env; request: Request }) {
  try {
    const payload = await readJson(request);
    return jsonResponse(await deleteImageFromR2(runtimeEnv.MEDIA, payload.path || payload.url));
  } catch (error) {
    return errorResponse(error);
  }
}

export const POST: APIRoute = ({ request }) => invokeAuthorPagesFunction(onRequestPost, { env, request });
