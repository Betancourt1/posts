export function contentExcerpt(document) {
  const frontMatter = document.frontMatter || {};
  let text = document.summary || document.description || "";
  if (["books", "libros"].includes(document.section)) {
    const status = document.lang === "es"
      ? { "currently-reading": "Leyendo ahora", read: "Leído", "to-read": "Por leer" }
      : { "currently-reading": "Now reading", read: "Read", "to-read": "Want to read" };
    return [frontMatter.book_author, status[frontMatter.book_status]].filter(Boolean).join(" · ");
  }
  if (!text) {
    text = String(document.bodyText || "").trim();
    const heading = String(document.bodyMarkdown || "").trimStart().match(/^#\s+([^\n]+)(?:\n|$)/);
    if (heading?.[1].trim() === document.title && text.startsWith(document.title)) {
      text = text.slice(document.title.length).trim();
    }
  }
  text = String(text).replace(/\s+/g, " ").trim();
  return text.length > 240 ? text.slice(0, 237).replace(/\s+\S*$/, "") + "…" : text;
}
