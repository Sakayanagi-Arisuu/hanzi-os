import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HSK2_LEVEL_CORE_RELATIVE_PATH,
  HSK2_LEVEL_REVIEW_RELATIVE_PATH,
  loadHsk2LevelBatchSources,
  projectHsk2LevelBatch,
} from "../../src/content/hsk2LevelBatch.mjs";

const serialized = (value) => `${JSON.stringify(value, null, 2)}\n`;

const main = async () => {
  const root = process.cwd();
  const projected = await projectHsk2LevelBatch(
    loadHsk2LevelBatchSources(root),
  );
  const outputs = [
    [HSK2_LEVEL_REVIEW_RELATIVE_PATH, projected.review],
    [HSK2_LEVEL_CORE_RELATIVE_PATH, projected.core],
  ];
  const check = process.argv.includes("--check");
  if (!check && !process.argv.includes("--write")) {
    throw new Error("Use --write or --check");
  }
  for (const [relativePath, value] of outputs) {
    const outputPath = resolve(root, relativePath);
    const content = serialized(value);
    if (check) {
      if (readFileSync(outputPath, "utf8") !== content) {
        throw new Error(`${relativePath} is stale`);
      }
    } else {
      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, content, "utf8");
    }
  }
  console.log(JSON.stringify({
    valid: true,
    mode: check ? "check" : "write",
    outputs: outputs.map(([relativePath]) => relativePath),
    summary: projected.core.counts,
  }, null, 2));
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  await main();
}
