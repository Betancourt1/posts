export function graphPostPayload(documents) {
  const tagLinks = {};
  const posts = [];

  for (const document of documents || []) {
    const tags = (document.tags || []).filter((tag) => tag?.label && tag?.path);
    if (!tags.length) continue;

    for (const tag of tags) tagLinks[tag.label] = tag.path;
    posts.push({
      title: document.title,
      permalink: document.path,
      tags: tags.map((tag) => tag.label),
    });
  }

  return { posts, tagLinks };
}
