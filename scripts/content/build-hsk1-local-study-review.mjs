import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HSK1_LOCAL_STUDY_REVIEW_RELATIVE_PATH,
  loadHsk1LocalStudyReviewSources,
  projectHsk1LocalStudyReview,
} from "../../src/content/hsk1LocalStudyReview.mjs";

export const buildHsk1LocalStudyReview = async (
  root = process.cwd(),
) => projectHsk1LocalStudyReview(loadHsk1LocalStudyReviewSources(root));

export const serializeHsk1LocalStudyReview = (review) =>
  `${JSON.stringify(review, null, 2)}\n`;

const main = async () => {
  const root = process.cwd();
  const outputPath = resolve(root, HSK1_LOCAL_STUDY_REVIEW_RELATIVE_PATH);
  const serialized = serializeHsk1LocalStudyReview(
    await buildHsk1LocalStudyReview(root),
  );
  const check = process.argv.includes("--check");
  if (check) {
    if (readFileSync(outputPath, "utf8") !== serialized) {
      throw new Error("Checked HSK1 local-study review is stale");
    }
  } else {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, serialized, "utf8");
  }
  console.log(JSON.stringify({
    valid: true,
    output: HSK1_LOCAL_STUDY_REVIEW_RELATIVE_PATH,
    mode: check ? "check" : "write",
  }, null, 2));
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  await main();
}
