import assert from "node:assert/strict";
import test from "node:test";
import {
  createPost,
  deleteNotebook,
  deletePage,
  invalidateNotebooksCache,
  listNotebooks,
  photographyMirrorPath,
  savePage,
  savePageFrontMatter,
} from "./content.js";
import { formatMarkdown, splitMarkdown } from "./markdown.js";

const env = {
  GITHUB_OWNER: "owner",
  GITHUB_REPO: "posts",
  GITHUB_BRANCH: "main",
  GITHUB_TOKEN: "secret",
};

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function encoded(value) {
  return Buffer.from(value, "utf8").toString("base64");
}

test("savePage removes draft and hidden when the editor sends null", async () => {
  const originalFetch = globalThis.fetch;
  const current = formatMarkdown({ title: "Notebook", draft: true, hidden: true }, "");
  let writtenContent = "";

  globalThis.fetch = async (url, options = {}) => {
    if ((options.method || "GET") === "GET") {
      return jsonResponse(200, { type: "file", path: "content_es/notebook/_index.md", sha: "old", content: encoded(current) });
    }
    const body = JSON.parse(options.body);
    writtenContent = Buffer.from(body.content, "base64").toString("utf8");
    return jsonResponse(200, { commit: { sha: "new" } });
  };

  try {
    const result = await savePage(env, {
      path: "content_es/notebook/_index.md",
      frontMatter: { draft: null, hidden: null },
      body: "",
    });
    const parsed = splitMarkdown(writtenContent);
    assert.equal(result.changed, true);
    assert.equal(result.frontMatter.draft, undefined);
    assert.equal(result.frontMatter.hidden, undefined);
    assert.equal(parsed.frontMatter.draft, undefined);
    assert.equal(parsed.frontMatter.hidden, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("savePage skips an empty GitHub commit when content is unchanged", async () => {
  const originalFetch = globalThis.fetch;
  const current = formatMarkdown({ title: "Notebook", draft: false }, "Contenido\n");
  let writes = 0;

  globalThis.fetch = async (url, options = {}) => {
    if ((options.method || "GET") === "PUT") {
      writes += 1;
      return jsonResponse(200, { commit: { sha: "new" } });
    }
    return jsonResponse(200, { type: "file", path: "content_es/notebook/_index.md", sha: "old", content: encoded(current) });
  };

  try {
    const result = await savePage(env, {
      path: "content_es/notebook/_index.md",
      frontMatter: { draft: false },
      body: "Contenido\n",
    });
    assert.equal(result.changed, false);
    assert.equal(writes, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("savePage normalizes legacy Spanish photography tags to English", async () => {
  const originalFetch = globalThis.fetch;
  const current = formatMarkdown({ title: "Foto", tags: ["fotografia", "nature"] }, "");
  let writtenContent = "";

  globalThis.fetch = async (url, options = {}) => {
    if ((options.method || "GET") === "GET") {
      return jsonResponse(200, {
        type: "file",
        path: "content_es/fotografia/foto.md",
        sha: "old",
        content: encoded(current),
      });
    }
    const body = JSON.parse(options.body);
    writtenContent = Buffer.from(body.content, "base64").toString("utf8");
    return jsonResponse(200, { commit: { sha: "new" } });
  };

  try {
    const result = await savePage(env, {
      path: "content_es/fotografia/foto.md",
      frontMatter: { tags: ["fotografia", "fotografía", "nature"] },
      body: "",
    });
    assert.equal(result.changed, true);
    assert.deepEqual(splitMarkdown(writtenContent).frontMatter.tags, ["photography", "nature"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("quote metadata arrays survive Markdown formatting", () => {
  const quotes = [
    {
      text: "Podemos saber más de lo que podemos decir.",
      author: "Michael Polanyi",
      source: "The Tacit Dimension",
      year: "1966",
      page: "42",
    },
    {
      text: "El trabajo me otorgaría el estatus de persona real.",
      author: "Mark Fisher",
    },
  ];
  const markdown = formatMarkdown({ title: "Citas", quotes }, "> Texto\n");

  assert.deepEqual(splitMarkdown(markdown).frontMatter.quotes, quotes);
});

test("deletePage returns the exact deleted URL separately from its fallback", async () => {
  const originalFetch = globalThis.fetch;
  const current = formatMarkdown({ title: "Temporal", tags: ["qa"] }, "Contenido\n");

  globalThis.fetch = async (url, options = {}) => {
    if ((options.method || "GET") === "DELETE") {
      return jsonResponse(200, { commit: { sha: "deleted" } });
    }
    return jsonResponse(200, {
      type: "file",
      path: "content_es/posts/2026/julio/temporal.md",
      sha: "old",
      content: encoded(current),
    });
  };

  try {
    const result = await deletePage(env, {
      path: "content_es/posts/2026/julio/temporal.md",
      deleteImages: false,
    });
    assert.equal(result.deletedUrl, "/es/posts/2026/julio/temporal/");
    assert.equal(result.url, "/es/posts/");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("deletePage removes referenced images from R2 when the media binding is present", async () => {
  const originalFetch = globalThis.fetch;
  const current = formatMarkdown(
    { title: "Foto", image: "/uploads/2026/07/photo.webp" },
    "Contenido\n",
  );
  const deletedKeys = [];
  const r2Env = {
    ...env,
    MEDIA: {
      async head(key) {
        return key === "uploads/2026/07/photo.webp" ? { key } : null;
      },
      async delete(key) {
        deletedKeys.push(key);
      },
    },
  };

  globalThis.fetch = async (_url, options = {}) => {
    if ((options.method || "GET") === "DELETE") {
      return jsonResponse(200, { commit: { sha: "deleted" } });
    }
    return jsonResponse(200, {
      type: "file",
      path: "content_es/fotografia/photo.md",
      sha: "old",
      content: encoded(current),
    });
  };

  try {
    const result = await deletePage(r2Env, {
      path: "content_es/fotografia/photo.md",
      deleteImages: true,
    });
    assert.deepEqual(deletedKeys, ["uploads/2026/07/photo.webp"]);
    assert.deepEqual(result.deletedImages, ["static/uploads/2026/07/photo.webp"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("deleteNotebook removes a large notebook in one GitHub commit", async () => {
  const originalFetch = globalThis.fetch;
  const files = [
    {
      type: "blob",
      mode: "100644",
      path: "content_es/zettelkasten/_index.md",
      sha: "index",
    },
    ...Array.from({ length: 60 }, (_, index) => ({
      type: "blob",
      mode: "100644",
      path: `content_es/zettelkasten/note-${index}.md`,
      sha: `note-${index}`,
    })),
  ];
  const requests = [];
  const deletedKeys = [];
  const notebookEnv = {
    ...env,
    DB: {
      prepare(sql) {
        assert.match(sql, /FROM sources WHERE path LIKE/);
        return {
          bind(pattern) {
            assert.equal(pattern, "content_es/zettelkasten/%");
            return {
              async all() {
                return {
                  results: files.map((file, index) => ({
                    path: file.path,
                    raw_markdown: formatMarkdown(
                      index === 1 ? { title: "Con imagen", image: "/uploads/note.webp" } : { title: "Nota" },
                      "Contenido\n",
                    ),
                  })),
                };
              },
            };
          },
        };
      },
    },
    MEDIA: {
      async head(key) {
        return key === "uploads/note.webp" ? { key } : null;
      },
      async delete(key) {
        deletedKeys.push(key);
      },
    },
  };

  globalThis.fetch = async (url, options = {}) => {
    const method = options.method || "GET";
    const request = { url: String(url), method, body: options.body ? JSON.parse(options.body) : null };
    requests.push(request);

    if (method === "GET" && request.url.includes("/git/ref/heads/main")) {
      return jsonResponse(200, { object: { sha: "head" } });
    }
    if (method === "GET" && request.url.includes("/git/commits/head")) {
      return jsonResponse(200, { tree: { sha: "base-tree" } });
    }
    if (method === "GET" && request.url.includes("/git/trees/base-tree?recursive=1")) {
      return jsonResponse(200, { tree: files });
    }
    if (method === "POST" && request.url.endsWith("/git/trees")) {
      return jsonResponse(201, { sha: "next-tree" });
    }
    if (method === "POST" && request.url.endsWith("/git/commits")) {
      return jsonResponse(201, { sha: "next-commit" });
    }
    if (method === "PATCH" && request.url.endsWith("/git/refs/heads/main")) {
      return jsonResponse(200, { object: { sha: "next-commit" } });
    }
    throw new Error(`Unexpected request: ${method} ${url}`);
  };

  try {
    const result = await deleteNotebook(notebookEnv, {
      path: "content_es/zettelkasten",
      deleteImages: true,
    });
    const treeRequest = requests.find((request) => request.method === "POST" && request.url.endsWith("/git/trees"));
    const commitRequest = requests.find((request) => request.method === "POST" && request.url.endsWith("/git/commits"));
    const refRequest = requests.find((request) => request.method === "PATCH");

    assert.equal(requests.length, 6);
    assert.equal(requests.some((request) => request.method === "DELETE"), false);
    assert.equal(treeRequest.body.base_tree, "base-tree");
    assert.equal(treeRequest.body.tree.length, files.length);
    assert.equal(treeRequest.body.tree.every((entry) => entry.sha === null), true);
    assert.deepEqual(commitRequest.body.parents, ["head"]);
    assert.equal(refRequest.body.force, false);
    assert.equal(result.deletedFiles.length, files.length);
    assert.deepEqual(result.deletedImages, ["static/uploads/note.webp"]);
    assert.deepEqual(deletedKeys, ["uploads/note.webp"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("listNotebooks reuses its short-lived repository cache", async () => {
  const originalFetch = globalThis.fetch;
  let treeReads = 0;
  invalidateNotebooksCache();

  globalThis.fetch = async (url) => {
    if (url.includes("/git/ref/heads/")) return jsonResponse(200, { object: { sha: "commit" } });
    if (url.includes("/git/commits/")) return jsonResponse(200, { tree: { sha: "tree" } });
    if (url.includes("/git/trees/")) {
      treeReads += 1;
      return jsonResponse(200, { tree: [{ type: "blob", path: "content_es/notebook/_index.md" }] });
    }
    if (url.includes("/contents/content_es/notebook/_index.md")) {
      return jsonResponse(200, {
        type: "file",
        path: "content_es/notebook/_index.md",
        sha: "index",
        content: encoded(formatMarkdown({ title: "Notebook" }, "")),
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  try {
    const first = await listNotebooks(env);
    const second = await listNotebooks(env);
    assert.equal(first[0].title, "Notebook");
    assert.deepEqual(second, first);
    assert.equal(treeReads, 1);
  } finally {
    globalThis.fetch = originalFetch;
    invalidateNotebooksCache();
  }
});

test("photographyMirrorPath maps between English and Spanish photography posts but ignores index and other sections", () => {
  assert.equal(photographyMirrorPath("content_es/fotografia/mariposa.md"), "content_en/fotografia/mariposa.md");
  assert.equal(photographyMirrorPath("content_en/fotografia/spider.md"), "content_es/fotografia/spider.md");
  assert.equal(photographyMirrorPath("content_es/fotografia/_index.md"), null);
  assert.equal(photographyMirrorPath("content_en/fotografia/_index.md"), null);
  assert.equal(photographyMirrorPath("content_es/posts/2026/julio/post.md"), null);
});

test("createPost, savePage, savePageFrontMatter, and deletePage automatically mirror photography posts", async () => {
  const originalFetch = globalThis.fetch;
  const files = new Map();

  globalThis.fetch = async (url, options = {}) => {
    const method = options.method || "GET";
    const urlObj = new URL(url);
    const contentsMatch = urlObj.pathname.match(/\/contents\/(.+)/);
    const filePath = contentsMatch ? decodeURIComponent(contentsMatch[1]) : "";

    if (method === "GET") {
      if (files.has(filePath)) {
        return jsonResponse(200, {
          type: "file",
          path: filePath,
          sha: files.get(filePath).sha,
          content: encoded(files.get(filePath).content),
        });
      }
      return jsonResponse(404, { message: "Not Found" });
    }

    if (method === "PUT") {
      const body = JSON.parse(options.body);
      const content = Buffer.from(body.content, "base64").toString("utf8");
      files.set(filePath, { content, sha: "sha-" + Math.random().toString(36).slice(2) });
      return jsonResponse(200, { commit: { sha: "commit-sha" } });
    }

    if (method === "DELETE") {
      files.delete(filePath);
      return jsonResponse(200, { commit: { sha: "delete-sha" } });
    }

    throw new Error(`Unhandled request: ${method} ${url}`);
  };

  files.set("content_es/fotografia/_index.md", { content: "---\ntitle: Fotografía\n---", sha: "index-es" });
  files.set("content_en/fotografia/_index.md", { content: "---\ntitle: Photography\n---", sha: "index-en" });

  try {
    // 1. Create post in Spanish photography
    const created = await createPost(env, {
      notebook: "content_es/fotografia",
      title: "Nueva Foto",
      date: "2026-09-03",
      image: "/uploads/photo.jpg",
      tags: "photography",
      body: "",
    });

    assert.equal(created.path, "content_es/fotografia/nueva-foto.md");
    assert.equal(created.mirrorPath, "content_en/fotografia/nueva-foto.md");
    assert.ok(files.has("content_es/fotografia/nueva-foto.md"));
    assert.ok(files.has("content_en/fotografia/nueva-foto.md"));
    assert.equal(
      files.get("content_es/fotografia/nueva-foto.md").content,
      files.get("content_en/fotografia/nueva-foto.md").content,
    );

    // 2. Save page updates both files
    const saved = await savePage(env, {
      path: "content_es/fotografia/nueva-foto.md",
      frontMatter: { title: "Foto Actualizada" },
      body: "Un comentario",
    });

    assert.equal(saved.changed, true);
    assert.equal(
      files.get("content_es/fotografia/nueva-foto.md").content,
      files.get("content_en/fotografia/nueva-foto.md").content,
    );
    assert.match(files.get("content_en/fotografia/nueva-foto.md").content, /Foto Actualizada/);

    // 3. Save front matter updates both files
    await savePageFrontMatter(env, "content_es/fotografia/nueva-foto.md", {
      arena_enabled: true,
      arena_channel_id: "12345",
    });

    assert.equal(
      files.get("content_es/fotografia/nueva-foto.md").content,
      files.get("content_en/fotografia/nueva-foto.md").content,
    );
    assert.match(files.get("content_en/fotografia/nueva-foto.md").content, /arena_channel_id: "12345"/);

    // 4. Delete page removes both files
    const deleted = await deletePage(env, {
      path: "content_es/fotografia/nueva-foto.md",
      deleteImages: false,
    });

    assert.equal(deleted.path, "content_es/fotografia/nueva-foto.md");
    assert.equal(deleted.mirrorPath, "content_en/fotografia/nueva-foto.md");
    assert.ok(!files.has("content_es/fotografia/nueva-foto.md"));
    assert.ok(!files.has("content_en/fotografia/nueva-foto.md"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

