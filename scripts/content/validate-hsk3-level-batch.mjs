import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadHsk3LevelBatchBundle,
  validateHsk3LevelBatchBundle,
} from "../../src/content/hsk3LevelBatch.mjs";

const main = async () => {
  const result = await validateHsk3LevelBatchBundle(
    loadHsk3LevelBatchBundle(),
  );
  console.log(JSON.stringify(result, null, 2));
  if (!result.valid) process.exitCode = 1;
};

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await main();
}
