import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

import { onRequestPost } from "../../../../../functions/admin/api/delete-notebook.js";
import { withAdminContentSync } from "../../../lib/admin-content-sync.mjs";
import { invokeAuthorPagesFunction } from "../../../lib/pages-function-adapter.mjs";

export const prerender = false;
const deleteNotebook = withAdminContentSync(onRequestPost, "delete-notebook");

export const POST: APIRoute = ({ request }) => invokeAuthorPagesFunction(deleteNotebook, { env, request });
