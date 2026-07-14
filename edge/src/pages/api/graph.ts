import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

import { graphRows } from "../../lib/content-queries.mjs";
import { graphPostPayload } from "../../lib/graph-payload.mjs";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const lang = url.searchParams.get("lang") === "es" ? "es" : "en";
  const documents = await graphRows(env.DB, lang);
  if (url.searchParams.get("format") === "posts") {
    return Response.json(graphPostPayload(documents), {
      headers: { "cache-control": "public, max-age=300" },
    });
  }
  const nodes = new Map<string, { id: string; label: string; path: string; section: string }>();
  const links = new Map<string, { source: string; target: string; type: string; weight: number }>();

  for (const document of documents) {
    const ids = document.tags.map((tag: { label: string; slug: string; path: string }) => {
      const id = `tag:${tag.slug}`;
      nodes.set(id, {
        id,
        label: tag.label,
        path: tag.path,
        section: "tags",
      });
      return id;
    });

    for (let left = 0; left < ids.length; left += 1) {
      for (let right = left + 1; right < ids.length; right += 1) {
        const pair = [ids[left], ids[right]].sort();
        const key = pair.join("\u0000");
        const link = links.get(key) || {
          source: pair[0],
          target: pair[1],
          type: "co-tag",
          weight: 0,
        };
        link.weight += 1;
        links.set(key, link);
      }
    }
  }

  return Response.json(
    { nodes: [...nodes.values()], links: [...links.values()] },
    { headers: { "cache-control": "public, max-age=300" } },
  );
};
