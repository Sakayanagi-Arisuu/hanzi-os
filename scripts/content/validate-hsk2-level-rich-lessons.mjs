import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateHsk2LevelRichLessons,
} from "../../src/content/hsk2LevelBatch.mjs";

const main = async () => {
  const result = await validateHsk2LevelRichLessons();
  console.log(JSON.stringify(result, null, 2));
  if (!result.valid) process.exitCode = 1;
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  await main();
}
