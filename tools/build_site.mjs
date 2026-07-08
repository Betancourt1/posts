#!/usr/bin/env node

import { rmSync } from "node:fs";
import { spawnSync } from "node:child_process";

const adminBaseUrl = process.env.AUTHOR_BASE_URL || "https://fbetancourt.work/admin/";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

rmSync("public", { recursive: true, force: true });

run("node", ["tools/check_author_ui_gate.mjs"]);
run("hugo", ["--gc", "--minify", "--destination", "public"]);
run("node", ["tools/clean_pagefind_output.mjs"]);
run("pagefind", ["--site", "public"]);
run("hugo", [
  "--gc",
  "--minify",
  "--environment",
  "author",
  "--buildDrafts",
  "--baseURL",
  adminBaseUrl,
  "--destination",
  "public/admin",
]);
