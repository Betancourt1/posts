import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { sectionItems } from "../../lib/content-queries.mjs";

export const prerender = false;

export const GET: APIRoute = async () => {
  const items = await sectionItems(env.DB, "lit");
  const quotes = items.flatMap((item: any) =>
    (Array.isArray(item.frontMatter?.quotes) ? item.frontMatter.quotes : [])
      .filter((quote: any) => typeof quote.text === "string" && quote.text.trim()
        && typeof quote.author === "string" && quote.author.trim())
      .map((quote: any) => ({ text: quote.text, author: quote.author, href: item.path }))
  );
  return Response.json({ quotes }, { headers: { "cache-control": "public, max-age=300" } });
};
