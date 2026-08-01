import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadHsk1DailyLifeRichLessonBundle,
  validateHsk1DailyLifeRichLessonBundle,
} from "../../src/content/hsk1DailyLifeRichLessonContent.mjs";

const main = async () => {
  const result = await validateHsk1DailyLifeRichLessonBundle(
    loadHsk1DailyLifeRichLessonBundle(),
  );
  console.log(JSON.stringify(result, null, 2));
  if (!result.valid) process.exitCode = 1;
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  await main();
}
