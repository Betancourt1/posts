import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { Miniflare } from "miniflare";

import { MAX_BODY_BYTES, receiveCvVisit } from "../src/lib/cv-visits.mjs";

const origin = "https://portfolio.test";
const activeId = "cv_test_active_0123456789";
function request(body = { cv_id: activeId }, options = {}) {
  const { headers, ...rest } = options;
  return new Request(`${origin}/api/cv-visits`, {
    method: "POST",
    headers: { origin, "content-type": "application/json", "sec-fetch-site": "same-origin", ...headers },
    body: typeof body === "string" || body instanceof ReadableStream || body instanceof Uint8Array
      ? body : JSON.stringify(body),
    ...rest,
  });
}

test("CV visit receiver validates requests and persists bounded private events in real local D1", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "cv-visits-d1-"));
  const options = {
    compatibilityDate: "2026-07-13",
    d1Databases: { DB: "cv-visits-test" },
    d1Persist: directory,
    modules: true,
    script: "export default { fetch() { return new Response('ok') } }",
  };
  let worker = new Miniflare(options);
  try {
    let db = await worker.getD1Database("DB");
    const migration = await readFile(new URL("../db/migrations/0003_cv_visits.sql", import.meta.url), "utf8");
    for (const sql of migration.replace(/^--.*$/gm, "").split(";").filter((sql) => sql.trim())) {
      await db.prepare(sql).run();
    }
    const register = (id) => db.prepare("INSERT INTO cv_attributions (cv_id) VALUES (?)").bind(id).run();
    const count = (id) => db.prepare("SELECT COUNT(*) FROM cv_visit_events WHERE cv_id = ?").bind(id).first("COUNT(*)");
    await register(activeId);

    await t.test("stores only an internal event number, registered CV ID, and server time", async () => {
      const before = Math.floor(Date.now() / 1000);
      const result = await receiveCvVisit(request(), db);
      assert.equal(result.status, 204);
      assert.equal(await result.text(), "");
      assert.equal(result.headers.get("cache-control"), "no-store");
      assert.equal(result.headers.get("access-control-allow-origin"), null);
      const event = await db.prepare("SELECT * FROM cv_visit_events").first();
      assert.deepEqual(Object.keys(event).sort(), ["cv_id", "id", "visited_at"]);
      assert.equal(event.cv_id, activeId);
      assert.ok(event.visited_at >= before && event.visited_at <= Math.floor(Date.now() / 1000));
      const expires = await db.prepare("SELECT expires_at FROM cv_attributions WHERE cv_id = ?").bind(activeId).first("expires_at");
      assert.ok(expires > before + 179 * 86400 && expires <= before + 181 * 86400);
    });

    await t.test("unknown, disabled, and expired IDs receive the same empty response without inserting", async () => {
      const disabled = "cv_disabled_0123456789";
      const expired = "cv_expired_0123456789";
      await register(disabled);
      await register(expired);
      await db.prepare("UPDATE cv_attributions SET enabled = 0 WHERE cv_id = ?").bind(disabled).run();
      await db.prepare("UPDATE cv_attributions SET expires_at = unixepoch() - 1 WHERE cv_id = ?").bind(expired).run();
      for (const cv_id of [disabled, expired, "cv_unknown_0123456789"]) {
        const result = await receiveCvVisit(request({ cv_id }), db);
        assert.equal(result.status, 204);
        assert.equal(await result.text(), "");
        assert.equal(await count(cv_id), 0);
      }
    });

    await t.test("rejects malformed/extra data and invalid IDs before any database access", async () => {
      const neverDb = { prepare() { assert.fail("invalid payload reached D1"); } };
      const invalid = [null, [], 42, {}, { cv_id: activeId, ip: "127.0.0.1" }, { cv_id: 42 },
        ...["", "x".repeat(15), "x".repeat(65), activeId + "\n", activeId + "é", activeId + "'", activeId + "/"]
          .map((cv_id) => ({ cv_id }))];
      for (const body of invalid) assert.equal((await receiveCvVisit(request(body), neverDb)).status, 400);
      for (const body of ["{", new Uint8Array([0xff])]) {
        assert.equal((await receiveCvVisit(request(body), neverDb)).status, 400);
      }
      for (const cv_id of ["x".repeat(16), "x".repeat(64)]) {
        await register(cv_id);
        assert.equal((await receiveCvVisit(request({ cv_id }), db)).status, 204);
        assert.equal(await count(cv_id), 1);
      }
      await assert.rejects(() => register("bad"));
    });

    await t.test("requires same-origin JSON POST and never exposes stored events", async () => {
      for (const method of ["GET", "HEAD", "OPTIONS", "PUT", "PATCH", "DELETE"]) {
        const result = await receiveCvVisit(new Request(`${origin}/api/cv-visits`, { method }), db);
        assert.equal(result.status, 405);
        assert.equal(result.headers.get("allow"), "POST");
        assert.equal(await result.text(), "");
      }
      for (const headers of [{ origin: "null" }, { origin: "https://elsewhere.test" },
        { "sec-fetch-site": "cross-site" }, { "sec-fetch-site": "same-site" }]) {
        assert.equal((await receiveCvVisit(request(undefined, { headers }), db)).status, 403);
      }
      const absentOrigin = request();
      absentOrigin.headers.delete("origin");
      assert.equal((await receiveCvVisit(absentOrigin, db)).status, 403);
      const withQuery = new Request(`${origin}/api/cv-visits?extra=1`, request());
      assert.equal((await receiveCvVisit(withQuery, db)).status, 400);
      for (const headers of [{ "content-type": "text/plain" }, { "content-type": "application/x-www-form-urlencoded" },
        { "content-encoding": "gzip" }]) {
        assert.equal((await receiveCvVisit(request(undefined, { headers }), db)).status, 415);
      }
    });

    await t.test("bounds actual streamed bytes even without a truthful Content-Length", async () => {
      const tooBig = " ".repeat(MAX_BODY_BYTES + 1);
      for (const headers of [{}, { "content-length": "1" }, { "content-length": String(tooBig.length) }]) {
        assert.equal((await receiveCvVisit(request(tooBig, { headers }), db)).status, 413);
      }
      let cancelled = false;
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(80));
          controller.enqueue(new Uint8Array(80));
        },
        cancel() { cancelled = true; },
      });
      assert.equal((await receiveCvVisit(request(stream, { duplex: "half" }), db)).status, 413);
      assert.equal(cancelled, true);
      assert.equal((await receiveCvVisit(request(" ".repeat(127) + "é"), db)).status, 413);
      assert.equal((await receiveCvVisit(request(undefined, { headers: { "content-length": "invalid" } }), db)).status, 400);
    });

    await t.test("database failure returns 503 without claiming success or exposing errors", async () => {
      for (const failingDb of [undefined, { prepare() { throw new Error("private DB detail"); } },
        { prepare() { return { bind() { return { run: async () => ({ success: false }) }; } }; } }]) {
        const result = await receiveCvVisit(request(), failingDb);
        assert.equal(result.status, 503);
        assert.equal(await result.text(), "");
        assert.equal(result.headers.get("cache-control"), "no-store");
      }
    });

    await t.test("enforces the 100-per-24h cap atomically under concurrent delivery", async () => {
      const cv_id = "cv_daily_cap_0123456789";
      await register(cv_id);
      await db.batch(Array.from({ length: 98 }, () => db.prepare("INSERT INTO cv_visit_events (cv_id) VALUES (?)").bind(cv_id)));
      const responses = await Promise.all(Array.from({ length: 12 }, () => receiveCvVisit(request({ cv_id }), db)));
      assert.ok(responses.every((result) => result.status === 204));
      assert.equal(await count(cv_id), 100);
    });

    await t.test("enforces the lifetime 1000-row cap including older visits", async () => {
      const cv_id = "cv_total_cap_0123456789";
      await register(cv_id);
      await db.prepare(`WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i<999)
        INSERT INTO cv_visit_events (cv_id, visited_at) SELECT ?, unixepoch() - 172800 FROM n`).bind(cv_id).run();
      for (let i = 0; i < 3; i++) assert.equal((await receiveCvVisit(request({ cv_id }), db)).status, 204);
      assert.equal(await count(cv_id), 1000);
    });

    await t.test("committed events survive a Worker and D1 binding restart", async () => {
      const before = await count(activeId);
      await worker.dispose();
      worker = new Miniflare(options);
      db = await worker.getD1Database("DB");
      assert.equal(await count(activeId), before);
      assert.equal((await receiveCvVisit(request(), db)).status, 204);
      assert.equal(await count(activeId), before + 1);
    });

    await t.test("private attribution deletion erases its events", async () => {
      await db.prepare("DELETE FROM cv_attributions WHERE cv_id = ?").bind(activeId).run();
      assert.equal(await count(activeId), 0);
      assert.equal((await receiveCvVisit(request(), db)).status, 204);
      assert.equal(await count(activeId), 0);
    });
  } finally {
    await worker.dispose();
    await rm(directory, { recursive: true, force: true });
  }
});
