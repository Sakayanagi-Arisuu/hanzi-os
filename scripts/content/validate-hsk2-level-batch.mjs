import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadHsk2LevelBatchBundle,
  validateHsk2LevelBatchBundle,
} from "../../src/content/hsk2LevelBatch.mjs";

const main = async () => {
  const result = await validateHsk2LevelBatchBundle(
    loadHsk2LevelBatchBundle(),
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
