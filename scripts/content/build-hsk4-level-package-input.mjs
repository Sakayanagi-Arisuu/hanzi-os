import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  HSK4_LEVEL_PACKAGE_INPUT_DIRECTORY,
  loadHsk4LevelBatchSources,
  projectHsk4LevelPackageInputs,
  validateMaterializedHsk4LevelPackage,
} from "../../src/content/hsk4LevelBatch.mjs";

const root = process.cwd();
if (process.argv.includes("--check-package")) {
  const result = await validateMaterializedHsk4LevelPackage(root);
  console.log(JSON.stringify(result, null, 2));
  if (!result.valid) process.exitCode = 1;
} else {
  if (!process.argv.includes("--write")) throw new Error("Use --write or --check-package");
  const projected = await projectHsk4LevelPackageInputs(loadHsk4LevelBatchSources(root));
  const outputDirectory = resolve(root, HSK4_LEVEL_PACKAGE_INPUT_DIRECTORY);
  mkdirSync(outputDirectory, { recursive: true });
  for (const [name, value] of [
    ["item-catalog.json", projected.itemCatalog],
    ["runtime-ids.json", projected.runtimeIds],
    ["coverage-claims.json", projected.coverageClaims],
  ]) writeFileSync(resolve(outputDirectory, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ valid: true, outputDirectory: HSK4_LEVEL_PACKAGE_INPUT_DIRECTORY, summary: projected.summary }, null, 2));
}
