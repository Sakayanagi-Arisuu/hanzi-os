import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HSK1_LEVEL_PACKAGE_INPUT_DIRECTORY,
  loadHsk1LevelBatchSources,
  projectHsk1LevelPackageInputs,
  validateMaterializedHsk1LevelPackage,
} from "../../src/content/hsk1LevelBatch.mjs";

const writeJson = (path, value) => writeFileSync(
  path,
  `${JSON.stringify(value, null, 2)}\n`,
  "utf8",
);

const main = async () => {
  const root = process.cwd();
  if (process.argv.includes("--check-package")) {
    const result = await validateMaterializedHsk1LevelPackage(root);
    console.log(JSON.stringify(result, null, 2));
    if (!result.valid) process.exitCode = 1;
    return;
  }
  if (!process.argv.includes("--write")) {
    throw new Error("Use --write or --check-package");
  }
  const projected = await projectHsk1LevelPackageInputs(
    loadHsk1LevelBatchSources(root),
  );
  const outputDirectory = resolve(root, HSK1_LEVEL_PACKAGE_INPUT_DIRECTORY);
  mkdirSync(outputDirectory, { recursive: true });
  writeJson(resolve(outputDirectory, "item-catalog.json"), projected.itemCatalog);
  writeJson(resolve(outputDirectory, "runtime-ids.json"), projected.runtimeIds);
  writeJson(
    resolve(outputDirectory, "coverage-claims.json"),
    projected.coverageClaims,
  );
  console.log(JSON.stringify({
    valid: true,
    outputDirectory: HSK1_LEVEL_PACKAGE_INPUT_DIRECTORY,
    summary: projected.summary,
  }, null, 2));
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  await main();
}
