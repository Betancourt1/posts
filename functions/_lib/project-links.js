// The first resource is the action shown on the catalog card.
export const projectTypes = {
  demo: ["Demo", "Demo"],
  code: ["Code", "Código"],
  writing: ["Writing", "Lectura"],
  data: ["Data", "Datos"],
};

export function validProjectLink(link) {
  return Object.hasOwn(projectTypes, link?.type) &&
    typeof link.label === "string" && !!link.label.trim() &&
    typeof link.href === "string" && !/[\s\\]/.test(link.href) &&
    (/^https?:\/\/[^/]/i.test(link.href) || /^\/(?!\/)/.test(link.href));
}

export function projectFields(payload) {
  const links = payload.project_links ?? [];
  if (!Array.isArray(links) || !links.every(validProjectLink)) {
    throw new Error("Cada recurso necesita un tipo, un título y un enlace web o una ruta del sitio.");
  }
  return { project_links: links, featured: payload.featured === true };
}
