function decodeQuoted(raw) {
  const inner = raw.slice(1, -1);
  if (raw.startsWith('"')) {
    // formatMarkdown uses double-quoted YAML strings with JSON-compatible escapes.
    try { return JSON.parse(raw); } catch { return inner.replace(/\\(["\\])/g, "$1"); }
  }
  return inner.replace(/''/g, "'");
}

// Splits the inside of an inline array on commas that are not inside quotes.
// Returns null when the quoting is malformed so callers can fall back.
function splitInlineArray(inner) {
  const items = [];
  let index = 0;

  while (index < inner.length) {
    while (index < inner.length && /\s/.test(inner[index])) index += 1;
    if (index >= inner.length) break;

    const quote = inner[index];
    if (quote === '"' || quote === "'") {
      let end = index + 1;
      for (; end < inner.length; end += 1) {
        if (quote === '"' && inner[end] === "\\") { end += 1; continue; }
        if (inner[end] !== quote) continue;
        if (quote === "'" && inner[end + 1] === "'") { end += 1; continue; }
        break;
      }
      if (end >= inner.length) return null;

      let next = end + 1;
      while (next < inner.length && /\s/.test(inner[next])) next += 1;
      if (next < inner.length && inner[next] !== ",") return null;

      items.push(decodeQuoted(inner.slice(index, end + 1)));
      index = next + 1;
      continue;
    }

    let end = inner.indexOf(",", index);
    if (end === -1) end = inner.length;
    items.push(inner.slice(index, end).trim());
    index = end + 1;
  }

  return items.filter(Boolean);
}

export function parseScalar(value) {
  const trimmed = String(value || "").trim();

  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 1) {
    return decodeQuoted(trimmed);
  }
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "[]") return [];
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1);
    return splitInlineArray(inner) ?? inner
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length > 1) {
    return decodeQuoted(trimmed);
  }

  return trimmed;
}

export function splitMarkdown(text) {
  const normalized = String(text || "").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");

  if (!normalized.startsWith("---\n")) {
    return { frontMatter: {}, body: normalized };
  }

  const end = normalized.indexOf("\n---", 4);

  if (end === -1) {
    return { frontMatter: {}, body: normalized };
  }

  const rawFrontMatter = normalized.slice(4, end).trim();
  const body = normalized.slice(end + 4).replace(/^\n/, "");
  const frontMatter = {};

  const frontMatterLines = rawFrontMatter.split("\n");

  for (let index = 0; index < frontMatterLines.length; index += 1) {
    const line = frontMatterLines[index];
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);

    if (match) {
      const [, key, value] = match;

      if (value === "" && /^\s+-\s+/.test(frontMatterLines[index + 1] || "") && !/^\s+-\s+[A-Za-z0-9_-]+:(\s|$)/.test(frontMatterLines[index + 1])) {
        const items = [];
        index += 1;
        for (; index < frontMatterLines.length; index += 1) {
          const scalar = frontMatterLines[index].match(/^\s+-\s+(.*)$/);
          if (!scalar) { index -= 1; break; }
          items.push(parseScalar(scalar[1]));
        }
        frontMatter[key] = items;
        continue;
      }

      if (value === "" && /^\s+-\s+/.test(frontMatterLines[index + 1] || "")) {
        const items = [];
        let current = null;

        index += 1;

        for (; index < frontMatterLines.length; index += 1) {
          const itemMatch = frontMatterLines[index].match(/^\s+-\s+([A-Za-z0-9_-]+):\s*(.*)$/);
          const propertyMatch = frontMatterLines[index].match(/^\s{4}([A-Za-z0-9_-]+):\s*(.*)$/);

          if (itemMatch) {
            current = {};
            current[itemMatch[1]] = parseScalar(itemMatch[2]);
            items.push(current);
            continue;
          }

          if (propertyMatch && current) {
            current[propertyMatch[1]] = parseScalar(propertyMatch[2]);
            continue;
          }

          index -= 1;
          break;
        }

        frontMatter[key] = items;
        continue;
      }

      frontMatter[key] = parseScalar(value);
    }
  }

  return { frontMatter, body };
}

function quoteYaml(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function formatYamlValue(value, key) {
  if (Array.isArray(value)) {
    if (value.some((item) => item && typeof item === "object" && !Array.isArray(item))) {
      return [
        "",
        ...value.flatMap((item) => {
          const entries = Object.entries(item || {}).filter(([, itemValue]) => itemValue !== undefined && itemValue !== null);

          if (entries.length === 0) {
            return ["  - {}"];
          }

          return entries.map(([itemKey, itemValue], index) => {
            const prefix = index === 0 ? "  - " : "    ";
            return `${prefix}${itemKey}: ${formatYamlValue(itemValue, itemKey)}`;
          });
        }),
      ].join("\n");
    }
    return `[${value.map(quoteYaml).join(", ")}]`;
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (value === "") {
    return '""';
  }
  if (key === "date" && /^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return String(value);
  }
  if (key === "order" && /^-?(0|[1-9]\d*)$/.test(String(value))) {
    return String(value);
  }

  return quoteYaml(value);
}

export function formatMarkdown(frontMatter, body) {
  const priority = ["title", "date", "draft", "tags", "summary", "description", "image", "thumbnail", "image_alt", "caption", "images", "hidden"];
  const keys = [
    ...priority.filter((key) => Object.prototype.hasOwnProperty.call(frontMatter, key)),
    ...Object.keys(frontMatter)
      .filter((key) => !priority.includes(key))
      .sort(),
  ];
  const lines = ["---"];

  for (const key of keys) {
    const value = frontMatter[key];

    if (value === undefined || value === null) {
      continue;
    }

    const formatted = formatYamlValue(value, key);
    lines.push(formatted.startsWith("\n") ? `${key}:${formatted}` : `${key}: ${formatted}`);
  }

  lines.push("---", "", String(body || "").trimStart());
  return `${lines.join("\n").trimEnd()}\n`;
}

export function tagsFromValue(value) {
  if (Array.isArray(value)) {
    return value.map(String).map((tag) => tag.trim()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}
