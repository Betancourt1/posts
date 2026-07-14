import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

import { searchDocuments } from "../../lib/content-queries.mjs";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const query = String(url.searchParams.get("q") || "").trim().slice(0, 160);
  const lang = url.searchParams.get("lang") === "es" ? "es" : "en";
  const limit = Math.min(30, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  const documents = query ? await searchDocuments(env.DB, query, lang, limit) : [];
  const results = documents.map((document: any) => ({
    path: document.path,
    title: document.title,
    summary: document.summary || document.description,
    excerpt: document.excerpt || document.summary || document.description,
    date: document.date,
    section: document.section,
    tags: document.tags,
  }));

  return Response.json(
    { query, results },
    { headers: { "cache-control": "public, max-age=60" } },
  );
};
