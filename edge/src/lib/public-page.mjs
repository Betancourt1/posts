import {
  RETIRED_ALTERNATE_MAIN_PATHS,
  legacyRouteForSitePath,
  sitePathForStoredRoute,
  storedRouteForSitePath,
} from "../../../functions/_lib/paths.js";
import {
  archiveMonthCounts,
  archiveItems,
  backlinks,
  documentTags,
  latestSyncTimestamp,
  navSections,
  normalizeRoute,
  homePosts,
  recentPosts,
  resolveDocument,
  sectionItems,
  tagIndex,
  tagResults,
} from "./content-queries.mjs";

const TAG_ROUTE = /^\/tags(?:\/([^/]+))?\/$/u;

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
    kind: match[1] ? "tag" : "tags",
    slug: match[1] ? decodeURIComponent(match[1]).normalize("NFC") : null,
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

async function siteChrome(db, archives = null, options = {}) {
  const [navigation, allArchives, updatedAt] = await Promise.all([
    navSections(db, { ...options, tags: false }),
    archives !== null
      ? Promise.resolve(archiveMonths(archives))
      : archiveMonthCounts(db, options),
    latestSyncTimestamp(db),
  ]);

  return {
    navigation,
    archiveMonths: allArchives,
    updatedAt,
  };
}

async function syntheticPage(db, route, options = {}) {
  const chromePromise = siteChrome(db, null, options);

  if (route.kind === "tags") {
    const [tags, chrome] = await Promise.all([tagIndex(db, options), chromePromise]);
    return {
      ...chrome,
      kind: "tags",
      path: route.path,
      title: "Tags",
      tags,
      page: null,
      layout: "tags",
    };
  }

  const [items, chrome] = await Promise.all([
    tagResults(db, route.slug, options),
    chromePromise,
  ]);
  if (!items.length) return null;

  const label = items[0]?.tagLabel || route.slug;
  const title = label ? label.charAt(0).toUpperCase() + label.slice(1) : label;
  return {
    ...chrome,
    kind: "tag",
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
  if (document.section === "lit") return "quotes";
  if (["guestbook", "visitas"].includes(document.section)) return "guestbook";
  if (document.section === "archives") return "archives";
  return "list";
}

export async function loadPublicPage(db, requestedPath, options = {}) {
  const path = normalizeRoute(requestedPath);
  if (path === "/es/" || path.startsWith("/es/tags/")) return { redirect: path.slice(3) };
  if (path.endsWith("/alternate/")) {
    const mainPath = path.slice(0, -"alternate/".length);
    if (RETIRED_ALTERNATE_MAIN_PATHS.includes(mainPath)) return { redirect: mainPath };
  }
  const synthetic = syntheticRoute(path);
  if (synthetic) return syntheticPage(db, synthetic, options);

  const readOptions = { ...options, tags: false };
  const storedPath = storedRouteForSitePath(path);
  const document = await resolveDocument(db, storedPath || path, readOptions)
    || (!storedPath && !path.startsWith("/es/") && !RETIRED_ALTERNATE_MAIN_PATHS.includes(path)
      ? await resolveDocument(db, legacyRouteForSitePath(path), readOptions)
      : null);
  if (!document) return null;

  const canonicalPath = sitePathForStoredRoute(document.canonicalPath);

  if (path !== canonicalPath) return { redirect: canonicalPath };

  const layout = layoutForDocument(document);
  const tagsPromise = documentTags(db, document.id);
  const archivePromise = layout === "archives"
    ? archiveItems(db, { ...options, tags: false })
    : Promise.resolve(null);
  const listItemOptions = layout === "list" && options.includeHiddenListItems
    ? { ...options, includeHidden: true }
    : options;
  const itemsPromise = layout === "home"
    ? homePosts(db)
    : ["list", "books", "photography", "quotes"].includes(layout)
      ? sectionItems(db, document.section, {
          ...(layout === "list" ? listItemOptions : options),
          body: ["list", "books"].includes(layout) && document.section !== "proyectos-profesionales",
        })
      : Promise.resolve([]);
  const recentItemsPromise = layout === "home"
    ? recentPosts(db, { ...options, limit: 10 })
    : Promise.resolve([]);
  const isSingleBook = layout === "single" && ["books", "libros"].includes(document.section);
  const backlinksPromise = layout === "single" && ["posts", "zettelkasten", "books", "libros"].includes(document.section)
    ? backlinks(db, document.id, options)
    : Promise.resolve([]);
  const relatedBooksPromise = isSingleBook
    ? sectionItems(db, document.section, { ...options, body: false, tags: false })
    : Promise.resolve([]);
  const guestbookPromise = layout === "guestbook"
    ? db.prepare("SELECT id, name, site, message, created_at FROM guestbook_entries ORDER BY created_at DESC LIMIT 200").all()
    : Promise.resolve({ results: [] });

  const [tags, archives, items, recentItems, linkedFrom, siblingBooks, guestbook] = await Promise.all([
    tagsPromise,
    archivePromise,
    itemsPromise,
    recentItemsPromise,
    backlinksPromise,
    relatedBooksPromise,
    guestbookPromise,
  ]);
  const relatedBooks = isSingleBook ? selectRelatedBooks(document, siblingBooks, 4) : [];
  const chrome = await siteChrome(db, archives, options);

  return {
    ...chrome,
    kind: document.kind,
    path,
    title: document.title,
    description: document.description || document.summary,
    layout,
    page: { ...document, path: canonicalPath, canonicalPath, tags, layout },
    items: archives || items,
    recentItems,
    backlinks: linkedFrom,
    relatedBooks,
    entries: guestbook.results || [],
  };
}

const RELATED_STATUS_SHELVES = new Set([
  "currently-reading",
  "to-read",
  "read",
  "leyendo",
  "por-leer",
  "leído",
  "leido",
]);

function bookTopicShelves(frontMatter) {
  if (!Array.isArray(frontMatter?.bookshelves)) return [];
  return frontMatter.bookshelves
    .map((shelf) => String(shelf || "").trim().toLocaleLowerCase("es"))
    .filter((shelf) => shelf && !RELATED_STATUS_SHELVES.has(shelf));
}

function selectRelatedBooks(document, candidates, limit = 4) {
  const author = String(document.frontMatter?.book_author || "").trim().toLocaleLowerCase("es");
  const shelves = new Set(bookTopicShelves(document.frontMatter));

  return candidates
    .filter((candidate) => candidate.id !== document.id && !candidate.hidden)
    .map((candidate) => {
      const candidateAuthor = String(candidate.frontMatter?.book_author || "").trim().toLocaleLowerCase("es");
      const candidateShelves = bookTopicShelves(candidate.frontMatter);
      let score = 0;
      if (author && candidateAuthor === author) score += 10;
      for (const shelf of candidateShelves) {
        if (shelves.has(shelf)) score += 3;
      }
      if (candidate.frontMatter?.rating) score += Number(candidate.frontMatter.rating) * 0.1;
      return { candidate, score };
    })
    .filter((entry) => entry.score >= 3)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((entry) => entry.candidate);
}

export async function loadNotFoundPage(db, path) {
  const chrome = await siteChrome(db);

  return {
    ...chrome,
    kind: "not-found",
    path: normalizeRoute(path),
    title: "Page not found",
    description: "The page you are looking for does not exist.",
    layout: "not-found",
    page: null,
  };
}
