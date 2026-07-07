#!/usr/bin/env node

import { spawn } from "node:child_process";

const children = [];

function start(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: "inherit",
    env: {
      ...process.env,
      ...options.env,
    },
  });

  children.push(child);
  child.on("exit", (code, signal) => {
    if (signal) {
      return;
    }

    if (code && code !== 0) {
      shutdown(code);
    }
  });

  return child;
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

start(process.execPath, ["tools/author_server.mjs"], {
  env: {
    AUTHOR_PORT: "3001",
  },
});

start("hugo", [
  "server",
  "-D",
  "--environment",
  "author",
  "--bind",
  "0.0.0.0",
  "--port",
  "3000",
  "--baseURL",
  "/",
  "--appendPort=false",
  "--disableFastRender",
]);
