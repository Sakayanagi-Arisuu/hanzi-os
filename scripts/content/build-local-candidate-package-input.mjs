import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { sha256Json } from "../../src/content/governance.mjs";

const SOURCE_VERSION = "foundation-2026.08.4";
const TARGET_VERSION = "foundation-2026.08.5";
const OUTPUT_DIRECTORY = "content/runtime/local-candidate-package-input";
const root = process.cwd();
const readJson = (relativePath) => JSON.parse(readFileSync(
  resolve(root, relativePath),
  "utf8",
));

const sourceDirectory = `content/packages/${SOURCE_VERSION}`;
const sourceCatalog = readJson(`${sourceDirectory}/item-catalog.json`);
const sourceRuntimeIds = readJson(`${sourceDirectory}/runtime-ids.json`);
const sourceCoverage = readJson(`${sourceDirectory}/coverage-claims.json`);
const itemCatalog = {
  ...sourceCatalog,
  contentVersion: TARGET_VERSION,
  items: sourceCatalog.items.map((item) => ({
    ...item,
    itemVersion: TARGET_VERSION,
  })),
};
const runtimeIds = {
  ...sourceRuntimeIds,
  contentVersion: TARGET_VERSION,
};
const coverageClaims = {
  ...sourceCoverage,
  contentVersion: TARGET_VERSION,
  itemCatalogSha256: await sha256Json(itemCatalog),
};

if (
  sourceCatalog.contentVersion !== SOURCE_VERSION
  || sourceRuntimeIds.contentVersion !== SOURCE_VERSION
  || sourceCoverage.contentVersion !== SOURCE_VERSION
  || itemCatalog.items.length !== sourceCatalog.items.length
  || runtimeIds.vocabularyIds.length !== sourceRuntimeIds.vocabularyIds.length
  || runtimeIds.lessons.length !== sourceRuntimeIds.lessons.length
) throw new Error("Local candidate package input continuity is invalid");

const outputs = {
  "item-catalog.json": itemCatalog,
  "runtime-ids.json": runtimeIds,
  "coverage-claims.json": coverageClaims,
};
const check = process.argv.includes("--check");
if (!check && !process.argv.includes("--write")) throw new Error("Use --write or --check");
if (!check) mkdirSync(resolve(root, OUTPUT_DIRECTORY), { recursive: true });
for (const [name, value] of Object.entries(outputs)) {
  const path = resolve(root, OUTPUT_DIRECTORY, name);
  const content = `${JSON.stringify(value, null, 2)}\n`;
  if (check) {
    if (readFileSync(path, "utf8") !== content) throw new Error(`${name} is stale`);
  } else {
    writeFileSync(path, content, "utf8");
  }
}
console.log(JSON.stringify({
  valid: true,
  mode: check ? "check" : "write",
  targetVersion: TARGET_VERSION,
  items: itemCatalog.items.length,
  vocabularyIds: runtimeIds.vocabularyIds.length,
  lessons: runtimeIds.lessons.length,
}, null, 2));
