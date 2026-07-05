import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const pagefindOutput = join(repoRoot, "public", "pagefind");
const staticPagefind = join(repoRoot, "static", "pagefind");

if (!existsSync(pagefindOutput)) {
  throw new Error(`Pagefind output was not found at ${pagefindOutput}`);
}

rmSync(staticPagefind, { recursive: true, force: true });
cpSync(pagefindOutput, staticPagefind, { recursive: true });

console.log("Synced public/pagefind to static/pagefind");
