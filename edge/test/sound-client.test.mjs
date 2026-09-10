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
    closest(selectorList) {
      return this.matches(selectorList) ? this : null;
    },
    hasAttribute() { return false; },
    matches(selectorList) {
      const accepted = selectorList.split(",").map((selector) => selector.trim());
      return accepted.some((selector) => this.selectors.has(selector));
    },
  };
}

function createHarness({ stored = false, withToggle = false, failFetch = false } = {}) {
  const documentListeners = new Map();
  const toggleListeners = new Map();
  const windowListeners = new Map();
  const fetches = [];
  const decodes = [];
  const sources = [];
  const navigations = [];
  const timers = [];
  let now = 0;
  const starts = [];
  let oscillatorCalls = 0;
  let storedValue = stored ? "true" : "false";

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

    resume() {
      return Promise.resolve();
    }

    close() {
      return Promise.resolve();
    }

    decodeAudioData(data) {
      const id = new Uint8Array(data)[0];
      decodes.push(id);
      return Promise.resolve({ id, duration: 0.11 });
    }

    createBufferSource() {
      const source = {
        buffer: null,
        connect() {},
        start() {
          starts.push(source.buffer.id);
        },
      };
      sources.push(source);
      return source;
    }

    createGain() {
      return { gain: { value: 0 }, connect() {} };
    }

    createOscillator() {
      oscillatorCalls += 1;
      throw new Error("The sample player must not create oscillators");
    }
  }

  const document = {
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
      const id = url.includes("default") ? 1 : url.includes("navigation") ? 2 : url.includes("button-down") ? 4 : url.includes("button-up") ? 5 : 3;
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
    performance: { now: () => now },
    setTimeout(handler, delay) { const timer = { handler, delay }; timers.push(timer); return timer; },
    clearTimeout(timer) { const index = timers.indexOf(timer); if (index !== -1) timers.splice(index, 1); },
    window: { location: { assign(url) { navigations.push(url); } }, AudioContext: FakeAudioContext, addEventListener(type, handler) { windowListeners.set(type, handler); } },
  };

  vm.runInNewContext(soundSource, sandbox);

  return {
    navigations,
    timers,
    advance(ms) { now += ms; },
    runTimers() { timers.splice(0).forEach(timer => timer.handler()); },
    decodes,
    fetches,
    sources,
    starts,
    oscillatorCalls: () => oscillatorCalls,
    dispatch(type, event) {
      for (const handler of documentListeners.get(type) || []) handler(event);
    },
    blur() { windowListeners.get("blur")(); },
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

test("stored opt-in caches samples and maps each action with strict precedence", async () => {
  const harness = createHarness({ stored: true });
  await flushTasks();
  await flushTasks();

  assert.deepEqual(harness.fetches.sort(), [
    "https://example.test/sounds/button-down.m4a",
    "https://example.test/sounds/button-up.m4a",
    "https://example.test/sounds/interaction-default.wav",
    "https://example.test/sounds/interaction-navigation.wav",
    "https://example.test/sounds/interaction-subcontrol.wav",
  ]);

  harness.dispatch("pointerdown", { isTrusted: true });
  await flushTasks();
  await flushTasks();
  assert.deepEqual(harness.decodes.sort(), [1, 2, 3, 4, 5]);

  harness.dispatch("click", { isTrusted: true, target: target(["summary"]) });
  harness.dispatch("click", { isTrusted: true, target: target(["summary"]) });
  harness.dispatch("click", { isTrusted: true, target: target(["a[href]"]) });
  harness.dispatch("click", { isTrusted: true, target: target(["summary", ".author-more-actions > summary"]) });
  harness.dispatch("click", {
    isTrusted: true,
    target: target(["summary", ".author-more-actions > summary", ".danger-button"]),
  });

  assert.deepEqual(harness.starts, [1, 1, 2, 3, 2]);
  assert.equal(new Set(harness.sources).size, 5);
  assert.equal(harness.fetches.length, 5);
  assert.equal(harness.decodes.length, 5);
  assert.equal(harness.oscillatorCalls(), 0);
});

test("the trusted toggle enables, loads, and plays the release sample", async () => {
  const harness = createHarness({ withToggle: true });
  assert.equal(harness.fetches.length, 0);

  harness.clickToggle();
  await flushTasks();
  await flushTasks();

  assert.equal(harness.fetches.length, 5);
  assert.deepEqual(harness.starts, [5]);
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

  assert.equal(harness.fetches.length, 5);
  assert.deepEqual(harness.starts, []);
  assert.equal(harness.oscillatorCalls(), 0);
});

function pressEvent(overrides = {}) {
  return { isTrusted: true, button: 0, pointerId: 1,
    target: target(["button"]), ...overrides };
}

async function readyHarness(options = {}) {
  const harness = createHarness({ stored: true, ...options });
  harness.dispatch("pointerdown", { isTrusted: true });
  await flushTasks();
  await flushTasks();
  return harness;
}

test("main buttons play down on press and up on outside release without a third click", async () => {
  const harness = await readyHarness();
  const event = pressEvent();
  harness.dispatch("pointerdown", event);
  assert.deepEqual(harness.starts, [4]);
  harness.dispatch("pointerup", pressEvent({ pointerId: 2 }));
  assert.deepEqual(harness.starts, [4]);
  harness.dispatch("pointerup", pressEvent({ target: target([]) }));
  harness.dispatch("click", event);
  harness.runTimers();
  assert.deepEqual(harness.starts, [4, 5]);
});

test("Enter and Space pair sounds once despite native clicks and key repeat", async () => {
  for (const key of ["Enter", " "]) {
    const harness = await readyHarness();
    const event = pressEvent({ key });
    harness.dispatch("keydown", event);
    harness.dispatch("keydown", { ...event, repeat: true });
    harness.dispatch("click", event);
    assert.deepEqual(harness.starts, [4]);
    harness.dispatch("keyup", { ...event, key: "Escape" });
    harness.dispatch("keyup", event);
    harness.dispatch("click", event);
    harness.runTimers();
    assert.deepEqual(harness.starts, [4, 5]);
  }
});

test("cancel, blur, and muting discard pending release sounds", async () => {
  for (const cancel of ["pointercancel", "blur", "mute"]) {
    const harness = await readyHarness({ withToggle: true });
    const event = pressEvent();
    harness.dispatch("pointerdown", event);
    if (cancel === "blur") harness.blur();
    else if (cancel === "mute") harness.clickToggle();
    else harness.dispatch(cancel, event);
    harness.dispatch("pointerup", event);
    assert.deepEqual(harness.starts, [4], cancel);
  }
});

test("first fast press never plays late or reverses order while decoding", async () => {
  const harness = createHarness({ stored: true });
  const event = pressEvent();
  harness.dispatch("pointerdown", event);
  harness.dispatch("pointerup", event);
  await flushTasks();
  await flushTasks();
  assert.deepEqual(harness.starts, []);
  harness.dispatch("pointerdown", event);
  harness.dispatch("pointerup", event);
  harness.runTimers();
  assert.deepEqual(harness.starts, [4, 5]);
});

test("disabled, secondary, untrusted, and muted presses remain silent", async () => {
  const harness = await readyHarness();
  const disabled = target(["button"]);
  disabled.disabled = true;
  for (const event of [pressEvent({ target: disabled }), pressEvent({ button: 2 }),
    pressEvent({ isPrimary: false }), pressEvent({ isTrusted: false }),
    pressEvent({ target: target(["button", '[aria-disabled="true"]']) })]) {
    harness.dispatch("pointerdown", event);
    harness.dispatch("pointerup", event);
  }
  assert.deepEqual(harness.starts, []);
  const muted = createHarness();
  muted.dispatch("pointerdown", pressEvent());
  muted.dispatch("pointerup", pressEvent());
  assert.deepEqual(muted.fetches, []);
  assert.deepEqual(muted.starts, []);
});


test("all button types and language links get paired sounds", async () => {
  for (const selectors of [["button"], ["[role='button']"], ["input[type='submit']"],
    ["input[type='reset']"], ["input[type='button']"], ["a[href]", "a.button"], ["a[href]", "a.lang-toggle"]]) {
    const harness = await readyHarness();
    const event = pressEvent({ target: target(selectors) });
    harness.dispatch("pointerdown", event);
    harness.dispatch("pointerup", event);
    harness.dispatch("click", { ...event, preventDefault() {} });
    harness.runTimers();
    assert.deepEqual(harness.starts, [4, 5]);
  }
});

test("language mouse click waits only for release audio; held Enter waits for keyup", async () => {
  for (const keyboard of [false, true]) {
    const harness = await readyHarness();
    const link = { ...target(["a[href]", "a.lang-toggle"]), href: "/es/" };
    const event = pressEvent({ target: link, key: keyboard ? "Enter" : undefined });
    harness.dispatch(keyboard ? "keydown" : "pointerdown", event);
    if (!keyboard) harness.dispatch("pointerup", event);
    let prevented = false;
    harness.dispatch("click", { ...event, preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
    assert.deepEqual(harness.navigations, []);
    if (keyboard) {
      assert.equal(harness.timers.length, 0);
      harness.dispatch("keyup", event);
    }
    assert.deepEqual(harness.timers.map(timer => timer.delay), [120, 230]);
    harness.runTimers();
    assert.deepEqual(harness.starts, [4, 5]);
    assert.deepEqual(harness.navigations, ["/es/"]);
  }
});

test("language modifiers, new tabs, downloads and cancellation preserve browser behavior", async () => {
  for (const extra of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }]) {
    const harness = await readyHarness();
    const event = pressEvent({ target: target(["a[href]", "a.lang-toggle"]), ...extra });
    harness.dispatch("pointerdown", event);
    harness.dispatch("pointerup", event);
    harness.dispatch("click", { ...event, preventDefault() { assert.fail("modified click intercepted"); } });
    harness.runTimers();
    assert.deepEqual(harness.navigations, []);
  }
  for (const attributes of [{ target: "_blank" }, { hasAttribute() { return true; } }]) {
    const harness = await readyHarness();
    const event = pressEvent({ target: { ...target(["a[href]", "a.lang-toggle"]), ...attributes } });
    harness.dispatch("pointerdown", event);
    harness.dispatch("pointerup", event);
    harness.dispatch("click", { ...event, preventDefault() { assert.fail("link behavior intercepted"); } });
    harness.runTimers();
    assert.deepEqual(harness.navigations, []);
  }
  const harness = await readyHarness();
  const event = pressEvent({ target: target(["a[href]", "a.lang-toggle"]), key: "Enter" });
  harness.dispatch("keydown", event);
  harness.dispatch("click", { ...event, preventDefault() {} });
  harness.blur();
  harness.dispatch("keyup", event);
  assert.equal(harness.timers.length, 0);
});


test("quick release has a 120ms minimum gap; a long hold releases immediately", async () => {
  for (const held of [20, 75, 120, 300]) {
    const harness = await readyHarness();
    harness.dispatch("pointerdown", pressEvent());
    harness.advance(held);
    harness.dispatch("pointerup", pressEvent());
    if (held < 120) {
      assert.deepEqual(harness.starts, [4]);
      assert.equal(harness.timers[0].delay, 120 - held);
      harness.runTimers();
    } else assert.equal(harness.timers.length, 0);
    assert.deepEqual(harness.starts, [4, 5]);
  }
});

test("muting, blur, or a new press cancels the delayed release", async () => {
  for (const action of ["mute", "blur", "press"]) {
    const harness = await readyHarness({ withToggle: true });
    harness.dispatch("pointerdown", pressEvent());
    harness.dispatch("pointerup", pressEvent());
    if (action === "mute") harness.clickToggle();
    else if (action === "blur") harness.blur();
    else harness.dispatch("pointerdown", pressEvent());
    harness.runTimers();
    assert.deepEqual(harness.starts, action === "press" ? [4, 4] : [4]);
  }
});
