import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const soundSource = await readFile(new URL("../client/sound.js", import.meta.url), "utf8");

function flushTasks() {
  return new Promise((resolve) => setImmediate(resolve));
}

function target(selectors = ["button"]) {
  return {
    selectors: new Set(selectors),
    href: "mailto:test@example.test",
    hasAttribute() { return false; },
    getAttribute() { return null; },
    closest(selectorList) {
      if (selectorList === "a[href]") return this.selectors.has("a[href]") ? this : null;
      return selectorList.includes("button") || selectorList.includes("a[href]") ? this : null;
    },
    matches(selectorList) {
      const accepted = selectorList.split(",").map((selector) => selector.trim());
      return accepted.some((selector) => this.selectors.has(selector));
    },
  };
}

function createHarness({ stored = false, withToggle = false, failFetch = false, slowDecode = false } = {}) {
  const documentListeners = new Map();
  const toggleListeners = new Map();
  const windowListeners = new Map();
  const navigations = [];
  const pendingDecodes = [];
  const fetches = [];
  const decodes = [];
  const sources = [];
  const starts = [];
  let oscillatorCalls = 0;
  let storedValue = stored ? "true" : "false";
  let now = 0;

  const toggle = withToggle ? {
    ...target(["button"]),
    dataset: { labelEnable: "Enable sounds", labelDisable: "Disable sounds" },
    classList: { toggle() {} },
    setAttribute() {},
    addEventListener(type, handler) {
      toggleListeners.set(type, handler);
    },
  } : null;

  class FakeAudioContext {
    constructor() {
      this.destination = {};
      this.state = "running";
    }

    get currentTime() { return now; }

    resume() {
      return Promise.resolve();
    }

    close() {
      return Promise.resolve();
    }

    decodeAudioData(data) {
      const id = new Uint8Array(data)[0];
      decodes.push(id);
      if (slowDecode) return new Promise(resolve => pendingDecodes.push(() => resolve({ id, duration: 0.18 })));
      return Promise.resolve({ id, duration: 0.18 });
    }

    createBufferSource() {
      const source = {
        buffer: null,
        playbackRate: { value: 1 },
        connect() {},
        disconnect() {},
        stop() { source.stopped = true; },
        start(time) {
          starts.push({ id: source.buffer.id, time, rate: source.playbackRate.value });
        },
      };
      sources.push(source);
      return source;
    }

    createGain() {
      return { gain: { value: 0 }, connect() {}, disconnect() {} };
    }

    createOscillator() {
      oscillatorCalls += 1;
      throw new Error("The sample player must not create oscillators");
    }
  }

  const document = {
    querySelector() { return null; },
    baseURI: "https://example.test/",
    currentScript: { src: "https://example.test/js/sound.js" },
    readyState: "complete",
    getElementById(id) {
      return id === "sound-toggle" ? toggle : null;
    },
    addEventListener(type, handler) {
      const handlers = documentListeners.get(type) || [];
      handlers.push(handler);
      documentListeners.set(type, handlers);
    },
  };

  const sandbox = {
    document,
    fetch(url) {
      fetches.push(url);
      if (failFetch) return Promise.reject(new Error("offline"));
      const id = url.includes("button_up") ? 1 : 2;
      return Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(Uint8Array.of(id).buffer),
      });
    },
    localStorage: {
      getItem() {
        return storedValue;
      },
      setItem(_key, value) {
        storedValue = value;
      },
    },
    URL,
    setTimeout,
    clearTimeout,
    location: { origin: "https://example.test", pathname: "/", search: "", assign(url) { navigations.push(url); } },
    window: { AudioContext: FakeAudioContext, addEventListener(type, handler) { windowListeners.set(type, handler); } },
  };

  vm.runInNewContext(soundSource, sandbox);

  return {
    navigations,
    finishDecode() { pendingDecodes.splice(0).forEach(resolve => resolve()); },
    decodes,
    fetches,
    sources,
    starts,
    advance(seconds) { now += seconds; },
    oscillatorCalls: () => oscillatorCalls,
    dispatch(type, event) {
      for (const handler of documentListeners.get(type) || []) handler(event);
      windowListeners.get(type)?.(event);
    },
    clickToggle() {
      const event = { isTrusted: true, target: toggle };
      for (const handler of documentListeners.get("click") || []) handler(event);
      toggleListeners.get("click")(event);
    },
  };
}

