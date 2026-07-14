export function tagRecord(value) {
  const label = String(value || "").trim().normalize("NFC");
  const slug = label
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  return { label, slug };
}

export function uniqueTagRecords(values) {
  const seen = new Set();

  return (values || []).flatMap((value) => {
    const tag = typeof value === "string" ? tagRecord(value) : value;
    if (!tag?.label || !tag?.slug || seen.has(tag.slug)) return [];
    seen.add(tag.slug);
    return [tag];
  });
}
