import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

import { infrastructureRows } from "../../lib/content-queries.mjs";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const lang = url.searchParams.get("lang") === "es" ? "es" : "en";
  const documents = await infrastructureRows(env.DB, lang);
  const sections = new Map<string, Array<Record<string, unknown>>>();

  for (const document of documents) {
    const section = document.section || (lang === "es" ? "páginas" : "pages");
    if (!sections.has(section)) sections.set(section, []);
    sections.get(section)?.push({
      type: "file",
      name: document.sourcePath.split("/").at(-1),
      title: document.title,
      path: document.path,
      url: document.path,
      content: document.bodyMarkdown,
    });
  }

  const root = [...sections].map(([name, children]) => ({
    type: "dir",
    name,
    children,
  }));

  return Response.json(
    { root },
    { headers: { "cache-control": "public, max-age=300" } },
  );
};
