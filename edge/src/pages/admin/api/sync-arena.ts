import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

import { onRequestPost } from "../../../../../functions/admin/api/sync-arena.js";
import { withAdminContentSync } from "../../../lib/admin-content-sync.mjs";
import { invokeAuthorPagesFunction } from "../../../lib/pages-function-adapter.mjs";

export const prerender = false;
const syncArena = withAdminContentSync(onRequestPost, "sync-arena");

export const POST: APIRoute = ({ request }) => invokeAuthorPagesFunction(syncArena, { env, request });
