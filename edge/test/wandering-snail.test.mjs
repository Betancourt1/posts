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
  const screen = { innerWidth: 1200, innerHeight: 800, matchMedia: () => ({ matches: reducedMotion }), addEventListener(event, handler) { if (event === "pointermove") pointerMove = handler; } };
  runInNewContext(script, {
    document: {
      documentElement: { lang: "es" },
      querySelector: (selector) => selector === ".snail-path" ? path : { getBoundingClientRect: () => ({ bottom: 100 }) },
      createElement: () => ({ style: {}, replaceChildren(...children) { this.children = children; }, offsetWidth: 200, offsetHeight: 100 }),
      addEventListener(event, handler) { if (event === "click") outsideClick = handler; },
    },
    window: screen,
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({ quotes }) }),
    Math: math,
    requestAnimationFrame: (callback) => { frame = callback; },
  });
  return { snail, path, click: (target = snail) => click({ target }), tick: (time) => frame(time), point: (x, y) => pointerMove({ pointerType: "mouse", clientX: x, clientY: y }), bubbles, screen, outside: () => outsideClick({ target: { closest: () => null } }) };
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

test("a snail keeps its quote and pauses until its dialogue closes", async () => {
  const draws = [0.3, 0.3, 0, 0.125, 0.5];
  const { snail, path, bubbles, click, tick, outside } = createSnail(draws, false, [
    { text: "First quote", author: "First author" },
    { text: "Second quote", author: "Second author" },
  ]);
  await new Promise(setImmediate);
  draws.push(0, 0, 0, 0.99);
  click();
  await new Promise(setImmediate);
  const quote = bubbles[0].children[0].textContent;
  assert.equal(quote, "“Second quote”");
  assert.equal(snail.dataset.reading, "true");
  const paused = snail.style.transform;
  tick(100);
  tick(200);
  assert.equal(snail.style.transform, paused);
  outside();
  assert.equal(snail.dataset.reading, undefined);
  tick(300);
  assert.notEqual(snail.style.transform, paused);
  draws.push(0, 0, 0, 0);
  click();
  await new Promise(setImmediate);
  assert.equal(bubbles[0].children[0].textContent, quote);
  assert.equal(path.children.length, 3);
});

function assertSeparated(snails) {
  const positions = snails.filter((snail) => !snail.hidden).map((snail) => {
    const [, x, y] = snail.style.transform.match(/translate\(([\d.]+)px, ([\d.]+)px\)/);
    return { x: Number(x), y: Number(y) };
  });
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      assert.ok(Math.abs(positions[i].x - positions[j].x) >= 58 || Math.abs(positions[i].y - positions[j].y) >= 48);
    }
  }
}

test("repeated copies and moving snails keep their distance, even on resize", () => {
  const { snail, path, click, tick, point, screen } = createSnail([0.4, 0.4, 0, 0.125, 0.5]);
  for (let i = 0; i < 20; i++) { click(snail); assertSeparated(path.children); }
  point(500, 420);
  for (let time = 100; time < 5000; time += 100) { tick(time); assertSeparated(path.children); }
  screen.innerWidth = 250;
  screen.innerHeight = 200;
  tick(5100);
  assertSeparated(path.children);
  assert.ok(path.children.some((item) => item.hidden));
  screen.innerWidth = 1200;
  screen.innerHeight = 800;
  tick(5200);
  assertSeparated(path.children);
  assert.ok(path.children.every((item) => !item.hidden));
});

test("a full viewport does not create an overlapping duplicate", () => {
  const { snail, path, click, tick, screen } = createSnail([0, 0, 0, 0.125, 0.5], true);
  screen.innerWidth = 112;
  screen.innerHeight = 192;
  tick(100);
  for (let i = 0; i < 10; i++) click(snail);
  assertSeparated(path.children);
  const count = path.children.length;
  click(snail);
  assert.equal(path.children.length, count);
});

test("placement finds a gap between irregularly positioned snails", () => {
  const instrumented = script.replace("})();", "globalThis.findSpaceForTest = findSpace; })();");
  const first = { dataset: {}, style: { setProperty() {} } };
  const path = { querySelector: () => first, appendChild() {}, addEventListener() {} };
  const context = {
    document: { documentElement: { lang: "en" }, querySelector: (selector) => selector === ".snail-path" ? path : null, createElement: () => ({ style: {} }), addEventListener() {} },
    window: { innerWidth: 234, innerHeight: 264, matchMedia: () => ({ matches: false }), addEventListener() {} },
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({ quotes: [] }) }),
    requestAnimationFrame() {},
  };
  runInNewContext(instrumented, context);
  const occupied = [[39, 212], [3, 125], [151, 166], [127, 104], [93, 157]].map(([x, y]) => ({ x, y }));
  const result = context.findSpaceForTest(39, 212, { maxX: 180, minY: 100, maxY: 220 }, occupied);
  assert.ok(result);
  assert.ok(occupied.every((other) => Math.abs(result.x - other.x) >= 58 || Math.abs(result.y - other.y) >= 48));
});
