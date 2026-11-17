import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";

const script = await readFile(new URL("../client/wandering-snail.js", import.meta.url), "utf8");

function createSnail(draws, reducedMotion = false, quotes = []) {
  let click;
  let frame;
  let pointerMove;
  let outsideClick;
  const bubbles = [];
  function makeSnail() {
    const snail = {
      dataset: {},
      style: { setProperty() {} },
      closest: () => snail,
      cloneNode: () => makeSnail(),
    };
    return snail;
  }
  const snail = makeSnail();
  const path = {
    children: [snail],
    querySelector: () => snail,
    addEventListener(event, handler) { if (event === "click") click = handler; },
    appendChild(child) { if (child.dataset) this.children.push(child); else bubbles.push(child); },
  };
  const math = Object.create(Math);
  math.random = () => draws.shift() ?? 0.125;
  runInNewContext(script, {
    document: {
      documentElement: { lang: "es" },
      querySelector: (selector) => selector === ".snail-path" ? path : { getBoundingClientRect: () => ({ bottom: 100 }) },
      createElement: () => ({ style: {}, replaceChildren(...children) { this.children = children; }, offsetWidth: 200, offsetHeight: 100 }),
      addEventListener(event, handler) { if (event === "click") outsideClick = handler; },
    },
    window: { innerWidth: 1200, innerHeight: 800, matchMedia: () => ({ matches: reducedMotion }), addEventListener(event, handler) { if (event === "pointermove") pointerMove = handler; } },
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({ quotes }) }),
    Math: math,
    requestAnimationFrame: (callback) => { frame = callback; },
  });
  return { snail, path, click: (target = snail) => click({ target }), tick: (time) => frame(time), point: (x, y) => pointerMove({ pointerType: "mouse", clientX: x, clientY: y }), bubbles, outside: () => outsideClick({ target: { closest: () => null } }) };
}

test("selection follows the seven descending rarity weights", () => {
  const draws = [0.14, 0.395, 0.60, 0.76, 0.875, 0.95, 0.99];
  assert.deepEqual(draws.map((draw) => createSnail([0, 0, draw]).snail.dataset.design), [1, 2, 3, 4, 6, 8, 7]);
});

test("clicking keeps the original and adds an independently clickable random snail", () => {
  const { snail, path, click, tick } = createSnail([0.3, 0.3, 0, 0.125, 0.5, 0.99]);
  const initialPosition = snail.style.transform;
  tick(100);
  tick(200);
  assert.notEqual(snail.style.transform, initialPosition);
  click();
  assert.equal(path.children.length, 2);
  assert.equal(snail.dataset.design, 1);
  assert.equal(path.children[1].dataset.design, 7);
  click(path.children[1]);
  assert.equal(path.children.length, 3);
});

test("copies near the edge stay visible, and reduced motion stays still", () => {
  const { snail, path, click, tick } = createSnail([1, 1, 0, 0.125, 0.5], true);
  const position = snail.style.transform;
  tick(100);
  tick(200);
  assert.equal(snail.style.transform, position);
  click();
  assert.equal(path.children[1].style.transform, "translate(1088px, 756px)");
});

test("nearby pointer attracts the snail and the header remains a boundary", () => {
  const { snail, tick, point } = createSnail([0.3, 0, 0, 0.125, 0.5]);
  assert.match(snail.style.transform, /, 100px\)/);
  point(270, 122);
  tick(100);
  tick(200);
  const [, x, y] = snail.style.transform.match(/translate\(([\d.]+)px, ([\d.]+)px\)/);
  assert.ok(Number(x) < 343.8);
  assert.ok(Number(y) >= 100);
});

test("a click shows the selected quote only until an outside click", async () => {
  const { path, bubbles, click, outside } = createSnail([0.3, 0.3, 0, 0.125, 0.5], false, [{ text: "A real quote", author: "An author" }]);
  await new Promise(setImmediate);
  assert.equal(bubbles[0].hidden, true);
  click();
  await new Promise(setImmediate);
  assert.equal(path.children.length, 2);
  assert.equal(bubbles[0].hidden, false);
  assert.equal(bubbles[0].children[0].textContent, "“A real quote”");
  assert.equal(bubbles[0].children[1].textContent, "— An author");
  assert.equal(bubbles[1].hidden, true);
  outside();
  assert.equal(bubbles[0].hidden, true);
});
