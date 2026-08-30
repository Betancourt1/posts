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
const searchPath = new URL("../client/search.js", import.meta.url);
const soundPath = new URL("../client/sound.js", import.meta.url);
const graphPath = new URL("../../static/js/knowledge-graph.js", import.meta.url);
const quotesPath = new URL("../src/components/Quotes.astro", import.meta.url);
const archivesPath = new URL("../src/components/Archives.astro", import.meta.url);
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

test("uses a pipette for grayscale and keeps search inline", async () => {
  const [layout, css, search] = await Promise.all([
    readFile(siteLayoutPath, "utf8"),
    readFile(siteCssPath, "utf8"),
    readFile(searchPath, "utf8"),
  ]);

  assert.match(layout, /class="header-display-icon pipette-icon"[\s\S]*?m12 9-8\.414 8\.414[\s\S]*?m18 9 \.4\.4[\s\S]*?m2 22 \.414-\.414/);
  assert.match(layout, /class="header-display-icon theme-contrast-icon"[\s\S]*?<circle cx="12" cy="12" r="10"><\/circle><path d="M12 2a10 10 0 0 1 0 20V2z" fill="currentColor"><\/path>/);
  assert.doesNotMatch(layout, /palette-off-icon|theme-icon-wrapper|sun-icon|moon-icon/);
  assert.match(css, /\.header-display-icon\s*\{[\s\S]*?width:\s*17px;[\s\S]*?height:\s*17px;/);
  assert.match(css, /\.sound-icon\s*\{[\s\S]*?width:\s*20px;[\s\S]*?height:\s*20px;/);
  assert.doesNotMatch(css, /\.theme-icon-wrapper|\.sun-icon|\.moon-icon/);
  assert.match(layout, /data-label-enable=\{lang === "es" \? "Activar escala de grises" : "Enable grayscale"\}/);
  assert.match(layout, /data-label-dark=\{lang === "es" \? "Cambiar a tema oscuro" : "Change to dark theme"\}/);
  assert.match(layout, /grayscaleToggle\.setAttribute\("aria-pressed", enabled \? "true" : "false"\)/);
  assert.match(layout, /themeToggle\.setAttribute\("title", label\)/);
  assert.doesNotMatch(css, /html\.grayscale-mode\s*\{[^}]*filter:/s);
  assert.match(css, /html\.grayscale-mode body > :not\(\.site-header\),[\s\S]*?\.site-header > :not\(\.site-header-actions\)\s*\{[\s\S]*?filter:\s*grayscale\(100%\)/);
  assert.match(css, /\.sidebar-column\s*\{\s*top:\s*78px;/);
  const actionsStart = layout.indexOf('<div class="site-header-actions">');
  const actionsEnd = layout.indexOf("\n      </div>", actionsStart);
  const searchStart = layout.indexOf('<div class="site-header-search" id="search">');
  assert.ok(actionsStart >= 0 && actionsEnd > actionsStart && searchStart > actionsEnd);
  assert.match(layout, /<form class="search-ui__form" role="search">/);
  assert.match(layout, /<input class="search-ui__search-input" id="site-search-input" type="search"/);
  assert.match(layout, /placeholder=\{lang === "es" \? "buscar en el archivo" : "search the archive"\}/);
  assert.match(layout, /<svg class="search-command-icon"/);
  assert.match(layout, /<kbd class="search-kbd">Ctrl K<\/kbd>/);
  assert.match(layout, /<div class="search-ui__drawer" id="site-search-results" hidden>/);
  assert.doesNotMatch(layout, /search-trigger|search-modal/);
  assert.match(css, /\.site-header-search\s*\{[\s\S]*?justify-content:\s*center;[\s\S]*?width:\s*min\(20rem, 100%\);[\s\S]*?margin:\s*10px auto 0;/);
  assert.match(css, /\.search-ui__form\s*\{[\s\S]*?width:\s*100%;[\s\S]*?border-bottom:\s*1px solid var\(--line\);/);
  assert.match(css, /\.search-ui__search-input\s*\{[\s\S]*?border:\s*0;[\s\S]*?padding:\s*0;[\s\S]*?background:\s*transparent;/);
  assert.doesNotMatch(css, /\.search-ui__search-input\s*\{[^}]*border-left:/s);
  assert.match(css, /\.search-ui__drawer\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?top:\s*calc\(100% \+ 8px\);/);
  assert.match(css, /\.search-kbd\s*\{[\s\S]*?border:\s*0;[\s\S]*?background:\s*transparent;/);
  assert.match(css, /@media \(max-width: 720px\)\s*\{[\s\S]*?\.search-kbd\s*\{\s*display:\s*none;/);
  assert.doesNotMatch(css, /search-modal|body\.search-active/);
  assert.doesNotMatch(search, /setupModal|search-trigger|search-modal/);
  assert.match(search, /root\.dataset\.searchEndpoint \|\| "\/api\/search"/);
  assert.match(search, /url\.searchParams\.set\("lang", lang\)/);
  assert.match(search, /url\.searchParams\.set\("limit", "20"\)/);
  assert.match(search, /\(event\.ctrlKey \|\| event\.metaKey\).*event\.key\.toLowerCase\(\) === "k"/);
  assert.match(search, /event\.key === "Escape"[\s\S]*?clearSearch\(view, copy\)/);
});

test("keeps interaction sounds opt-in, synthesized, and public-only", async () => {
  const [layout, css, search, sound, graph] = await Promise.all([
    readFile(siteLayoutPath, "utf8"),
    readFile(siteCssPath, "utf8"),
    readFile(searchPath, "utf8"),
    readFile(soundPath, "utf8"),
    readFile(graphPath, "utf8"),
  ]);

  assert.match(layout, /!authorMode && \(\s*<button class="sound-toggle" id="sound-toggle"/);
  assert.match(layout, /aria-pressed="false"[\s\S]*?data-label-enable=\{lang === "es" \? "Activar sonidos" : "Enable sounds"\}/);
  assert.match(layout, /!authorMode && <script is:inline src="\/js\/sound\.js" defer><\/script>/);
  assert.match(css, /\.theme-toggle,\s*\.grayscale-toggle,\s*\.sound-toggle,[\s\S]*?width:\s*40px;[\s\S]*?height:\s*40px;/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.sound-toggle,[\s\S]*?width:\s*44px !important;[\s\S]*?height:\s*44px !important;/);
  assert.match(sound, /var enabled = false;/);
  assert.match(sound, /var gestureReady = false;/);
  assert.match(sound, /if \(!event\.isTrusted\) return;/);
  assert.match(sound, /document\.addEventListener\("click",[\s\S]*?target === toggle[\s\S]*?"control" : "navigation"/);
  assert.match(sound, /\.sidebar-list a\[href\*='\/archives\/'\],[\s\S]*?\.sidebar-more\[href\*='\/archives\/'\],[\s\S]*?\.archive-list \.archive-item > a/);
  assert.match(sound, /localStorage\.getItem\(STORAGE_KEY\) === "true"/);
  assert.match(sound, /window\.AudioContext \|\| window\.webkitAudioContext/);
  assert.equal((sound.match(/^    [a-zA-Z]+: \{ start:/gm) || []).length, 4);
  assert.match(sound, /var secondary = context\.createOscillator\(\)/);
  assert.match(sound, /oscillator\.connect\(gain\);\s*secondary\.connect\(gain\);\s*gain\.connect\(context\.destination\)/);
  assert.match(sound, /exponentialRampToValueAtTime\(tone\.gain, now \+ 0\.002\)/);
  assert.match(sound, /secondary\.stop\(now \+ tone\.duration \+ 0\.004\)/);
  assert.doesNotMatch(sound, /mouseenter|mouseover|\.mp3|\.wav|new Audio\(/);
  assert.match(search, /CustomEvent\("site-sound", \{ detail: \{ tone: "searchResults" \} \}\)/);
  assert.match(graph, /CustomEvent\("site-sound", \{ detail: \{ tone: "navigation" \} \}\)[\s\S]*?window\.location\.assign\(node\.url\)/);
});

test("keeps the Citas title in Spanish notebook navigation", async () => {
  const source = await readFile(publicPagePath, "utf8");

  assert.match(source, /\["Citas", "\/es\/lit\/", "lit"\]/);
  assert.doesNotMatch(source, /\["Lecturas", "\/es\/lit\/", "lit"\]/);
  assert.match(source, /\["Quotes", "\/lit\/", "lit"\]/);
});

test("keeps Code as the only project identity in bilingual navigation and archives", async () => {
  const [publicPage, archives] = await Promise.all([
    readFile(publicPagePath, "utf8"),
    readFile(archivesPath, "utf8"),
  ]);

  assert.match(publicPage, /\["Código", "\/es\/proyectos-profesionales\/", "proyectos-profesionales"\]/);
  assert.match(publicPage, /\["Code", "\/proyectos-profesionales\/", "proyectos-profesionales"\]/);
  assert.doesNotMatch(publicPage, /proyectos-academicos|Academic|Académico/);
  assert.match(archives, /"proyectos-profesionales": lang === "es" \? "Código" : "Code"/);
  assert.doesNotMatch(archives, /proyectos-academicos|Academic|Académic/);
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

test("renders the recent posts feed on the home page below the headerless knowledge graph", async () => {
  const source = await readFile(publicPagePath, "utf8");
  const knowledgeGraph = await readFile(new URL("../src/components/KnowledgeGraph.astro", import.meta.url), "utf8");

  assert.match(source, /<KnowledgeGraph[\s\S]*?class="home-section home-feed"/);
  assert.match(source, /\{lang === "es" \? "Reciente" : "Recent"\}/);
  assert.match(source, /archive-badge--\$\{item\.section\}/);
  assert.doesNotMatch(knowledgeGraph, /<h2>\{copy\.title\}<\/h2>/);
  assert.doesNotMatch(knowledgeGraph, /class:list=\{\["knowledge-graph-hint"/);
});
