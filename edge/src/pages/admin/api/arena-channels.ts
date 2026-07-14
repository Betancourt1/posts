import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

import { onRequestGet } from "../../../../../functions/admin/api/arena-channels.js";
import { invokeAuthorPagesFunction } from "../../../lib/pages-function-adapter.mjs";

export const prerender = false;
export const GET: APIRoute = ({ request }) => invokeAuthorPagesFunction(onRequestGet, { env, request });
