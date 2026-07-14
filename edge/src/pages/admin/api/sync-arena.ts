import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

import { onRequestPost } from "../../../../../functions/admin/api/sync-arena.js";
import { invokeAuthorPagesFunction } from "../../../lib/pages-function-adapter.mjs";

export const prerender = false;
export const POST: APIRoute = ({ request }) => invokeAuthorPagesFunction(onRequestPost, { env, request });
