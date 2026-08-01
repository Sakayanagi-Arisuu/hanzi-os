import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateHsk3LevelRichLessons } from "../../src/content/hsk3LevelBatch.mjs";

const main = async () => {
  const result = await validateHsk3LevelRichLessons();
  console.log(JSON.stringify(result, null, 2));
  if (!result.valid) process.exitCode = 1;
};

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await main();
}
