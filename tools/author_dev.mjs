#!/usr/bin/env node

import { spawn } from "node:child_process";

const children = [];
const sitePort = "3010";
const authorPort = "3001";
const siteOrigin = `http://127.0.0.1:${sitePort}`;

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
        SITE_PORT: sitePort,
        SITE_ORIGIN: siteOrigin,
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
    "127.0.0.1",
    "--port",
    sitePort,
    "--baseURL",
    `${siteOrigin}/`,
    "--appendPort=false",
    "--disableFastRender",
  ]);

  console.log(`\nSite: ${siteOrigin}/es/`);
  console.log(`Author API: http://127.0.0.1:${authorPort}/api/health\n`);
}

main().catch((error) => {
  console.error(error);
  shutdown(1);
});
