#!/usr/bin/env node

import { spawn } from "node:child_process";

const children = [];
const sitePort = "3010";
const authorPort = "3001";

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

async function isAuthorApiRunning() {
  try {
    const response = await fetch(`http://127.0.0.1:${authorPort}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await isAuthorApiRunning())) {
    start(process.execPath, ["tools/author_server.mjs"], {
      env: {
        AUTHOR_PORT: authorPort,
      },
    });
  }

  start("hugo", [
    "server",
    "-D",
    "--renderToMemory",
    "--environment",
    "author",
    "--bind",
    "0.0.0.0",
    "--port",
    sitePort,
    "--baseURL",
    "/",
    "--appendPort=false",
    "--disableFastRender",
  ]);
}

main().catch((error) => {
  console.error(error);
  shutdown(1);
});
