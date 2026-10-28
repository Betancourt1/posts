import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Miniflare } from "miniflare";

import { listCvAttributions, registerCvAttribution } from "../src/lib/cv-attributions.mjs";
import { invokeAuthorPagesFunction } from "../src/lib/pages-function-adapter.mjs";

const origin = "https://portfolio.test";
const id = "cv_admin_test_0123456789";
const vacancy = "Data Scientist — O'Reilly <Research>";
const authEnv = {
  CF_ACCESS_DOMAIN: "https://cv-test.cloudflareaccess.com",
  CF_ACCESS_AUD: "cv-admin-test",
  AUTHOR_EMAIL: "author@example.test",
};
function request(payload = { cv_id: id }, headers = {}) {
  return new Request(`${origin}/admin/api/cv-attributions`, {
    method: "POST",
    headers: { origin, "content-type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
}

test("CV registry requires author authentication for reading and registration", async () => {
  const env = { ...authEnv, DB: { prepare() { assert.fail("unauthenticated D1 access"); } } };
  for (const [handler, req] of [
    [listCvAttributions, new Request(`${origin}/admin/api/cv-attributions`)],
    [registerCvAttribution, request()],
  ]) {
    const response = await invokeAuthorPagesFunction(handler, { env, request: req });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  const route = await readFile(new URL("../src/pages/admin/api/cv-attributions.ts", import.meta.url), "utf8");
  assert.match(route, /GET: APIRoute = .*invokeAuthorPagesFunction\(listCvAttributions/);
  assert.match(route, /POST: APIRoute = .*invokeAuthorPagesFunction\(registerCvAttribution/);
});

test("CV registration rejects wrong origins, content types, and malformed IDs before D1", async () => {
  const env = { DB: { prepare() { assert.fail("invalid input reached D1"); } } };
  assert.equal((await registerCvAttribution({ env, request: request(undefined, { origin: "https://other.test" }) })).status, 403);
  assert.equal((await registerCvAttribution({ env, request: request(undefined, { "content-type": "text/plain" }) })).status, 415);
  for (const payload of [null, [], {}, { cv_id: "short" }, { cv_id: id + "'" }, { cv_id: id, company: "private" }]) {
    assert.equal((await registerCvAttribution({ env, request: request(payload) })).status, 400);
  }
  for (const value of [null, 42, [], {}, "x".repeat(201)]) {
    const response = await registerCvAttribution({ env, request: request({ cv_id: id, vacancy: value }) });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "vacancy_invalid" });
  }
});

test("CV registry persists IDs and never renews or enables duplicates", async (t) => {
  const worker = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('ok') } }",
    compatibilityDate: "2026-07-13",
    d1Databases: { DB: "cv-registry-test" },
  });
  try {
    const DB = await worker.getD1Database("DB");
    const env = { ...authEnv, DB };
    const migration = await readFile(new URL("../db/migrations/0003_cv_visits.sql", import.meta.url), "utf8");
    for (const sql of migration.replace(/^--.*$/gm, "").split(";").filter((sql) => sql.trim())) await DB.prepare(sql).run();
    const legacyId = "cv_legacy_test_0123456789";
    await DB.prepare("INSERT INTO cv_attributions (cv_id) VALUES (?)").bind(legacyId).run();
    await DB.prepare("INSERT INTO cv_visit_events (cv_id, visited_at) VALUES (?, 100)").bind(legacyId).run();
    const vacancyMigration = await readFile(new URL("../db/migrations/0004_cv_attribution_vacancy.sql", import.meta.url), "utf8");
    await DB.prepare(vacancyMigration).run();

    await t.test("migration preserves existing IDs and visits with an empty vacancy", async () => {
      const data = await (await listCvAttributions({ env })).json();
      assert.equal(data.attributions[0].cv_id, legacyId);
      assert.equal(data.attributions[0].vacancy, "");
      assert.equal(data.attributions[0].visits, 1);
      assert.equal(data.attributions[0].last_visited_at, 100);
    });

    await t.test("signed author request registers an ID and returns its server expiry", async () => {
      const keys = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
      const jwk = { ...await crypto.subtle.exportKey("jwk", keys.publicKey), kid: "cv-test" };
      const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
      const tokenBody = `${encode({ alg: "RS256", kid: jwk.kid })}.${encode({ iss: env.CF_ACCESS_DOMAIN, aud: env.CF_ACCESS_AUD, email: env.AUTHOR_EMAIL, exp: Math.floor(Date.now() / 1000) + 60 })}`;
      const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keys.privateKey, new TextEncoder().encode(tokenBody));
      const originalFetch = globalThis.fetch;
      globalThis.fetch = (url, options) => String(url) === `${env.CF_ACCESS_DOMAIN}/cdn-cgi/access/certs`
        ? Promise.resolve(Response.json({ keys: [jwk] })) : originalFetch(url, options);
      try {
        const response = await invokeAuthorPagesFunction(registerCvAttribution, {
          env, request: request({ cv_id: id, vacancy: `  ${vacancy}  ` }, { "Cf-Access-Jwt-Assertion": `${tokenBody}.${Buffer.from(signature).toString("base64url")}` }),
        });
        assert.equal(response.status, 201);
        const data = await response.json();
        assert.equal(data.created, true);
        assert.equal(data.attribution.cv_id, id);
        assert.equal(data.attribution.vacancy, vacancy);
        assert.equal(data.attribution.visits, 0);
        assert.equal(data.attribution.last_visited_at, null);
        assert.equal(data.attribution.enabled, 1);
        assert.ok(data.attribution.expires_at > Date.now() / 1000 + 179 * 86400);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    await t.test("private listing counts each ID's events and selects its latest visit", async () => {
      await DB.prepare("INSERT INTO cv_visit_events (cv_id, visited_at) VALUES (?, 200), (?, 300)").bind(id, id).run();
      const data = await (await listCvAttributions({ env })).json();
      const current = data.attributions.find((entry) => entry.cv_id === id);
      const legacy = data.attributions.find((entry) => entry.cv_id === legacyId);
      assert.equal(current.visits, 2);
      assert.equal(current.last_visited_at, 300);
      assert.equal(legacy.visits, 1);
      assert.equal(legacy.last_visited_at, 100);
    });

    await t.test("repeated registration preserves vacancy, disabled state, expiry and visit history", async () => {
      await DB.prepare("UPDATE cv_attributions SET enabled = 0, expires_at = 123 WHERE cv_id = ?").bind(id).run();
      const response = await registerCvAttribution({ env, request: request({ cv_id: id, vacancy: "Replacement" }) });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { created: false, attribution: { cv_id: id, vacancy, enabled: 0, expires_at: 123, visits: 2, last_visited_at: 300 } });
      assert.equal(await DB.prepare("SELECT COUNT(*) AS count FROM cv_attributions WHERE cv_id = ?").bind(id).first("count"), 1);
    });

    await t.test("private listing exposes only vacancy, state and visit aggregates", async () => {
      const response = await listCvAttributions({ env });
      assert.equal(response.headers.get("cache-control"), "no-store");
      const data = await response.json();
      assert.deepEqual(data.attributions.find((entry) => entry.cv_id === id), { cv_id: id, vacancy, enabled: 0, expires_at: 123, visits: 2, last_visited_at: 300 });
    });

    await t.test("blank and omitted vacancies remain optional and zero-event IDs stay visible", async () => {
      for (const [suffix, label] of [["blank", "   "], ["omitted", undefined]]) {
        const cv_id = `cv_optional_test_${suffix}`;
        const data = await (await registerCvAttribution({ env, request: request({ cv_id, vacancy: label }) })).json();
        assert.equal(data.attribution.vacancy, "");
        assert.equal(data.attribution.visits, 0);
        assert.equal(data.attribution.last_visited_at, null);
        const list = await (await listCvAttributions({ env })).json();
        assert.ok(list.attributions.some((entry) => entry.cv_id === cv_id && entry.visits === 0 && entry.last_visited_at === null));
      }
    });
  } finally {
    await worker.dispose();
  }
});

test("registry failures return an error instead of a success confirmation", async () => {
  const env = { DB: { prepare() { throw new Error("private storage detail"); } } };
  for (const response of [await listCvAttributions({ env }), await registerCvAttribution({ env, request: request() })]) {
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "storage_unavailable" });
  }
});
