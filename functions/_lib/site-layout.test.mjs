import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const notFoundLayout = readFileSync(new URL("../../layouts/404.html", import.meta.url), "utf8");
const singleLayout = readFileSync(new URL("../../layouts/_default/single.html", import.meta.url), "utf8");

test("the 404 page localizes in place without redirecting", () => {
  assert.match(notFoundLayout, /data-not-found-title/);
  assert.match(notFoundLayout, /path\.startsWith\("\/es\/"\)/);
  assert.match(notFoundLayout, /document\.documentElement\.lang = "es"/);
  assert.doesNotMatch(notFoundLayout, /location\.(replace|assign)/);
  assert.doesNotMatch(notFoundLayout, /URLSearchParams|\?from=/);
});

test("single pages show the front matter title only when Markdown has no H1", () => {
  assert.match(singleLayout, /\$hasContentTitle := gt \(len \(findRE/);
  assert.match(singleLayout, /\{\{ if not \$hasContentTitle \}\}/);
  assert.doesNotMatch(singleLayout, /if not \(or \(eq \.Section "posts"\)/);
});
