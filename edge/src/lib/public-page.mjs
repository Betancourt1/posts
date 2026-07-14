import {
  archiveItems,
  backlinks,
  documentTags,
  navSections,
  normalizeRoute,
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

async function siteChrome(db, lang, archives = null) {
  const [navigation, allArchives] = await Promise.all([
    navSections(db, lang),
    archives ? Promise.resolve(archives) : archiveItems(db, lang),
  ]);

  return {
    navigation,
    archiveMonths: archiveMonths(allArchives),
  };
}

async function syntheticPage(db, route) {
  const chromePromise = siteChrome(db, route.lang);

  if (route.kind === "tags") {
    const [tags, chrome] = await Promise.all([tagIndex(db, route.lang), chromePromise]);
    return {
      ...chrome,
      kind: "tags",
      lang: route.lang,
      path: route.path,
      title: route.lang === "es" ? "Etiquetas" : "Tags",
      tags,
      page: null,
      layout: "tags",
    };
  }

  const [items, chrome] = await Promise.all([
    tagResults(db, route.lang, route.slug),
    chromePromise,
  ]);
  if (!items.length) return null;

  const label = items[0]?.tagLabel || route.slug;
  return {
    ...chrome,
    kind: "tag",
    lang: route.lang,
    path: route.path,
    title: `#${label}`,
    tag: { label, slug: route.slug },
    items,
    page: null,
    layout: "tag",
  };
}

function layoutForDocument(document) {
  if (document.kind === "home") return "home";
  if (document.kind === "page") return "single";
  if (["books", "libros"].includes(document.section)) return "books";
  if (document.section === "fotografia") return "photography";
  if (document.section === "proyectos-profesionales") return "code";
  if (document.section === "archives") return "archives";
  return "list";
}

export async function loadPublicPage(db, requestedPath) {
  const path = normalizeRoute(requestedPath);
  const synthetic = syntheticRoute(path);
  if (synthetic) return syntheticPage(db, synthetic);

  const document = await resolveDocument(db, path);
  if (!document) return null;

  if (document.routeKind === "alias") {
    return { redirect: document.canonicalPath };
  }

  const layout = layoutForDocument(document);
  const tagsPromise = documentTags(db, document.id);
  const translationPromise = translationPeer(db, document.id);
  const archivePromise = layout === "archives"
    ? archiveItems(db, document.lang)
    : Promise.resolve(null);
  const itemsPromise = ["list", "books", "photography", "code"].includes(layout)
    ? sectionItems(db, document.lang, document.section)
    : Promise.resolve([]);
  const backlinksPromise = layout === "single" && ["posts", "zettelkasten"].includes(document.section)
    ? backlinks(db, document.id)
    : Promise.resolve([]);

  const [tags, translation, archives, items, linkedFrom] = await Promise.all([
    tagsPromise,
    translationPromise,
    archivePromise,
    itemsPromise,
    backlinksPromise,
  ]);
  const chrome = await siteChrome(db, document.lang, archives);

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
