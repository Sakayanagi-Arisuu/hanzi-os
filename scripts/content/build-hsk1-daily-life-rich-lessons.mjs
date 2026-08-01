import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HSK1_DAILY_LIFE_RICH_RELATIVE_PATH,
  loadHsk1DailyLifeRichLessonSources,
  projectHsk1DailyLifeRichLessons,
} from "../../src/content/hsk1DailyLifeRichLessonContent.mjs";

const main = async () => {
  const root = process.cwd();
  const outputPath = resolve(root, HSK1_DAILY_LIFE_RICH_RELATIVE_PATH);
  const content = `${JSON.stringify(
    await projectHsk1DailyLifeRichLessons(
      loadHsk1DailyLifeRichLessonSources(root),
    ),
    null,
    2,
  )}\n`;
  const check = process.argv.includes("--check");
  if (check) {
    if (readFileSync(outputPath, "utf8") !== content) {
      throw new Error("Checked HSK1 daily-life rich presentation is stale");
    }
  } else {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, content, "utf8");
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK1_DAILY_LIFE_RICH_RELATIVE_PATH,
    mode: check ? "check" : "write",
  }, null, 2));
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  await main();
}
