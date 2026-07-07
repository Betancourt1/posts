function parseScalar(value) {
  const trimmed = String(value || "").trim();

  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "[]") return [];
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export function splitMarkdown(text) {
  const normalized = String(text || "").replace(/\r\n/g, "\n");

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

  for (const line of rawFrontMatter.split("\n")) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);

    if (match) {
      frontMatter[match[1]] = parseScalar(match[2]);
    }
  }

  return { frontMatter, body };
}

function quoteYaml(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function formatYamlValue(value, key) {
  if (Array.isArray(value)) {
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

  return quoteYaml(value);
}

export function formatMarkdown(frontMatter, body) {
  const priority = ["title", "date", "draft", "tags", "summary", "description", "hidden"];
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

    lines.push(`${key}: ${formatYamlValue(value, key)}`);
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
