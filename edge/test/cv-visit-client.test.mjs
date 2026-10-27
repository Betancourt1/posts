import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../client/cv-visit.js", import.meta.url), "utf8");
const id = "cv_client_test_0123456789";

function browser(path, { historyThrows = false, fetchRejects = false } = {}) {
  const calls = [];
  const state = { navigation: "preserved" };
  const window = {
    location: { href: `https://portfolio.test${path}` },
    history: {
      state,
      replaceState(nextState, title, target) {
        if (historyThrows) throw new Error("history unavailable");
        assert.equal(nextState, state);
        assert.equal(title, "");
        window.location.href = new URL(target, window.location.href).href;
      },
    },
    fetch(url, options) {
      calls.push({ url, options });
      return fetchRejects ? Promise.reject(new Error("offline")) : Promise.resolve({ status: 204 });
    },
    get localStorage() { assert.fail("tracking must not use localStorage"); },
    get sessionStorage() { assert.fail("tracking must not use sessionStorage"); },
  };
  const context = vm.createContext({ window, URL });
  return { window, calls, run: () => vm.runInContext(source, context) };
}

test("captures once, removes only cv_id, and preserves query/hash/history state", () => {
  const page = browser(`/es/cv/?other=one&cv_id=${id}&other=two#experience`);
  page.run();
  page.run();
  assert.equal(page.window.location.href, "https://portfolio.test/es/cv/?other=one&other=two#experience");
  assert.equal(page.calls.length, 1);
  const { url, options } = page.calls[0];
  assert.equal(url, "/api/cv-visits");
  assert.equal(options.method, "POST");
  assert.deepEqual(JSON.parse(options.body), { cv_id: id });
  assert.equal(options.credentials, "omit");
  assert.equal(options.referrerPolicy, "no-referrer");
  assert.equal(options.redirect, "error");
  assert.equal(options.keepalive, true);
});

test("unattributed loads do not send requests or rewrite the URL", () => {
  const page = browser("/?q=a%20b#section");
  page.run();
  assert.equal(page.calls.length, 0);
  assert.equal(page.window.location.href, "https://portfolio.test/?q=a%20b#section");
});

test("invalid, oversized, empty, and repeated parameters are cleaned but not captured", () => {
  for (const query of ["cv_id=", "cv_id=short", `cv_id=${"x".repeat(65)}`,
    `cv_id=${id}%0A`, `cv_id=${id}%2F`, `cv_id=${id}&cv_id=${id}`]) {
    const page = browser(`/cv/?${query}&other=ok#title`);
    page.run();
    assert.equal(page.calls.length, 0, query);
    assert.equal(page.window.location.href, "https://portfolio.test/cv/?other=ok#title");
  }
});

test("a network failure is swallowed without retry, persistent storage, or navigation changes", async () => {
  const page = browser(`/?cv_id=${id}#intro`, { fetchRejects: true });
  page.run();
  await new Promise((resolve) => setImmediate(resolve));
  page.run();
  assert.equal(page.calls.length, 1);
  assert.equal(page.window.location.href, "https://portfolio.test/#intro");
});

test("a failed URL cleanup still captures once even if the script runs again", () => {
  const page = browser(`/?cv_id=${id}`, { historyThrows: true });
  page.run();
  page.run();
  assert.equal(page.calls.length, 1);
});
