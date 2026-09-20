import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { onRequestPost } from "../../../lib/writing-preview.mjs";
import { invokeAuthorPagesFunction } from "../../../lib/pages-function-adapter.mjs";

export const prerender = false;
export const POST: APIRoute = ({ request }) => invokeAuthorPagesFunction(onRequestPost, { env, request });
