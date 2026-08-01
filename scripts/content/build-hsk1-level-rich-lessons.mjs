import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HSK1_LEVEL_RICH_RELATIVE_PATH,
  loadHsk1LevelBatchSources,
  projectHsk1LevelRichLessons,
} from "../../src/content/hsk1LevelBatch.mjs";

const main = async () => {
  const root = process.cwd();
  const projected = await projectHsk1LevelRichLessons(
    loadHsk1LevelBatchSources(root),
  );
  const outputPath = resolve(root, HSK1_LEVEL_RICH_RELATIVE_PATH);
  const content = `${JSON.stringify(projected, null, 2)}\n`;
  const check = process.argv.includes("--check");
  if (!check && !process.argv.includes("--write")) {
    throw new Error("Use --write or --check");
  }
  if (check) {
    if (readFileSync(outputPath, "utf8") !== content) {
      throw new Error(`${HSK1_LEVEL_RICH_RELATIVE_PATH} is stale`);
    }
  } else {
    writeFileSync(outputPath, content, "utf8");
  }
  console.log(JSON.stringify({
    valid: true,
    mode: check ? "check" : "write",
    output: HSK1_LEVEL_RICH_RELATIVE_PATH,
    summary: projected.counts,
  }, null, 2));
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  await main();
}
