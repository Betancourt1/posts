import assert from "node:assert/strict";
import test from "node:test";

import {
  invokeAuthorPagesFunction,
  invokePagesFunction,
} from "../src/lib/pages-function-adapter.mjs";

test("the plain adapter preserves the Pages function context and response", async () => {
  const env = { VALUE: "kept" };
  const request = new Request("https://example.com/admin/editor");

  const response = await invokePagesFunction(({ env: receivedEnv, request: receivedRequest, data }) => {
    assert.equal(receivedEnv, env);
    assert.equal(receivedRequest, request);
    assert.deepEqual(data, {});
    return new Response("ok", { status: 202 });
  }, { env, request });

  assert.equal(response.status, 202);
  assert.equal(await response.text(), "ok");
});

test("the author adapter rejects requests before invoking an admin API handler", async () => {
  let invoked = false;
  const request = new Request("https://example.com/admin/api/health");
  const env = {
    CF_ACCESS_DOMAIN: "https://example.cloudflareaccess.com",
    CF_ACCESS_AUD: "audience",
    AUTHOR_EMAIL: "author@example.com",
  };

  const response = await invokeAuthorPagesFunction(() => {
    invoked = true;
    return new Response("unexpected");
  }, { env, request });

  assert.equal(invoked, false);
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { error: "No hay JWT de Cloudflare Access." });
});
