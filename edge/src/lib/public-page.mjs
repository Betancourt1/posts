import {
  archiveItems,
  backlinks,
  documentTags,
  latestSyncTimestamp,
  navSections,
  normalizeRoute,
  recentPosts,
  resolveDocument,
  sectionItems,
  tagIndex,
  tagResults,
  translationPeer,
} from "./content-queries.mjs";

const TAG_ROUTE = /^(\/es)?\/tags(?:\/([^/]+))?\/$/u;

export function languageForRoute(path) {
  return normalizeRoute(path).startsWith("/es/") ? "es" : "en";
}

export function publicPathForAdminRoute(path) {
  const normalized = normalizeRoute(path);
  if (normalized === "/admin/") return "/";
  if (!normalized.startsWith("/admin/")) return normalized;
  return normalizeRoute(normalized.slice("/admin".length));
}

export function adminPathForPublicRoute(path) {
  const normalized = normalizeRoute(path);
  return normalized === "/" ? "/admin/" : `/admin${normalized}`;
}

export function syntheticRoute(path) {
  const normalized = normalizeRoute(path);
  const match = normalized.match(TAG_ROUTE);

  if (!match) return null;

  return {
    kind: match[2] ? "tag" : "tags",
    lang: match[1] ? "es" : "en",
    slug: match[2] ? decodeURIComponent(match[2]).normalize("NFC") : null,
    path: normalized,
  };
}

export function archiveMonths(items) {
  const counts = new Map();

  for (const item of items) {
    const month = String(item.date || "").slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) continue;
    counts.set(month, (counts.get(month) || 0) + 1);
  }

  return [...counts].slice(0, 12).map(([key, count]) => ({ key, count }));
}

async function siteChrome(db, lang, archives = null, options = {}) {
  const [navigation, allArchives, updatedAt] = await Promise.all([
    navSections(db, lang, options),
    archives ? Promise.resolve(archives) : archiveItems(db, lang, options),
    latestSyncTimestamp(db),
  ]);

  return {
    navigation,
    archiveMonths: archiveMonths(allArchives),
    updatedAt,
  };
}

async function syntheticPage(db, route, options = {}) {
  const chromePromise = siteChrome(db, route.lang, null, options);

  if (route.kind === "tags") {
    const [tags, chrome] = await Promise.all([tagIndex(db, route.lang, options), chromePromise]);
    return {
      ...chrome,
      kind: "tags",
      lang: route.lang,
      path: route.path,
      title: "Tags",
      tags,
      page: null,
      layout: "tags",
    };
  }

  const [items, chrome] = await Promise.all([
    tagResults(db, route.lang, route.slug, options),
    chromePromise,
  ]);
  if (!items.length) return null;

  const label = items[0]?.tagLabel || route.slug;
  const title = label ? label.charAt(0).toLocaleUpperCase(route.lang) + label.slice(1) : label;
  return {
    ...chrome,
    kind: "tag",
    lang: route.lang,
    path: route.path,
    title,
    tag: { label, slug: route.slug },
    items,
    page: null,
    layout: "tag",
  };
}

export function layoutForDocument(document) {
  if (document.kind === "home") return "home";
  if (document.kind === "page") return "single";
  if (["books", "libros"].includes(document.section)) return "books";
  if (document.section === "fotografia") return "photography";
  if (document.section === "proyectos-profesionales") return "code";
  if (document.section === "lit") return "quotes";
  if (["guestbook", "visitas"].includes(document.section)) return "guestbook";
  if (document.section === "archives") return "archives";
  return "list";
}

export async function loadPublicPage(db, requestedPath, options = {}) {
  const path = normalizeRoute(requestedPath);
  const synthetic = syntheticRoute(path);
  if (synthetic) return syntheticPage(db, synthetic, options);

  const document = await resolveDocument(db, path, options);
  if (!document) return null;

  if (document.routeKind === "alias") {
    return { redirect: document.canonicalPath };
  }

  const layout = layoutForDocument(document);
  const tagsPromise = documentTags(db, document.id);
  const translationPromise = translationPeer(db, document.id, options);
  const archivePromise = layout === "archives"
    ? archiveItems(db, document.lang, options)
    : Promise.resolve(null);
  const itemsPromise = layout === "home"
    ? recentPosts(db, document.lang, { ...options, limit: 10 })
    : ["list", "books", "photography", "code", "quotes"].includes(layout)
      ? sectionItems(db, document.lang, document.section, { ...options, body: ["list", "books"].includes(layout) })
      : Promise.resolve([]);
  const backlinksPromise = layout === "single" && ["posts", "zettelkasten"].includes(document.section)
    ? backlinks(db, document.id, options)
    : Promise.resolve([]);
  const guestbookPromise = layout === "guestbook"
    ? db.prepare("SELECT id, name, site, message, created_at FROM guestbook_entries ORDER BY created_at DESC LIMIT 200").all()
    : Promise.resolve({ results: [] });

  const [tags, translation, archives, items, linkedFrom, guestbook] = await Promise.all([
    tagsPromise,
    translationPromise,
    archivePromise,
    itemsPromise,
    backlinksPromise,
    guestbookPromise,
  ]);
  const chrome = await siteChrome(db, document.lang, archives, options);

  return {
    ...chrome,
    kind: document.kind,
    lang: document.lang,
    path,
    title: document.title,
    description: document.description || document.summary,
    layout,
    page: { ...document, tags, layout },
    translationPath: translation?.canonicalPath || translation?.path || null,
    items: archives || items,
    backlinks: linkedFrom,
    entries: guestbook.results || [],
  };
}

export async function loadNotFoundPage(db, path) {
  const lang = languageForRoute(path);
  const chrome = await siteChrome(db, lang);

  return {
    ...chrome,
    kind: "not-found",
    lang,
    path: normalizeRoute(path),
    title: lang === "es" ? "Página no encontrada" : "Page not found",
    description: lang === "es"
      ? "La página que buscas no existe."
      : "The page you are looking for does not exist.",
    layout: "not-found",
    page: null,
  };
}
