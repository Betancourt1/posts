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

test("the graph keeps its monochrome palette in both site themes", async () => {
  const stylesheet = await readFile(new URL("../../static/css/site.css", import.meta.url), "utf8");

  assert.equal(stylesheet.match(/--graph-bg: #000000;/g)?.length, 2);
  assert.equal(stylesheet.match(/--graph-node: #f5f5f5;/g)?.length, 2);
  assert.equal(stylesheet.match(/--graph-link: #f5f5f5;/g)?.length, 2);
});

test("the graph still renders weighted edges", async () => {
  const graphClient = await readFile(new URL("../../static/js/knowledge-graph.js", import.meta.url), "utf8");

  assert.match(graphClient, /link\.weight \+= 1/);
  assert.match(graphClient, /Math\.pow\(Math\.max\(0, count - 1\), 0\.8\) \* 1\.7/);
  assert.match(graphClient, /Math\.log2\(link\.weight \+ 1\)/);
  assert.match(graphClient, /ctx\.lineWidth = 0\.35 \+ Math\.min\(1\.65, weightScale \* 0\.32\)/);
});
