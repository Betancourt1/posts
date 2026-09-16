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
    getBoundingClientRect() { return { left: 100, top: 200, width: 300, height: 200 }; },
    animate(frames, options) {
      this.animation = { frames, options, cancel() { this.canceled = true; } };
      return this.animation;
    },
  };
}

function setup(linked = false, reducedMotion = false) {
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
  vm.runInNewContext(source, { window: { matchMedia: () => ({ matches: reducedMotion }) }, document: {
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

test("animates from the source rectangle and cancels the animation on close", () => {
  const { image, trigger, expanded, dialog } = setup();
  image.getBoundingClientRect = () => ({ left: 0, top: 50, width: 150, height: 100 });
  trigger.emit("click");
  assert.equal(expanded.animation.frames[0].transform, "translate(-175px, -200px) scale(0.5, 0.5)");
  assert.equal(expanded.animation.frames[1].transform, "none");
  assert.equal(expanded.animation.options.duration, 280);
  dialog.close();
  assert.equal(expanded.animation.canceled, true);
});

test("respects reduced motion without changing opening or closing", () => {
  const { trigger, expanded, dialog } = setup(false, true);
  trigger.emit("click");
  assert.equal(dialog.open, true);
  assert.equal(expanded.animation, undefined);
  dialog.close();
  assert.equal(dialog.open, false);
});
