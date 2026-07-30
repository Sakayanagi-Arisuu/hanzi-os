import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HSK1_LESSON_PROMOTION_HANDOFF_RELATIVE_PATH,
  loadHsk1LessonPromotionHandoffSources,
  projectHsk1LessonPromotionHandoff,
} from "../../src/content/hsk1LessonPromotionHandoff.mjs";

export const buildHsk1LessonPromotionHandoff = async (
  root = process.cwd(),
) => projectHsk1LessonPromotionHandoff(
  loadHsk1LessonPromotionHandoffSources(root),
);

export const serializeHsk1LessonPromotionHandoff = (handoff) =>
  `${JSON.stringify(handoff, null, 2)}\n`;

const main = async () => {
  const root = process.cwd();
  const outputPath = resolve(root, HSK1_LESSON_PROMOTION_HANDOFF_RELATIVE_PATH);
  const serialized = serializeHsk1LessonPromotionHandoff(
    await buildHsk1LessonPromotionHandoff(root),
  );
  const check = process.argv.includes("--check");
  if (check) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK1 lesson promotion handoff is stale");
    }
  } else {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, serialized, "utf8");
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK1_LESSON_PROMOTION_HANDOFF_RELATIVE_PATH,
    mode: check ? "check" : "write",
  }, null, 2));
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  await main();
}
