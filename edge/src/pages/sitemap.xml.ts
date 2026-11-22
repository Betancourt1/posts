import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { catalogEntry } from "../lib/catalog.mjs";

export const prerender = false;

function xml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export const GET: APIRoute = async ({ request }) => {
  const [documents, tags] = await Promise.all([
    env.DB.prepare(`
      SELECT r.path, d.updated_at
      FROM routes r
      JOIN documents d ON d.id = r.document_id
      WHERE r.kind = 'canonical' AND d.draft = 0 AND d.hidden = 0
        AND ${catalogEntry()} AND r.path <> '/es/tags/'
      ORDER BY r.path
    `).all(),
    env.DB.prepare(`
      SELECT t.slug
      FROM tags t
      JOIN document_tags dt ON dt.tag_id = t.id
      JOIN documents d ON d.id = dt.document_id
      WHERE d.draft = 0 AND d.hidden = 0 AND ${catalogEntry()}
      GROUP BY t.slug
      ORDER BY t.slug
    `).all(),
  ]);
  const configuredOrigin = String(env.PUBLIC_SITE_ORIGIN || "").replace(/\/$/, "");
  const origin = configuredOrigin || new URL(request.url).origin;
  const rows = [
    ...documents.results.map((row: Record<string, unknown>) => ({
      path: String(row.path),
      updatedAt: row.updated_at ? String(row.updated_at) : null,
    })),
    { path: "/tags/", updatedAt: null },
    ...tags.results.map((row: Record<string, unknown>) => ({
      path: `/tags/${row.slug}/`,
      updatedAt: null,
    })),
  ];
  const uniqueRows = [...new Map(rows.map((row) => [row.path, row])).values()];
  const urls = uniqueRows.map(({ path, updatedAt }) => {
    const location = xml(new URL(path, `${origin}/`).href);
    const lastModified = updatedAt
      ? `\n    <lastmod>${xml(updatedAt.slice(0, 10))}</lastmod>`
      : "";
    return `  <url>\n    <loc>${location}</loc>${lastModified}\n  </url>`;
  });
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;

  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
};
