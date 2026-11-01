// The first resource is the action shown on the catalog card.
export const projectTypes = {
  demo: ["Demo", "Demo"],
  code: ["Code", "Código"],
  writing: ["Writing", "Lectura"],
  data: ["Data", "Datos"],
};

export const projectStatuses = {
  live: ["Live", "En línea"],
  archived: ["Archived", "Archivado"],
  private: ["Private", "Privado"],
  research: ["Research", "Investigación"],
};

// Optional presentation fields. They are normalized on save and never required.
export const projectOptionalFields = ["role", "period", "org", "status", "highlights", "order", "technologies"];
const MAX_HIGHLIGHTS = 4;

export function projectStatusLabel(status, spanish) {
  return Object.hasOwn(projectStatuses, status) ? projectStatuses[status][Number(spanish)] : "";
}

export function validProjectLink(link) {
  return Object.hasOwn(projectTypes, link?.type) &&
    typeof link.label === "string" && !!link.label.trim() &&
    typeof link.href === "string" && !/[\s\\]/.test(link.href) &&
    (/^https?:\/\/[^/]/i.test(link.href) || /^\/(?!\/)/.test(link.href));
}

// Single-line text: front matter is rewritten line by line, so newlines and control characters are collapsed.
function cleanText(value) {
  if (typeof value === "number" && Number.isFinite(value)) value = String(value);
  return typeof value === "string" ? value.replace(/[\p{Cc}\p{Zl}\p{Zp}\s]+/gu, " ").trim() : "";
}

// Comma-separated strings are only a shorthand for short names (technologies, tags); prose lists never split.
function textList(value, { split = true } = {}) {
  const items = Array.isArray(value) ? value : typeof value === "string" ? (split ? value.split(",") : [value]) : [];
  return items.map(cleanText).filter(Boolean);
}

function uniqueText(value) {
  const seen = new Set();
  return textList(value).filter((item) => !seen.has(item.toLowerCase()) && seen.add(item.toLowerCase()));
}

function explicitStatus(value) {
  const status = cleanText(value).toLowerCase();
  return Object.hasOwn(projectStatuses, status) ? status : "";
}

export function projectOrder(value) {
  if (typeof value === "number") return Number.isInteger(value) ? value : null;
  return typeof value === "string" && /^-?\d+$/.test(value.trim()) ? Number(value) : null;
}

// What the catalog and project page render. Tolerates hand-written or legacy-parsed front matter.
export function projectMeta(frontMatter) {
  frontMatter ??= {};
  const status = explicitStatus(frontMatter.status) ||
    (textList(frontMatter.tags).some((tag) => tag.toLowerCase() === "private") ? "private" : "");
  return {
    role: cleanText(frontMatter.role),
    period: cleanText(frontMatter.period),
    org: cleanText(frontMatter.org),
    status,
    highlights: textList(frontMatter.highlights, { split: false }).slice(0, MAX_HIGHLIGHTS),
    technologies: uniqueText(frontMatter.technologies),
    links: Array.isArray(frontMatter.project_links) ? frontMatter.project_links.filter(validProjectLink) : [],
    order: projectOrder(frontMatter.order),
    featured: frontMatter.featured === true,
  };
}

// Within a group, `order` ascending comes first; ties and unordered entries keep their incoming order.
export function sortProjects(projects) {
  const rank = (project) => projectMeta(project.frontMatter).order ?? Infinity;
  return projects.toSorted((a, b) => {
    const [first, second] = [rank(a), rank(b)];
    return first === second ? 0 : first < second ? -1 : 1;
  });
}

export function projectFields(payload) {
  const links = payload.project_links ?? [];
  if (!Array.isArray(links) || !links.every(validProjectLink)) {
    throw new Error("Cada recurso necesita un tipo, un título y un enlace web o una ruta del sitio.");
  }
  const fields = { project_links: links, featured: payload.featured === true };

  for (const key of ["role", "period", "org"]) {
    const text = cleanText(payload[key]);
    if (text) fields[key] = text;
  }
  const status = explicitStatus(payload.status);
  if (status) fields.status = status;
  const highlights = textList(payload.highlights, { split: false }).slice(0, MAX_HIGHLIGHTS);
  if (highlights.length) fields.highlights = highlights;
  const technologies = uniqueText(payload.technologies);
  if (technologies.length) fields.technologies = technologies;
  const order = projectOrder(payload.order);
  if (order !== null) fields.order = order;
  return fields;
}

// What an entry still needs to read well in the catalog. Private work needs no link.
export function projectReadiness(frontMatter, summary) {
  const meta = projectMeta(frontMatter);
  const missing = [];
  if (!cleanText(summary)) missing.push("summary");
  if (!meta.role) missing.push("role");
  if (!meta.technologies.length) missing.push("stack");
  if (!meta.highlights.length) missing.push("highlights");
  if (!meta.links.length && meta.status !== "private") missing.push("links");
  return missing;
}

// Normalizes a project's front matter in place; emptied or invalid optional fields are removed.
export function applyProjectFields(frontMatter) {
  const fields = projectFields(frontMatter);
  for (const key of projectOptionalFields) delete frontMatter[key];
  return Object.assign(frontMatter, fields);
}
