import assert from "node:assert/strict";
import test from "node:test";

import { tagRecord, uniqueTagRecords } from "../src/lib/tag-slug.mjs";

test("matches Hugo-style Unicode tag routes", () => {
  assert.deepEqual(tagRecord("Ética"), { label: "Ética", slug: "ética" });
  assert.deepEqual(tagRecord("Visualización de datos"), {
    label: "Visualización de datos",
    slug: "visualización-de-datos",
  });
  assert.deepEqual(
    uniqueTagRecords(["idea", "idea", "currently-reading"]),
    [
      { label: "idea", slug: "idea" },
      { label: "currently-reading", slug: "currently-reading" },
    ],
  );
});
