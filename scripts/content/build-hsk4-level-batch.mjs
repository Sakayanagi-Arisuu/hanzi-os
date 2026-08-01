import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  HSK4_LEVEL_CORE_RELATIVE_PATH,
  HSK4_LEVEL_REVIEW_RELATIVE_PATH,
  loadHsk4LevelBatchSources,
  projectHsk4LevelBatch,
} from "../../src/content/hsk4LevelBatch.mjs";

const root = process.cwd();
const projected = await projectHsk4LevelBatch(loadHsk4LevelBatchSources(root));
const outputs = [
  [HSK4_LEVEL_REVIEW_RELATIVE_PATH, projected.review],
  [HSK4_LEVEL_CORE_RELATIVE_PATH, projected.core],
];
const check = process.argv.includes("--check");
if (!check && !process.argv.includes("--write")) throw new Error("Use --write or --check");
for (const [relativePath, value] of outputs) {
  const outputPath = resolve(root, relativePath);
  const content = `${JSON.stringify(value, null, 2)}\n`;
  if (check) {
    if (readFileSync(outputPath, "utf8") !== content) throw new Error(`${relativePath} is stale`);
  } else {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, content, "utf8");
  }
}
console.log(JSON.stringify({ valid: true, mode: check ? "check" : "write", summary: projected.core.counts }, null, 2));
