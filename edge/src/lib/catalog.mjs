export function catalogOrder(alias) {
  return `${alias}.generated, EXISTS (
    SELECT 1 FROM routes
    WHERE routes.document_id = ${alias}.id
      AND routes.kind = 'canonical' AND routes.path GLOB '/es/*'
  ), ${alias}.id`;
}

export function catalogEntry(alias = "d") {
  return `NOT EXISTS (
    SELECT 1 FROM documents AS preferred
    WHERE preferred.translation_key = ${alias}.translation_key
      AND preferred.kind = ${alias}.kind
      AND preferred.draft = ${alias}.draft
      AND preferred.hidden = ${alias}.hidden
      AND (${catalogOrder("preferred")}) < (${catalogOrder(alias)})
  )`;
}
