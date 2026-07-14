import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

import { onRequestPost } from "../../../../../functions/admin/api/create-notebook.js";
import { withAdminContentSync } from "../../../lib/admin-content-sync.mjs";
import { invokeAuthorPagesFunction } from "../../../lib/pages-function-adapter.mjs";

export const prerender = false;
const createNotebook = withAdminContentSync(onRequestPost, "create-notebook");

export const POST: APIRoute = ({ request }) => invokeAuthorPagesFunction(createNotebook, { env, request });
