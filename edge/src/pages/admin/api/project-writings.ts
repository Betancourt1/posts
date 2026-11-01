import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { sectionItems } from "../../../lib/content-queries.mjs";
import { invokeAuthorPagesFunction } from "../../../lib/pages-function-adapter.mjs";

export const prerender = false;
export const GET: APIRoute = ({ url, request }) => invokeAuthorPagesFunction(async () => {
  const posts = await sectionItems(env.DB, url.searchParams.get("lang") === "es" ? "es" : "en", "posts", { includeLanguageFallback: true, tags: false });
  return Response.json({ writings: posts.map(({ title, path }: { title: string; path: string }) => ({ title, path })) });
}, { env, request });
