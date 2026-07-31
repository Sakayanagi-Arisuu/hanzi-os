import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HSK1_RICH_LESSON_CONTENT_RELATIVE_PATH,
  loadHsk1RichLessonContentSources,
  projectHsk1RichLessonContent,
} from "../../src/content/hsk1RichLessonContent.mjs";

const main = async () => {
  const root = process.cwd();
  const outputPath = resolve(root, HSK1_RICH_LESSON_CONTENT_RELATIVE_PATH);
  const serialized = `${JSON.stringify(
    await projectHsk1RichLessonContent(
      loadHsk1RichLessonContentSources(root),
    ),
    null,
    2,
  )}\n`;
  const check = process.argv.includes("--check");
  if (check) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK1 rich lesson presentation is stale");
    }
  } else {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, serialized, "utf8");
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK1_RICH_LESSON_CONTENT_RELATIVE_PATH,
    mode: check ? "check" : "write",
  }, null, 2));
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  await main();
}
