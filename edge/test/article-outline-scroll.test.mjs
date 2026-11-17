import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";

const script = await readFile(new URL("../client/article-outline.js", import.meta.url), "utf8");

test("the index follows section changes without overriding manual scrolling", () => {
  const listeners = {};
  const headings = Array.from({ length: 8 }, (_, i) => ({
    tagName: i % 2 ? "H3" : "H2", id: `heading-${i}`, textContent: `Heading ${i}`,
    top: i * 200, getBoundingClientRect() { return { top: this.top }; },
  }));
  const links = [];
  const outline = {
    tagName: "NAV", dataset: { minHeadings: 1 }, scrollTop: 0,
    querySelector: () => ({ appendChild() {} }),
    closest: () => ({ querySelector: () => ({ querySelectorAll: () => headings }) }),
    getBoundingClientRect: () => ({ top: 100, bottom: 300 }),
  };
  const document = {
    querySelector: (selector) => selector === ".article-outline" ? outline : null,
    createElement(tag) {
      if (tag === "li") return { appendChild() {} };
      const i = links.length;
      const link = { attributes: {}, setAttribute(k, v) { this.attributes[k] = v; }, removeAttribute(k) { delete this.attributes[k]; }, getBoundingClientRect() { return { top: 140 + i * 40 - outline.scrollTop, bottom: 160 + i * 40 - outline.scrollTop }; } };
      links.push(link);
      return link;
    },
  };
  runInNewContext(script, { document, window: { matchMedia: () => ({ matches: false }), addEventListener: (event, handler) => { listeners[event] = handler; } } });
  assert.equal(links[0].attributes["aria-current"], "location");
  headings[5].top = 100;
  listeners.scroll();
  assert.equal(links[5].attributes["aria-current"], "location");
  assert.ok(outline.scrollTop > 0);
  outline.scrollTop = 0;
  listeners.scroll();
  assert.equal(outline.scrollTop, 0);
  listeners.resize();
  assert.ok(outline.scrollTop > 0);
  headings[5].top = 1000;
  listeners.scroll();
  assert.equal(links[0].attributes["aria-current"], "location");
  assert.equal(outline.scrollTop, 8);
});
