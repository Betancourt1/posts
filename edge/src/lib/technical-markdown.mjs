import hljs from "highlight.js/lib/common";

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

// Interactive documents run in an opaque-origin sandbox, without access to the site.
function interactiveEmbed(source) {
  try {
    const { src, title, height = 480 } = JSON.parse(source);
    if (typeof src !== "string" || typeof title !== "string" || !title.trim()) return null;
    const url = new URL(src, "https://content.invalid");
    const local = src.startsWith("/visuals/") && url.origin === "https://content.invalid"
      && url.pathname.startsWith("/visuals/");
    if (!local && !/^https:\/\//i.test(src)) return null;
    if (url.username || url.password) return null;
    if (!Number.isInteger(height) || height < 240 || height > 960) return null;
    return `<figure class="technical-interactive"><iframe src="${escapeHtml(src)}" title="${escapeHtml(title)}" height="${height}" loading="lazy" sandbox="allow-scripts" referrerpolicy="no-referrer"></iframe><figcaption>${escapeHtml(title)}</figcaption></figure>\n`;
  } catch {
    return null;
  }
}

export function renderTechnicalCode(token) {
  const language = (token.lang || "").trim().split(/\s+/)[0].toLowerCase();
  const source = token.text || "";
  if (language === "mermaid") {
    return `<pre class="mermaid-source" data-mermaid><code>${escapeHtml(source)}</code></pre>\n`;
  }
  if (language === "interactive") {
    const embed = interactiveEmbed(source);
    if (embed) return embed;
  }
  const highlighted = hljs.getLanguage(language)
    ? hljs.highlight(source, { language, ignoreIllegals: true }).value
    : escapeHtml(source);
  const label = language ? ` data-language="${escapeHtml(language)}"` : "";
  return `<pre class="technical-code"${label}><code class="hljs">${highlighted}\n</code></pre>\n`;
}
