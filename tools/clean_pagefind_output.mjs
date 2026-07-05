import { rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const pagefindOutput = join(repoRoot, "public", "pagefind");

rmSync(pagefindOutput, { recursive: true, force: true });
