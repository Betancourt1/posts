import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

import { onRequestPost } from "../../../../../functions/admin/api/delete-page.js";
import { withAdminContentSync } from "../../../lib/admin-content-sync.mjs";
import { invokeAuthorPagesFunction } from "../../../lib/pages-function-adapter.mjs";

export const prerender = false;
const deletePage = withAdminContentSync(onRequestPost, "delete-page");

export const POST: APIRoute = ({ request }) => invokeAuthorPagesFunction(deletePage, { env, request });
