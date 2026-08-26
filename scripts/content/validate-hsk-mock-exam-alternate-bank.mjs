import { validateHskMockExamAlternateBank } from "../../src/content/hskMockExamAlternateBank.mjs";

const result = validateHskMockExamAlternateBank(process.cwd());
if (!result.valid) throw new Error(result.errors.join("\n"));
console.log(JSON.stringify(result, null, 2));
