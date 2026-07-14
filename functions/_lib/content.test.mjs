import assert from "node:assert/strict";
import test from "node:test";
import { deletePage, invalidateNotebooksCache, listNotebooks, savePage } from "./content.js";
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
