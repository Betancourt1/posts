import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

import { normalizeUploadReference } from "../../lib/media-store.mjs";

export const prerender = false;

function notFound() {
  return new Response("Not found.", {
    status: 404,
    headers: { "cache-control": "no-store" },
  });
}

export const GET: APIRoute = async ({ params, request }) => {
  let reference;
  try {
    reference = normalizeUploadReference(`/uploads/${params.path || ""}`);
  } catch {
    return notFound();
  }

  const object = await env.MEDIA.get(reference.key);
  if (!object) return notFound();

  const etag = object.httpEtag || `"${object.etag}"`;
  if (request.headers.get("if-none-match")?.split(",").map((value) => value.trim()).includes(etag)) {
    return new Response(null, {
      status: 304,
      headers: {
        etag,
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", object.httpMetadata?.contentType || reference.contentType || "application/octet-stream");
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("etag", etag);
  headers.set("content-length", String(object.size));

  return new Response(object.body, { headers });
};
