import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadHsk1LocalStudyReviewBundle,
  validateHsk1LocalStudyReviewBundle,
} from "../../src/content/hsk1LocalStudyReview.mjs";

export const validateCheckedHsk1LocalStudyReview = async (
  root = process.cwd(),
) => validateHsk1LocalStudyReviewBundle(
  loadHsk1LocalStudyReviewBundle(root),
);

const main = async () => {
  const result = await validateCheckedHsk1LocalStudyReview();
  console.log(JSON.stringify(result, null, 2));
  if (!result.valid) process.exitCode = 1;
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  await main();
}