test("muted pages do not fetch or play interaction samples", async () => {
  const harness = createHarness();
  await flushTasks();

  harness.dispatch("pointerdown", { isTrusted: true });
  harness.dispatch("click", { isTrusted: true, target: target() });
  await flushTasks();

  assert.deepEqual(harness.fetches, []);
  assert.deepEqual(harness.starts, []);
  assert.equal(harness.oscillatorCalls(), 0);
});

test("every action uses the same press and release samples", async () => {
  const harness = createHarness({ stored: true });
  await flushTasks();
  await flushTasks();

  assert.deepEqual(harness.fetches.sort(), [
    "https://example.test/sounds/button_down.m4a",
    "https://example.test/sounds/button_up.m4a",
  ]);

  harness.dispatch("pointerdown", { isTrusted: true });
  await flushTasks();
  await flushTasks();
  assert.deepEqual(harness.decodes.sort(), [1, 2]);

  harness.dispatch("click", { isTrusted: true, target: target(["button"]) });
  harness.dispatch("click", { isTrusted: true, target: target(["button"]) });
  harness.dispatch("click", { isTrusted: true, target: target(["a[href]"]) });
  harness.dispatch("click", { isTrusted: true, target: target(["button", ".settings button"]) });
  harness.dispatch("click", {
    isTrusted: true,
    target: target(["button", ".settings button", ".danger-button"]),
  });

  await flushTasks();
  assert.deepEqual(harness.starts.map(start => start.id), [1, 2]);
  assert.equal(new Set(harness.sources).size, 2);
  assert.equal(harness.fetches.length, 2);
  assert.equal(harness.decodes.length, 2);
  assert.equal(harness.oscillatorCalls(), 0);
});

test("the trusted toggle enables and plays the pair", async () => {
  const harness = createHarness({ withToggle: true });
  assert.equal(harness.fetches.length, 0);

  harness.clickToggle();
  await flushTasks();
  await flushTasks();

  assert.equal(harness.fetches.length, 2);
  assert.deepEqual(harness.starts, [{ id: 1, time: 0, rate: 1 }, { id: 2, time: 0.2, rate: 1.2 }]);
});

test("sample loading failures stay silent and are not retried per action", async () => {
  const harness = createHarness({ stored: true, failFetch: true });
  await flushTasks();
  await flushTasks();
  harness.dispatch("pointerdown", { isTrusted: true });
  harness.dispatch("click", { isTrusted: true, target: target(["button"]) });
  harness.dispatch("click", { isTrusted: true, target: target(["button"]) });
  await flushTasks();
  await flushTasks();

  assert.equal(harness.fetches.length, 2);
  assert.deepEqual(harness.starts, []);
  assert.equal(harness.oscillatorCalls(), 0);
});

test("quick pointer release waits 200 ms from audible press, including cold loading", async () => {
  const harness = createHarness({ stored: true });
  const button = target();
  harness.dispatch("pointerdown", { isTrusted: true, target: button, button: 0, pointerId: 1 });
  harness.advance(0.03);
  harness.dispatch("pointerup", { isTrusted: true, target: button, pointerId: 1 });
  harness.dispatch("click", { isTrusted: true, target: button });
  await flushTasks();
  await flushTasks();
  assert.deepEqual(harness.starts, [
    { id: 1, time: 0.03, rate: 1 },
    { id: 2, time: 0.23, rate: 1.2 },
  ]);
});

test("a held pointer releases immediately after the minimum has elapsed", async () => {
  const harness = createHarness({ stored: true });
  const button = target();
  harness.dispatch("pointerdown", { isTrusted: true, target: button, button: 0, pointerId: 1 });
  await flushTasks();
  await flushTasks();
  harness.advance(0.7);
  assert.equal(harness.starts.length, 1);
  harness.dispatch("pointerup", { isTrusted: true, target: button, pointerId: 1 });
  harness.dispatch("click", { isTrusted: true, target: button });
  await flushTasks();
  assert.equal(harness.starts.length, 2);
  assert.equal(harness.starts[1].time, 0.7);
});

test("Enter and Space produce one pair without key repeat or click duplication", async () => {
  for (const key of ["Enter", " "]) {
    const harness = createHarness({ stored: true });
    const button = target();
    harness.dispatch("keydown", { isTrusted: true, target: button, key });
    harness.dispatch("keydown", { isTrusted: true, target: button, key, repeat: true });
    if (key === "Enter") harness.dispatch("click", { isTrusted: true, target: button });
    harness.dispatch("keyup", { isTrusted: true, target: button, key });
    if (key === " ") harness.dispatch("click", { isTrusted: true, target: button });
    await flushTasks();
    await flushTasks();
    assert.deepEqual(harness.starts.map(start => start.id), [1, 2]);
  }
});

