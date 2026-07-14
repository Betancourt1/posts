import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

import { onRequestGet } from "../../../../functions/admin/image-editor.js";
import { invokePagesFunction } from "../../lib/pages-function-adapter.mjs";

export const prerender = false;
export const GET: APIRoute = ({ request }) => invokePagesFunction(onRequestGet, { env, request });
