import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { acceptsPush, verifyGitHubSignature } from "../src/lib/webhook-auth.mjs";

test("verifies GitHub sha256 signatures", async () => {
  const body = JSON.stringify({ ref: "refs/heads/main" });
  const secret = "local-test-secret";
  const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

  assert.equal(await verifyGitHubSignature(body, signature, secret), true);
  assert.equal(await verifyGitHubSignature(`${body}x`, signature, secret), false);
  assert.equal(await verifyGitHubSignature(body, "sha256=bad", secret), false);
});

test("accepts only pushes for the configured repository and branch", () => {
  const env = {
    GITHUB_OWNER: "Betancourt1",
    GITHUB_REPO: "posts",
    GITHUB_BRANCH: "main",
  };
  const push = {
    ref: "refs/heads/main",
    deleted: false,
    repository: { full_name: "Betancourt1/posts" },
  };

  assert.equal(acceptsPush(push, env), true);
  assert.equal(acceptsPush({ ...push, ref: "refs/heads/preview" }, env), false);
  assert.equal(acceptsPush({ ...push, deleted: true }, env), false);
});
