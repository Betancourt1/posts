import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  adminPathForPublicRoute,
  archiveMonths,
  layoutForDocument,
  languageForRoute,
  publicPathForAdminRoute,
  syntheticRoute,
} from "../src/lib/public-page.mjs";

const publicPagePath = new URL("../src/views/PublicPage.astro", import.meta.url);
const siteLayoutPath = new URL("../src/layouts/SiteLayout.astro", import.meta.url);
const singlePath = new URL("../src/components/Single.astro", import.meta.url);
const infrastructurePath = new URL("../client/infrastructure.js", import.meta.url);
const quotesPath = new URL("../src/components/Quotes.astro", import.meta.url);
const sidebarPath = new URL("../src/components/Sidebar.astro", import.meta.url);
const siteCssPath = new URL("../../static/css/site.css", import.meta.url);

test("maps arbitrary admin content routes to their public D1 route", () => {
  assert.equal(publicPathForAdminRoute("/admin/"), "/");
  assert.equal(publicPathForAdminRoute("/admin/es/fotografia/"), "/es/fotografia/");
  assert.equal(
    publicPathForAdminRoute("/admin/es/fotografia/una-arana-a-punto-de-comer/"),
    "/es/fotografia/una-arana-a-punto-de-comer/",
  );
  assert.equal(adminPathForPublicRoute("/"), "/admin/");
  assert.equal(adminPathForPublicRoute("/es/fotografia/"), "/admin/es/fotografia/");
});

test("recognizes localized tag routes without swallowing normal pages", () => {
  assert.deepEqual(syntheticRoute("/tags/"), {
    kind: "tags",
    lang: "en",
    slug: null,
    path: "/tags/",
  });
  assert.deepEqual(syntheticRoute("/es/tags/%C3%A9tica"), {
    kind: "tag",
    lang: "es",
    slug: "ética",
    path: "/es/tags/ética/",
  });
  assert.equal(syntheticRoute("/es/posts/"), null);
});

test("derives language and recent archive counts from runtime rows", () => {
  assert.equal(languageForRoute("/"), "en");
  assert.equal(languageForRoute("/es/posts/example/"), "es");
  assert.deepEqual(
    archiveMonths([
      { date: "2026-07-14" },
      { date: "2026-07-01" },
      { date: "2026-06-02" },
      { date: null },
    ]),
    [
      { key: "2026-07", count: 2 },
      { key: "2026-06", count: 1 },
    ],
  );
});

test("single pages avoid duplicating a Markdown H1", async () => {
  const [publicPage, single] = await Promise.all([
    readFile(publicPagePath, "utf8"),
    readFile(singlePath, "utf8"),
  ]);

  assert.match(publicPage, /titleInBody=\{\/\^\\s\*#\\s\+\\S\/m\.test\(page\.bodyMarkdown \|\| ""\)\}/);
  assert.match(single, /\{!titleInBody && <h1 class="post-title"/);
});

test("the production shell does not offer or restore raw article mode", async () => {
  const [layout, infrastructure] = await Promise.all([
    readFile(siteLayoutPath, "utf8"),
    readFile(infrastructurePath, "utf8"),
  ]);

  assert.doesNotMatch(layout, /id="infra-toggle"/);
  assert.doesNotMatch(infrastructure, /infra_mode_enabled|initMode/);
});

test("distinguishes grayscale from the light and dark theme control", async () => {
  const layout = await readFile(siteLayoutPath, "utf8");

  assert.match(layout, /class="palette-off-icon"/);
  assert.doesNotMatch(layout, /class="grayscale-icon"|M12 2a10 10 0 0 1 0 20V2z/);
  assert.match(layout, /data-label-enable=\{lang === "es" \? "Activar escala de grises" : "Enable grayscale"\}/);
  assert.match(layout, /data-label-dark=\{lang === "es" \? "Cambiar a tema oscuro" : "Change to dark theme"\}/);
  assert.match(layout, /grayscaleToggle\.setAttribute\("aria-pressed", enabled \? "true" : "false"\)/);
  assert.match(layout, /themeToggle\.setAttribute\("title", label\)/);
});

test("keeps the Citas title in Spanish notebook navigation", async () => {
  const source = await readFile(publicPagePath, "utf8");

  assert.match(source, /\["Citas", "\/es\/lit\/", "lit"\]/);
  assert.doesNotMatch(source, /\["Lecturas", "\/es\/lit\/", "lit"\]/);
});

test("routes the quote notebook to its dedicated layout", () => {
  assert.equal(layoutForDocument({ kind: "section", section: "lit" }), "quotes");
  assert.equal(layoutForDocument({ kind: "section", section: "posts" }), "list");
});

test("keeps the quote archive inside the standard site shell", async () => {
  const [publicPage, layout, sidebar, css] = await Promise.all([
    readFile(publicPagePath, "utf8"),
    readFile(siteLayoutPath, "utf8"),
    readFile(sidebarPath, "utf8"),
    readFile(siteCssPath, "utf8"),
  ]);

  assert.match(layout, /<p class="site-title"><a href=\{homePath\}>\{siteTitle\}<\/a><\/p>/);
  assert.match(layout, /authorMode \? "author-mode" : ""/);
  assert.match(layout, /<aside class="column nav-column">[\s\S]*?<Nav items=\{navigation\}/);
  assert.doesNotMatch(layout, /quotes-header-navigation|friendlyArchiveLabels|\{!isQuotes/);
  assert.doesNotMatch(publicPage, /layout === "quotes" \? null|quoteNavigationSections/);
  assert.match(sidebar, />\{month\.key\}<\/a>/);

  for (const selector of [
    ".layout.layout--quotes-index",
    ".quotes-index-page .site-header",
    ".quotes-index-page .sidebar-column",
    ".quotes-index-page .site-footer",
    ".quotes-index-page .ssh-terminal-open-btn",
  ]) {
    assert.equal(css.includes(selector), false, `${selector} must not override the shared shell`);
  }
});

test("renders every complete quote in the central mosaic", async () => {
  const [quotes, css] = await Promise.all([
    readFile(quotesPath, "utf8"),
    readFile(siteCssPath, "utf8"),
  ]);

  assert.match(quotes, /<header class="quotes-page-header">[\s\S]*class="quotes-order"[\s\S]*<\/header>/);
  assert.match(quotes, /data-length=\{quote\.text\.length\}/);
  assert.match(quotes, /data-sequence=\{index\}/);
  assert.match(quotes, /<a class="quote-index-text" href=\{quote\.href\}>\{quote\.text\}<\/a>/);
  assert.match(quotes, /Number\(value\(left, "data-sequence"\)\) - Number\(value\(right, "data-sequence"\)\)/);
  assert.doesNotMatch(css, /\.quote-index-text\s*\{[^}]*?(?:line-clamp|text-overflow|overflow:\s*hidden)/s);
  assert.match(css, /\.quote-index-text\s*\{[^}]*white-space:\s*pre-line/s);
  assert.match(css, /\.content-column--quotes-index \.content-inner\s*\{[^}]*max-width:\s*none/s);
});
