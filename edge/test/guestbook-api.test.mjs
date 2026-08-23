import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  RATE_LIMIT,
  RATE_WINDOW_SQL,
  hashIp,
  validateGuestbookInput,
} from "../src/lib/guestbook.mjs";

const componentPath = new URL("../src/components/Guestbook.astro", import.meta.url);
const apiPath = new URL("../src/pages/api/guestbook.ts", import.meta.url);
const migrationPath = new URL("../db/migrations/0002_guestbook.sql", import.meta.url);
const cssPath = new URL("../../static/css/site.css", import.meta.url);
const viewPath = new URL("../src/views/PublicPage.astro", import.meta.url);
const libPath = new URL("../src/lib/public-page.mjs", import.meta.url);

test("validates guestbook input with length and scheme rules", () => {
  assert.deepEqual(
    validateGuestbookInput({ name: "ana", message: "hola", site: "" }),
    { ok: true, value: { name: "ana", message: "hola", site: null } },
  );
  assert.equal(validateGuestbookInput({ name: "", message: "hola" }).error, "name_required");
  assert.equal(validateGuestbookInput({ name: "a".repeat(41), message: "hola" }).error, "name_too_long");
  assert.equal(validateGuestbookInput({ name: "ana", message: "" }).error, "message_required");
  assert.equal(validateGuestbookInput({ name: "ana", message: "x".repeat(281) }).error, "message_too_long");
  assert.equal(validateGuestbookInput({ name: "ana", message: "hola", site: "ftp://x" }).error, "site_invalid");
  assert.equal(validateGuestbookInput({ name: "ana", message: "hola", site: "javascript:alert(1)" }).error, "site_invalid");
  assert.equal(validateGuestbookInput({ name: "ana", message: "hola", site: "https://ana.example" }).ok, true);
  assert.equal(
    validateGuestbookInput({ name: "  ana  ", message: "hola\nmundo" }).value.message,
    "hola mundo",
  );
});

test("hashes ips with salt deterministically", async () => {
  const first = await hashIp("1.2.3.4", "salt");
  const second = await hashIp("1.2.3.4", "salt");
  const other = await hashIp("1.2.3.4", "otra");
  assert.equal(first, second);
  assert.notEqual(first, other);
  assert.match(first, /^[0-9a-f]{64}$/);
});

test("rate limit is three per hour via the ip_hash index", () => {
  assert.equal(RATE_LIMIT, 3);
  assert.match(RATE_WINDOW_SQL, /ip_hash = \?1/);
  assert.match(RATE_WINDOW_SQL, /-1 hour/);
});

test("renders the postcard wall with a shielded form", async () => {
  const [component, api, migration, css, view, lib] = await Promise.all([
    readFile(componentPath, "utf8"),
    readFile(apiPath, "utf8"),
    readFile(migrationPath, "utf8"),
    readFile(cssPath, "utf8"),
    readFile(viewPath, "utf8"),
    readFile(libPath, "utf8"),
  ]);

  assert.match(component, /data-guestbook-form/);
  assert.match(component, /name="website_confirm"/);
  assert.match(component, /rel="nofollow noopener ugc"/);
  assert.match(component, /\/api\/guestbook/);
  assert.doesNotMatch(component, /innerHTML/);

  assert.match(api, /website_confirm/);
  assert.match(api, /siteverify/);
  assert.match(api, /TURNSTILE_SECRET_KEY/);
  assert.match(api, /RATE_WINDOW_SQL/);

  assert.match(migration, /CREATE TABLE guestbook_entries/);
  assert.match(migration, /CREATE INDEX guestbook_entries_rate/);

  assert.match(css, /\.guestbook-card \{/);
  assert.match(css, /\.guestbook-honeypot \{/);
  assert.match(view, /\["Visitas", "\/es\/visitas\/", "visitas"\]/);
  assert.match(view, /\["Guestbook", "\/guestbook\/", "guestbook"\]/);
  assert.match(view, /"guestbook", "not-found"/);
  assert.match(lib, /return "guestbook"/);
  assert.match(lib, /guestbook_entries ORDER BY created_at DESC LIMIT 200/);
});
