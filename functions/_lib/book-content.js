import { projectionSourcePath } from "./content-storage.js";

const BOOK_PATH_PATTERN = /^content(?:_en)?\/books\/(?!_index\.md$)[^/]+\.md$/;
const AUTHOR_LINE = /^\*\*(?:Author|Autor):\*\*[ \t]*(.*)$/mi;
const PROGRESS_LINE = /^\*\*(?:Progress|Progreso):\*\*[ \t]*(.*)$/mi;
const STATUS_LINE = /^\*\*(?:Status|Estado):\*\*[ \t]*(.*)$/mi;
const RATING_LINE = /^\*\*(?:My rating|Mi calificación):\*\*[ \t]*(.*)$/mi;
const RATING_LINE_WITH_BREAK = /^\*\*(?:My rating|Mi calificación):\*\*.*(?:\n|$)/mi;
const REVIEW_SECTION = /^## (?:My review|Mi reseña)[ \t]*\n([\s\S]*?)(?=^#{1,2}[ \t]|(?![\s\S]))/m;
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
  return BOOK_PATH_PATTERN.test(projectionSourcePath(String(path || "")));
}

export function readBookReading(frontMatter, body) {
  return {
    progress: String(frontMatter.book_progress ?? (frontMatter.book_status === "read" ? 100 : frontMatter.book_status === "to-read" ? 0 : "")),
    rating: String(frontMatter.rating ?? ""),
    review: body.match(REVIEW_SECTION)?.[1].trim() || "",
  };
}

export function createBookBody({ author, ...reading }) {
  const name = typeof author === "string" ? author.trim() : "";
  if (!name || /[\r\n]/.test(name)) throw new Error("A book author is required.");
  return updateBookReading({}, `**Author:** ${name}\n**Progress:** not set\n`, reading);
}

export function updateBookReading(frontMatter, body, reading) {
  const previous = readBookReading(frontMatter, body);
  const { progress = previous.progress, rating = previous.rating } = reading;
  const review = String(reading.review ?? previous.review).replace(/\r\n/g, "\n").trim();
  if (typeof progress !== "string" || !/^(?:100|[1-9]?\d)?$/.test(progress)) {
    throw new Error("Progress must be a whole percentage between 0% and 100%.");
  }
  if (typeof rating !== "string" || !/^[1-5]?$/.test(rating)) {
    throw new Error("The rating must be between 1 and 5.");
  }

  const sectionStart = body.search(/^##[ \t]/m);
  const endOfHeader = sectionStart === -1 ? body.length : sectionStart;
  let header = body.slice(0, endOfHeader);
  let sections = body.slice(endOfHeader);

  if (progress !== previous.progress) {
    const line = `**Progress:** ${progress === "" ? "not set" : `${progress}%`}`;
    const pattern = PROGRESS_LINE.test(header) ? PROGRESS_LINE : STATUS_LINE;
    header = pattern.test(header) ? header.replace(pattern, line) : insertBookLine(header, AUTHOR_LINE, line);
  }
  if (rating !== previous.rating) {
    const line = rating ? `**My rating:** ${rating}/5` : "";
    if (RATING_LINE.test(header)) {
      header = header.replace(rating ? RATING_LINE : RATING_LINE_WITH_BREAK, line);
    } else if (line) {
      const after = PROGRESS_LINE.test(header) ? PROGRESS_LINE : STATUS_LINE.test(header) ? STATUS_LINE : AUTHOR_LINE;
      header = insertBookLine(header, after, line);
    }
    if (!rating) delete frontMatter.rating;
  }
  if (review !== previous.review) {
    if (/^#{1,2}[ \t]/m.test(review)) {
      throw new Error("Use level-three headings or smaller in the review.");
    }
    const section = review ? `## My review\n\n${review}\n\n` : "";
    sections = REVIEW_SECTION.test(sections)
      ? sections.replace(REVIEW_SECTION, () => section)
      : `${sections.trimEnd()}${sections.trim() ? "\n\n" : ""}${section}`;
    if (sections && header && !header.endsWith("\n\n")) header = `${header.trimEnd()}\n\n`;
  }
  return header + sections;
}

function insertBookLine(header, anchor, line) {
  return anchor.test(header) ? header.replace(anchor, (match) => `${match}\n${line}`) : `${line}\n${header}`;
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

export function normalizeBookFrontMatter(path, frontMatter, body) {
  if (!isBookContentPath(path)) return frontMatter;

  const markdown = String(body || "").split(/^##[ \t]/m, 1)[0];
  const authorMatch = markdown.match(AUTHOR_LINE);
  const progressMatch = markdown.match(PROGRESS_LINE);
  const ratingMatch = markdown.match(RATING_LINE);

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
        throw new Error("The rating must be between 1 and 5.");
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

  return frontMatter;
}
