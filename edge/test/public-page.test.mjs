import assert from "node:assert/strict";
import test from "node:test";

import {
  archiveMonths,
  languageForRoute,
  syntheticRoute,
} from "../src/lib/public-page.mjs";

test("recognizes localized tag routes without swallowing normal pages", () => {
  assert.deepEqual(syntheticRoute("/tags/"), {
    kind: "tags",
    lang: "en",
    slug: null,
    path: "/tags/",
  });
  assert.deepEqual(syntheticRoute("/es/tags/%C3%A9tica"), {
    kind: "tag",
    lang: "es",
    slug: "ética",
    path: "/es/tags/ética/",
  });
  assert.equal(syntheticRoute("/es/posts/"), null);
});

test("derives language and recent archive counts from runtime rows", () => {
  assert.equal(languageForRoute("/"), "en");
  assert.equal(languageForRoute("/es/posts/example/"), "es");
  assert.deepEqual(
    archiveMonths([
      { date: "2026-07-14" },
      { date: "2026-07-01" },
      { date: "2026-06-02" },
      { date: null },
    ]),
    [
      { key: "2026-07", count: 2 },
      { key: "2026-06", count: 1 },
    ],
  );
});
