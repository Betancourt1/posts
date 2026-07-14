import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { graphPostPayload } from "../src/lib/graph-payload.mjs";

test("projects D1 rows into the established interactive graph payload", () => {
  assert.deepEqual(graphPostPayload([
    {
      title: "Connected note",
      path: "/posts/connected-note/",
      tags: [
        { label: "design", path: "/tags/design/" },
        { label: "systems", path: "/tags/systems/" },
      ],
    },
    {
      title: "Ignored empty note",
      path: "/posts/empty/",
      tags: [],
    },
  ]), {
    posts: [{
      title: "Connected note",
      permalink: "/posts/connected-note/",
      tags: ["design", "systems"],
    }],
    tagLinks: {
      design: "/tags/design/",
      systems: "/tags/systems/",
    },
  });
});

test("the edge build ships the mature graph client as its source of truth", async () => {
  const prepareScript = await readFile(new URL("../scripts/prepare-public.mjs", import.meta.url), "utf8");
  const graphClient = await readFile(new URL("../../static/js/knowledge-graph.js", import.meta.url), "utf8");

  assert.match(prepareScript, /"js\/knowledge-graph\.js"/);
  assert.match(graphClient, /filterGraphToEgoNetwork/);
  assert.match(graphClient, /filterGraphToRepeatedTags/);
  assert.match(graphClient, /node\.count > 1/);
  assert.match(graphClient, /url\.searchParams\.set\("format", "posts"\)/);
  assert.match(graphClient, /toggleMaximize/);
  assert.match(graphClient, /return url === "\/" \? "\/admin\/" : "\/admin" \+ url/);
});

test("the site and graph share the restored softer palette", async () => {
  const stylesheet = await readFile(new URL("../../static/css/site.css", import.meta.url), "utf8");

  assert.match(stylesheet, /--accent: oklch\(0\.686 0\.058 169\.334\)/);
  assert.match(stylesheet, /--graph-tag: oklch\(0\.686 0\.058 169\.334\)/);
  assert.match(stylesheet, /--accent: oklch\(0\.496 0\.075 169\.234\)/);
  assert.match(stylesheet, /--graph-tag-hover: oklch\(0\.426 0\.064 169\.484\)/);
});
