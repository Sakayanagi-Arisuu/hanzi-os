import {
  loadHsk4LevelBatchBundle,
  validateHsk4LevelBatchBundle,
} from "../../src/content/hsk4LevelBatch.mjs";

const result = await validateHsk4LevelBatchBundle(loadHsk4LevelBatchBundle());
console.log(JSON.stringify(result, null, 2));
if (!result.valid) process.exitCode = 1;
