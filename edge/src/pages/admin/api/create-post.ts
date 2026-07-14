import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

import { onRequestPost } from "../../../../../functions/admin/api/create-post.js";
import { withAdminContentSync } from "../../../lib/admin-content-sync.mjs";
import { invokeAuthorPagesFunction } from "../../../lib/pages-function-adapter.mjs";

export const prerender = false;
const createPost = withAdminContentSync(onRequestPost, "create-post");

export const POST: APIRoute = ({ request }) => invokeAuthorPagesFunction(createPost, { env, request });
