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
      return selectorList.includes("button") || selectorList.includes("a[href]") ? this : null;
    },
    matches(selectorList) {
      const accepted = selectorList.split(",").map((selector) => selector.trim());
      return accepted.some((selector) => this.selectors.has(selector));
    },
  };
}

function createHarness({ stored = false, withToggle = false, failFetch = false } = {}) {
  const documentListeners = new Map();
  const toggleListeners = new Map();
  const fetches = [];
  const decodes = [];
  const sources = [];
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
      return Promise.resolve({ id });
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
      const id = url.includes("default") ? 1 : url.includes("navigation") ? 2 : 3;
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
    window: { AudioContext: FakeAudioContext },
  };

  vm.runInNewContext(soundSource, sandbox);

  return {
    decodes,
    fetches,
    sources,
    starts,
    oscillatorCalls: () => oscillatorCalls,
    dispatch(type, event) {
      for (const handler of documentListeners.get(type) || []) handler(event);
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

test("stored opt-in caches samples and maps each action with strict precedence", async () => {
  const harness = createHarness({ stored: true });
  await flushTasks();
  await flushTasks();

  assert.deepEqual(harness.fetches.sort(), [
    "https://example.test/sounds/interaction-default.wav",
    "https://example.test/sounds/interaction-navigation.wav",
    "https://example.test/sounds/interaction-subcontrol.wav",
  ]);

  harness.dispatch("pointerdown", { isTrusted: true });
  await flushTasks();
  await flushTasks();
  assert.deepEqual(harness.decodes.sort(), [1, 2, 3]);

  harness.dispatch("click", { isTrusted: true, target: target(["button"]) });
  harness.dispatch("click", { isTrusted: true, target: target(["button"]) });
  harness.dispatch("click", { isTrusted: true, target: target(["a[href]"]) });
  harness.dispatch("click", { isTrusted: true, target: target(["button", ".settings button"]) });
  harness.dispatch("click", {
    isTrusted: true,
    target: target(["button", ".settings button", ".danger-button"]),
  });

  assert.deepEqual(harness.starts, [1, 1, 2, 3, 2]);
  assert.equal(new Set(harness.sources).size, 5);
  assert.equal(harness.fetches.length, 3);
  assert.equal(harness.decodes.length, 3);
  assert.equal(harness.oscillatorCalls(), 0);
});

test("the trusted toggle enables, loads, and plays the default sample", async () => {
  const harness = createHarness({ withToggle: true });
  assert.equal(harness.fetches.length, 0);

  harness.clickToggle();
  await flushTasks();
  await flushTasks();

  assert.equal(harness.fetches.length, 3);
  assert.deepEqual(harness.starts, [1]);
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

  assert.equal(harness.fetches.length, 3);
  assert.deepEqual(harness.starts, []);
  assert.equal(harness.oscillatorCalls(), 0);
});
