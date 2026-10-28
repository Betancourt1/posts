import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

import { receiveCvVisit } from "../../lib/cv-visits.mjs";

export const prerender = false;
export const ALL: APIRoute = ({ request }) => receiveCvVisit(request, env.DB);