test("disabled, right-click, untrusted and canceled presses do not produce a pair", async () => {
  const harness = createHarness({ stored: true });
  const button = target();
  for (const event of [
    { target: { ...button, disabled: true }, isTrusted: true, button: 0 },
    { target: button, isTrusted: true, button: 2 },
    { target: button, isTrusted: false, button: 0 },
  ]) harness.dispatch("pointerdown", event);
  await flushTasks();
  assert.deepEqual(harness.starts, []);
  harness.dispatch("pointerdown", { isTrusted: true, target: button, button: 0, pointerId: 1 });
  harness.dispatch("pointercancel", { isTrusted: true, target: button, pointerId: 1 });
  harness.dispatch("pointerup", { isTrusted: true, target: button, pointerId: 1 });
  await flushTasks();
  await flushTasks();
  assert.deepEqual(harness.starts.map(start => start.id), [1]);
  assert.equal(harness.sources[0].stopped, true);
});

test("muting cancels a held or still-loading release", async () => {
  const harness = createHarness({ stored: true, withToggle: true });
  const button = target();
  harness.dispatch("pointerdown", { isTrusted: true, target: button, button: 0, pointerId: 1 });
  harness.dispatch("pointerup", { isTrusted: true, target: button, pointerId: 1 });
  harness.clickToggle();
  await flushTasks();
  await flushTasks();
  assert.deepEqual(harness.starts, []);
});

test("focus, search, navigation and keyboard form submission use the same pair", async () => {
  const harness = createHarness({ stored: true });
  harness.dispatch("keydown", { isTrusted: true, key: "Tab" });
  await flushTasks();
  await flushTasks();
  harness.dispatch("focusin", { target: { ...target(), id: "site-search-input" } });
  harness.dispatch("site-sound", { detail: { tone: "searchResults" } });
  harness.dispatch("site-sound", { detail: { tone: "navigation" } });
  harness.dispatch("submit", { isTrusted: true, target: target([".guestbook-form"]) });
  await flushTasks();
  assert.deepEqual(harness.starts.map(start => start.id), [1, 2]);
});

test("pointer focus does not add a second pair to a search field press", async () => {
  const harness = createHarness({ stored: true });
  const input = { ...target(), id: "site-search-input" };
  harness.dispatch("pointerdown", { isTrusted: true, target: input, button: 0, pointerId: 1 });
  harness.dispatch("focusin", { target: input });
  harness.dispatch("pointerup", { isTrusted: true, target: input, pointerId: 1 });
  harness.dispatch("click", { isTrusted: true, target: input });
  await flushTasks();
  await flushTasks();
  assert.deepEqual(harness.starts.map(start => start.id), [1, 2]);
});

test("a delayed touch click does not replay the pair, but a later accessibility click does", async () => {
  const harness = createHarness({ stored: true });
  const button = target();
  harness.dispatch("pointerdown", { isTrusted: true, target: button, button: 0, pointerId: 2 });
  harness.dispatch("pointerup", { isTrusted: true, target: button, pointerId: 2 });
  await new Promise(resolve => setTimeout(resolve, 10));
  harness.dispatch("click", { isTrusted: true, target: button, detail: 1 });
  await flushTasks();
  assert.deepEqual(harness.starts.map(start => start.id), [1, 2]);
  harness.advance(0.5);
  harness.dispatch("click", { isTrusted: true, target: button, detail: 0 });
  await flushTasks();
  assert.deepEqual(harness.starts.map(start => start.id), [1, 2, 1, 2]);
});

test("touch stays silent until a completed click, including canceled scroll gestures", async () => {
  const harness = createHarness({ stored: true });
  const button = target();
  const touch = { isTrusted: true, target: button, button: 0, pointerId: 2, pointerType: "touch" };
  harness.dispatch("pointerdown", touch);
  harness.dispatch("pointercancel", touch);
  await flushTasks();
  await flushTasks();
  assert.deepEqual(harness.starts, []);
  harness.dispatch("pointerdown", touch);
  harness.dispatch("pointerup", touch);
  await flushTasks();
  assert.deepEqual(harness.starts, []);
  harness.dispatch("click", { ...touch, detail: 1 });
  await flushTasks();
  assert.deepEqual(harness.starts, [{ id: 1, time: 0, rate: 1 }, { id: 2, time: 0.2, rate: 1.2 }]);
});

function linkEvent(href = "https://example.test/about/", extra = {}) {
  const link = { ...target(["a[href]"]), href, hasAttribute() { return false; } };
  return { isTrusted: true, button: 0, target: link, defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true; }, ...extra };
}

