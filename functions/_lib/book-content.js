const BOOK_PATH_PATTERN = /^content_en\/books\/[^/]+\.md$/;
const BOOK_TAGS = new Set([
  "book",
  "libro",
  "read",
  "currently-reading",
  "to-read",
  "leído",
  "leyendo",
  "por-leer",
  "pendiente-de-leer",
]);

export function isBookContentPath(path) {
  return BOOK_PATH_PATTERN.test(String(path || ""));
}

function statusFromProgress(progress) {
  if (progress === 0) return "to-read";
  if (progress === 100) return "read";
  return "currently-reading";
}

function normalizeTags(tags, status) {
  const thematicTags = (Array.isArray(tags) ? tags : [])
    .map((tag) => String(tag).trim())
    .filter((tag) => tag && !BOOK_TAGS.has(tag));

  return ["book", status, ...thematicTags].filter(Boolean);
}

function bookSlug(path) {
  return String(path).split("/").pop().replace(/\.md$/, "");
}

export function normalizeBookFrontMatter(path, frontMatter, body) {
  if (!isBookContentPath(path)) return frontMatter;

  const markdown = String(body || "");
  const authorMatch = markdown.match(/^\*\*(?:Author|Autor):\*\*\s*(.*?)\s*$/mi);
  const progressMatch = markdown.match(/^\*\*(?:Progress|Progreso):\*\*\s*(.*?)\s*$/mi);
  const ratingMatch = markdown.match(/^\*\*(?:My rating|Mi calificación):\*\*\s*(.*?)\s*$/mi);

  if (authorMatch?.[1]) {
    frontMatter.book_author = authorMatch[1].trim();
  }
  if (!String(frontMatter.book_author || "").trim()) {
    throw new Error("El libro necesita autor.");
  }

  if (progressMatch) {
    const rawProgress = progressMatch[1].trim().toLowerCase();

    if (["not set", "sin registrar", "reading", "leyendo"].includes(rawProgress)) {
      frontMatter.book_status = "currently-reading";
      delete frontMatter.book_progress;
    } else {
      const percentMatch = rawProgress.match(/^(\d+)%$/);
      if (!percentMatch) {
        throw new Error("El progreso debe ser un porcentaje entre 0% y 100%.");
      }

      const progress = Number(percentMatch[1]);
      if (progress < 0 || progress > 100) {
        throw new Error("El progreso debe ser un porcentaje entre 0% y 100%.");
      }

      frontMatter.book_progress = progress;
      frontMatter.book_status = statusFromProgress(progress);
    }
  }

  if (!frontMatter.book_status) {
    throw new Error("El libro necesita progreso.");
  }

  if (ratingMatch) {
    const rawRating = ratingMatch[1].trim();
    if (!rawRating) {
      delete frontMatter.rating;
    } else {
      const parsedRating = rawRating.match(/^([1-5])(?:\/5)?$/);
      if (!parsedRating) {
        throw new Error("La calificación debe estar entre 1 y 5.");
      }
      frontMatter.rating = Number(parsedRating[1]);
    }
  }

  const statusLabel = {
    read: "Read",
    "currently-reading": "Reading",
    "to-read": "Want to read",
  }[frontMatter.book_status];
  const summaryParts = [
    `By ${frontMatter.book_author}`,
    statusLabel,
  ];

  if (frontMatter.rating) summaryParts.push(`${frontMatter.rating}/5`);

  frontMatter.summary = summaryParts.filter(Boolean).join(" · ");
  frontMatter.tags = normalizeTags(frontMatter.tags, frontMatter.book_status);
  frontMatter.translationKey ||= `book-${bookSlug(path)}`;

  return frontMatter;
}
