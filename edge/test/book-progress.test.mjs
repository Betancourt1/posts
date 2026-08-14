import assert from "node:assert/strict";
import test from "node:test";

import { normalizeBookProgress } from "../src/components/_utils.js";

test("renders quoted book progress written by the editor", () => {
  assert.equal(normalizeBookProgress("20"), 20);
  assert.equal(normalizeBookProgress("30"), 30);
  assert.equal(normalizeBookProgress("not set"), null);
});
