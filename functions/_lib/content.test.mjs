import assert from "node:assert/strict";
import test from "node:test";
import { deleteNotebook, deletePage, invalidateNotebooksCache, listNotebooks, savePage } from "./content.js";
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
