import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

import { errorResponse, jsonResponse, readJson } from "../../../../../functions/_lib/http.js";
import { uploadImageToR2 } from "../../../lib/media-store.mjs";
import { invokeAuthorPagesFunction } from "../../../lib/pages-function-adapter.mjs";

export const prerender = false;

async function onRequestPost({ env: runtimeEnv, request }: { env: Cloudflare.Env; request: Request }) {
  try {
    return jsonResponse(await uploadImageToR2(runtimeEnv.MEDIA, await readJson(request)));
  } catch (error) {
    return errorResponse(error);
  }
}

export const POST: APIRoute = ({ request }) => invokeAuthorPagesFunction(onRequestPost, { env, request });
