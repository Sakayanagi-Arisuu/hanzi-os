import { validateHsk3LocalLevelCheck } from "../../src/content/hsk3LevelBatch.mjs";

const result = await validateHsk3LocalLevelCheck();
console.log(JSON.stringify(result, null, 2));
if (!result.valid) process.exitCode = 1;
