import { validateHsk2LocalLevelCheck } from "../../src/content/hsk2LevelBatch.mjs";

const result = await validateHsk2LocalLevelCheck();
console.log(JSON.stringify(result, null, 2));
if (!result.valid) process.exitCode = 1;
