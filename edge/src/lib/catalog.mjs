export function catalogEntry(alias = "d") {
  return `NOT EXISTS (
    SELECT 1 FROM documents AS preferred
    WHERE preferred.translation_key = ${alias}.translation_key
      AND preferred.kind = ${alias}.kind
      AND preferred.draft = ${alias}.draft
      AND preferred.hidden = ${alias}.hidden
      AND (preferred.generated, preferred.lang, preferred.id)
        < (${alias}.generated, ${alias}.lang, ${alias}.id)
  )`;
}
