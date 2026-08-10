import { rm } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const DISPOSABLE_LOCAL_ARTIFACTS = Object.freeze([
  ".agents",
  ".vite",
  "dist",
  "playwright-report",
  "test-results",
  "tmp",
  "debug.log",
  "tsconfig.tsbuildinfo",
]);

export async function cleanLocalArtifacts(root = process.cwd()) {
  const workspaceRoot = resolve(root);

  for (const artifact of DISPOSABLE_LOCAL_ARTIFACTS) {
    const target = resolve(workspaceRoot, artifact);
    const targetRelativePath = relative(workspaceRoot, target).replaceAll("\\", "/");
    if (targetRelativePath !== artifact || targetRelativePath.startsWith("../")) {
      throw new Error(`Refusing to clean unexpected path: ${target}`);
    }
    await rm(target, { recursive: true, force: true });
  }

  return DISPOSABLE_LOCAL_ARTIFACTS.length;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (invokedPath === import.meta.url) {
  const removedPathCount = await cleanLocalArtifacts();
  console.log(`Removed ${removedPathCount} disposable local artifact paths.`);
  console.log("Preserved .wrangler because it contains the active local D1 database.");
}
