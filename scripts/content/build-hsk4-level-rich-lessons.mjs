import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  HSK4_LEVEL_RICH_RELATIVE_PATH,
  loadHsk4LevelBatchSources,
  projectHsk4LevelRichLessons,
} from "../../src/content/hsk4LevelBatch.mjs";

const root = process.cwd();
const projected = await projectHsk4LevelRichLessons(loadHsk4LevelBatchSources(root));
const outputPath = resolve(root, HSK4_LEVEL_RICH_RELATIVE_PATH);
const content = `${JSON.stringify(projected, null, 2)}\n`;
const check = process.argv.includes("--check");
if (!check && !process.argv.includes("--write")) throw new Error("Use --write or --check");
if (check) {
  if (readFileSync(outputPath, "utf8") !== content) throw new Error(`${HSK4_LEVEL_RICH_RELATIVE_PATH} is stale`);
} else {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, content, "utf8");
}
console.log(JSON.stringify({ valid: true, mode: check ? "check" : "write", summary: projected.counts }, null, 2));
