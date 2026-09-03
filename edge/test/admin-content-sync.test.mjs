import assert from "node:assert/strict";
import test from "node:test";

import {
  synchronizeAdminMutation,
  withAdminContentSync,
} from "../src/lib/admin-content-sync.mjs";

function success(payload) {
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
  });
}

function projectionFakes(events, overrides = {}) {
  return {
    async readGitHubFile(_env, path) {
      events.push(`read:${path}`);
      return { path, sha: "blob-sha", content: "---\ntitle: Saved\n---\nBody\n" };
    },
    projectSource(input) {
      events.push(`project:${input.path}:${input.blobSha}:${input.commitSha}:${input.projectorVersion}`);
      return { source: { path: input.path }, documents: [] };
    },
    async replaceProjectedSource(db, projection, runId) {
      assert.equal(db.name, "DB");
      assert.equal(projection.source.path, "content_en/posts/saved.md");
      assert.equal(runId, null);
      events.push("replace");
    },
    async deleteSources(_db, paths) {
      events.push(`delete:${paths.join(",")}`);
    },
    async finishProjection() {
      events.push("finish");
    },
    ...overrides,
  };
}

test("projects the canonical GitHub file after a successful save", async () => {
  const events = [];
  const env = { DB: { name: "DB" }, CONTENT_PROJECTOR_VERSION: "7" };
  const response = success({
    path: "content_en/posts/saved.md",
    commitSha: "commit-sha",
    changed: true,
  });

  const result = await synchronizeAdminMutation(
    env,
    response,
    "save-page",
    projectionFakes(events),
  );

  assert.equal(result, response);
  assert.deepEqual(events, [
    "read:content_en/posts/saved.md",
    "project:content_en/posts/saved.md:blob-sha:commit-sha:7",
    "replace",
    "finish",
  ]);
  assert.deepEqual(await result.json(), {
    path: "content_en/posts/saved.md",
    commitSha: "commit-sha",
    changed: true,
  });
});

test("runs the mutation before projecting a create response", async () => {
  const events = [];
  const env = { DB: { name: "DB" } };
  const wrapped = withAdminContentSync(async () => {
    events.push("github-mutation");
    return success({ path: "content_en/posts/saved.md" });
  }, "create-post", projectionFakes(events));

  const response = await wrapped({ env, request: new Request("https://example.com") });

  assert.equal(response.status, 200);
  assert.deepEqual(events, [
    "github-mutation",
    "read:content_en/posts/saved.md",
    "project:content_en/posts/saved.md:blob-sha:null:1",
    "replace",
    "finish",
  ]);
});

test("does not touch D1 when the GitHub mutation failed", async () => {
  const events = [];
  const response = new Response(JSON.stringify({ error: "GitHub failed" }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });

  const result = await synchronizeAdminMutation(
    { DB: { name: "DB" } },
    response,
    "save-page",
    projectionFakes(events),
  );

  assert.equal(result, response);
  assert.deepEqual(events, []);
  assert.equal(result.status, 400);
});

test("deletes only projected Markdown sources from a notebook response", async () => {
  const events = [];
  const response = success({
    path: "content_en/notes",
    deletedFiles: [
      "content_en/notes/zeta.md",
      "static/uploads/cover.webp",
      "content_en/notes/_index.md",
      "content_en/notes/zeta.md",
    ],
  });

  const result = await synchronizeAdminMutation(
    { DB: { name: "DB" } },
    response,
    "delete-notebook",
    projectionFakes(events),
  );

  assert.equal(result, response);
  assert.deepEqual(events, [
    "delete:content_en/notes/zeta.md,content_en/notes/_index.md",
    "finish",
  ]);
});

test("removes one projected source after a successful page delete", async () => {
  const events = [];
  const response = success({ path: "content_es/posts/deleted.md" });

  const result = await synchronizeAdminMutation(
    { DB: { name: "DB" } },
    response,
    "delete-page",
    projectionFakes(events),
  );

  assert.equal(result, response);
  assert.deepEqual(events, ["delete:content_es/posts/deleted.md", "finish"]);
});

test("returns an explicit 500 when the live projection fails", async () => {
  const events = [];
  const response = success({ path: "content_en/posts/saved.md" });
  const result = await synchronizeAdminMutation(
    { DB: { name: "DB" } },
    response,
    "sync-arena",
    projectionFakes(events, {
      async replaceProjectedSource() {
        events.push("replace-failed");
        throw new Error("D1 unavailable");
      },
    }),
  );

  assert.equal(result.status, 500);
  assert.equal(result.headers.get("cache-control"), "no-store");
  assert.deepEqual(await result.json(), {
    error: "GitHub was updated, but the live content projection failed.",
    projectionFailed: true,
    detail: "D1 unavailable",
    saved: { path: "content_en/posts/saved.md" },
  });
  assert.deepEqual(events, [
    "read:content_en/posts/saved.md",
    "project:content_en/posts/saved.md:blob-sha:null:1",
    "replace-failed",
  ]);
});

test("returns 500 instead of claiming success when a deleted source is missing", async () => {
  const result = await synchronizeAdminMutation(
    { DB: { name: "DB" } },
    success({ deletedFiles: ["static/uploads/cover.webp"] }),
    "delete-notebook",
    projectionFakes([]),
  );

  assert.equal(result.status, 500);
  const payload = await result.json();
  assert.equal(payload.projectionFailed, true);
  assert.match(payload.detail, /did not return any content files/);
  assert.deepEqual(payload.saved, { deletedFiles: ["static/uploads/cover.webp"] });
});
