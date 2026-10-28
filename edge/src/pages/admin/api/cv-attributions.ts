import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

import { listCvAttributions, registerCvAttribution } from "../../../lib/cv-attributions.mjs";
import { invokeAuthorPagesFunction } from "../../../lib/pages-function-adapter.mjs";

export const prerender = false;
export const GET: APIRoute = ({ request }) => invokeAuthorPagesFunction(listCvAttributions, { env, request });
export const POST: APIRoute = ({ request }) => invokeAuthorPagesFunction(registerCvAttribution, { env, request });
