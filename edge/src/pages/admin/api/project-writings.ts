import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { sectionItems } from "../../../lib/content-queries.mjs";
import { invokeAuthorPagesFunction } from "../../../lib/pages-function-adapter.mjs";

export const prerender = false;
export const GET: APIRoute = ({ request }) => invokeAuthorPagesFunction(async () => {
  const posts = await sectionItems(env.DB, "posts", { tags: false });
  return Response.json({ writings: posts.map(({ title, path }: { title: string; path: string }) => ({ title, path })) });
}, { env, request });
