import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HSK3_LEVEL_RICH_RELATIVE_PATH,
  loadHsk3LevelBatchSources,
  projectHsk3LevelRichLessons,
} from "../../src/content/hsk3LevelBatch.mjs";

const main = async () => {
  const root = process.cwd();
  const projected = await projectHsk3LevelRichLessons(
    loadHsk3LevelBatchSources(root),
  );
  const outputPath = resolve(root, HSK3_LEVEL_RICH_RELATIVE_PATH);
  const content = `${JSON.stringify(projected, null, 2)}\n`;
  const check = process.argv.includes("--check");
  if (!check && !process.argv.includes("--write")) {
    throw new Error("Use --write or --check");
  }
  if (check) {
    if (readFileSync(outputPath, "utf8") !== content) {
      throw new Error(`${HSK3_LEVEL_RICH_RELATIVE_PATH} is stale`);
    }
  } else {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, content, "utf8");
  }
  console.log(JSON.stringify({
    valid: true,
    mode: check ? "check" : "write",
    output: HSK3_LEVEL_RICH_RELATIVE_PATH,
    summary: projected.counts,
  }, null, 2));
};

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await main();
}
