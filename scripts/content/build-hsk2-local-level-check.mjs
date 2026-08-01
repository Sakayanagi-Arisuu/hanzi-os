import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  HSK2_LEVEL_CHECK_RELATIVE_PATH,
  loadHsk2LevelBatchSources,
  projectHsk2LocalLevelCheck,
} from "../../src/content/hsk2LevelBatch.mjs";

const root = process.cwd();
const projected = await projectHsk2LocalLevelCheck(loadHsk2LevelBatchSources(root));
const outputPath = resolve(root, HSK2_LEVEL_CHECK_RELATIVE_PATH);
const content = `${JSON.stringify(projected, null, 2)}\n`;
const check = process.argv.includes("--check");
if (!check && !process.argv.includes("--write")) throw new Error("Use --write or --check");
if (check) {
  if (readFileSync(outputPath, "utf8") !== content) throw new Error(`${HSK2_LEVEL_CHECK_RELATIVE_PATH} is stale`);
} else {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, content, "utf8");
}
console.log(JSON.stringify({ valid: true, mode: check ? "check" : "write", summary: projected.counts }, null, 2));
