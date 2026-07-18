import { rm } from "node:fs/promises";
import { relative, resolve } from "node:path";

const root = resolve(process.cwd());
const output = resolve(root, "dist");
const relativeOutput = relative(root, output);

if (relativeOutput !== "dist") {
  throw new Error(`Refusing to clean unexpected build path: ${output}`);
}

await rm(output, { recursive: true, force: true });
