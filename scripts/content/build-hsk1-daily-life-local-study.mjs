import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HSK1_DAILY_LIFE_CORE_RELATIVE_PATH,
  HSK1_DAILY_LIFE_REVIEW_RELATIVE_PATH,
  loadHsk1DailyLifeLocalStudySources,
  projectHsk1DailyLifeLocalStudy,
} from "../../src/content/hsk1DailyLifeLocalStudy.mjs";

const serialized = (value) => `${JSON.stringify(value, null, 2)}\n`;

const main = async () => {
  const root = process.cwd();
  const projected = await projectHsk1DailyLifeLocalStudy(
    loadHsk1DailyLifeLocalStudySources(root),
  );
  const outputs = [
    [HSK1_DAILY_LIFE_REVIEW_RELATIVE_PATH, projected.review],
    [HSK1_DAILY_LIFE_CORE_RELATIVE_PATH, projected.core],
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
    outputs: outputs.map(([relativePath]) => relativePath),
    mode: check ? "check" : "write",
    summary: {
      lessons: projected.core.counts.lessons,
      lexemes: projected.core.counts.lexemes,
      sourceTargets: projected.review.coverage.sourceTargetCount,
      resolvedFindings: projected.review.findings.resolved.length,
    },
  }, null, 2));
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  await main();
}
