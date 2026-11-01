// Keep the migration baseline for the rest of the site. Projects are authored independently.
export function expectedSeedCounts(sources) {
  const projects = sources.filter(source => source.source.path.split("/")[1] === "proyectos-profesionales");
  const pages = projects.flatMap(source => source.documents);
  return {
    sources: 411 + projects.length,
    documents: 511 + pages.length,
    searchable: 477 + pages.filter(page => page.searchable).length,
    canonicalRoutes: 511 + pages.length,
    aliasRoutes: 118 + pages.flatMap(page => page.routes.filter(route => route.kind === "alias")).length,
  };
}
