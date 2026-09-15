import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../client/image-viewer.js", import.meta.url), "utf8");

function element() {
  const listeners = new Map();
  const attributes = new Map();
  const classes = new Set();
  return {
    attributes,
    classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name), contains: (name) => classes.has(name) },
    setAttribute: (name, value) => attributes.set(name, value),
    removeAttribute: (name) => attributes.delete(name),
    addEventListener(name, callback) { listeners.set(name, callback); },
    emit(name, props = {}) {
      const event = { target: this, prevented: false, preventDefault() { this.prevented = true; }, ...props };
      listeners.get(name)?.(event);
      return event;
    },
    focus(options) { this.focusOptions = options; },
  };
}

function setup(linked = false) {
  const root = element();
  const image = Object.assign(element(), { src: "/fallback.jpg", currentSrc: "/full.jpg", alt: "Violeta" });
  const trigger = linked ? element() : image;
  image.closest = () => linked ? trigger : null;
  const expanded = element();
  const button = element();
  const dialog = Object.assign(element(), {
    dataset: { openLabel: "Ampliar imagen" },
    querySelector: (selector) => selector === "img" ? expanded : button,
    showModal() { this.open = true; },
    close() { this.open = false; this.emit("close"); },
  });
  vm.runInNewContext(source, { document: {
    documentElement: root,
    querySelector: () => dialog,
    querySelectorAll: () => [image],
  } });
  return { root, image, trigger, expanded, button, dialog };
}

test("opens the displayed image without navigation and closes using the dedicated button", () => {
  const { root, trigger, expanded, button, dialog } = setup(true);
  assert.equal(trigger.emit("click").prevented, true);
  assert.equal(dialog.open, true);
  assert.equal(expanded.src, "/full.jpg");
  assert.equal(expanded.alt, "Violeta");
  assert.equal(root.classList.contains("image-viewer-open"), true);
  button.emit("click");
  assert.equal(dialog.open, false);
  assert.equal(root.classList.contains("image-viewer-open"), false);
  assert.equal(trigger.focusOptions.preventScroll, true);
});

test("only the area outside the image closes the dialog", () => {
  const { trigger, expanded, dialog } = setup();
  trigger.emit("click");
  dialog.emit("click", { target: expanded });
  assert.equal(dialog.open, true);
  dialog.emit("click");
  assert.equal(dialog.open, false);
});

test("bare images support Enter and Space and keep their accessible description", () => {
  for (const key of ["Enter", " "]) {
    const { trigger, dialog } = setup();
    assert.equal(trigger.tabIndex, 0);
    assert.equal(trigger.attributes.get("role"), "button");
    assert.equal(trigger.attributes.get("aria-haspopup"), "dialog");
    assert.equal(trigger.attributes.get("aria-label"), "Ampliar imagen: Violeta");
    assert.equal(trigger.emit("keydown", { key }).prevented, true);
    assert.equal(dialog.open, true);
    dialog.close(); // Native Escape dispatches the same close event.
    assert.equal(trigger.focusOptions.preventScroll, true);
  }
});

test("modified link clicks retain the original link behavior", () => {
  const { trigger, dialog } = setup(true);
  assert.equal(trigger.emit("click", { ctrlKey: true }).prevented, false);
  assert.equal(dialog.open, undefined);
});
