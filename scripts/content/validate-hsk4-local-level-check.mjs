import { validateHsk4LocalLevelCheck } from "../../src/content/hsk4LevelBatch.mjs";

const result = await validateHsk4LocalLevelCheck();
console.log(JSON.stringify(result, null, 2));
if (!result.valid) process.exitCode = 1;