test("same-tab navigation waits for release and Enter does not wait for keyup", async () => {
  const harness = createHarness({ stored: true });
  const event = linkEvent();
  harness.dispatch("keydown", { isTrusted: true, target: event.target, key: "Enter" });
  harness.dispatch("click", event);
  assert.equal(event.defaultPrevented, true);
  assert.deepEqual(harness.navigations, []);
  await flushTasks();
  assert.deepEqual(harness.starts.map(s => s.id), [1, 2]);
  await new Promise(resolve => setTimeout(resolve, 390));
  assert.deepEqual(harness.navigations, [event.target.href]);
});

test("modified, canceled, hash, download and new-tab links retain native navigation", async () => {
  const harness = createHarness({ stored: true });
  for (const extra of [{ctrlKey: true}, {metaKey: true}, {shiftKey: true}, {altKey: true}, {button: 1}, {defaultPrevented: true}]) {
    const event = linkEvent(undefined, extra);
    harness.dispatch("click", event);
    assert.equal(event.defaultPrevented, !!extra.defaultPrevented);
  }
  for (const kind of ["hash", "download", "blank", "mailto"]) {
    const event = linkEvent(kind === "hash" ? "https://example.test/#notes" : kind === "mailto" ? "mailto:test@example.test" : undefined);
    event.target.hasAttribute = name => kind === "download" && name === "download";
    event.target.getAttribute = name => kind === "blank" && name === "target" ? "_blank" : null;
    harness.dispatch("click", event);
    assert.equal(event.defaultPrevented, false, kind);
  }
  await flushTasks();
  assert.deepEqual(harness.navigations, []);
});

test("rapid pointer bursts preserve one pair and accept the next after it finishes", async () => {
  const harness = createHarness({ stored: true });
  const button = target();
  for (let i = 0; i < 20; i++) {
    harness.dispatch("pointerdown", { isTrusted: true, target: button, button: 0, pointerId: i });
    harness.dispatch("pointerup", { isTrusted: true, target: button, pointerId: i });
    harness.dispatch("click", { isTrusted: true, target: button, detail: 1 });
  }
  await flushTasks();
  assert.deepEqual(harness.starts.map(s => s.id), [1, 2]);
  harness.advance(0.5);
  harness.dispatch("click", { isTrusted: true, target: button, detail: 0 });
  await flushTasks();
  assert.deepEqual(harness.starts.map(s => s.id), [1, 2, 1, 2]);
});

test("failed audio never strands a link", async () => {
  const harness = createHarness({ stored: true, failFetch: true });
  const event = linkEvent();
  harness.dispatch("click", event);
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.deepEqual(harness.navigations, [event.target.href]);
});

test("overlapping pointer and keyboard gestures and blur never lock audio", async () => {
  const harness = createHarness({ stored: true });
  const button = target();
  harness.dispatch("pointerdown", {isTrusted: true, target: button, button: 0, pointerId: 1});
  harness.dispatch("keydown", {isTrusted: true, target: button, key: "Enter"});
  harness.dispatch("keyup", {isTrusted: true, target: button, key: "Enter"});
  await flushTasks();
  assert.deepEqual(harness.starts.map(s => s.id), [1, 2]);
  harness.advance(0.5);
  harness.dispatch("keydown", {isTrusted: true, target: button, key: " "});
  harness.dispatch("blur", {});
  await flushTasks();
  assert.deepEqual(harness.starts.map(s => s.id), [1, 2, 1, 2]);
  harness.advance(0.5);
  harness.dispatch("click", {isTrusted: true, target: button, detail: 0});
  await flushTasks();
  assert.deepEqual(harness.starts.map(s => s.id), [1, 2, 1, 2, 1, 2]);
});

test("cold decoding times out, navigation proceeds and late buffers stay silent", async () => {
  const harness = createHarness({ stored: true, slowDecode: true });
  const event = linkEvent();
  harness.dispatch("click", event);
  await flushTasks();
  await new Promise(resolve => setTimeout(resolve, 480));
  assert.deepEqual(harness.navigations, [event.target.href]);
  harness.finishDecode();
  await flushTasks();
  assert.deepEqual(harness.starts, []);
  harness.dispatch("click", {isTrusted: true, target: target(), detail: 0});
  await flushTasks();
  assert.deepEqual(harness.starts.map(s => s.id), [1, 2]);
});

test("empty same-page fragments do not delay", async () => {
  const harness = createHarness({stored: true});
  const event = linkEvent("https://example.test/#");
  harness.dispatch("click", event);
  assert.equal(event.defaultPrevented, false);
});
