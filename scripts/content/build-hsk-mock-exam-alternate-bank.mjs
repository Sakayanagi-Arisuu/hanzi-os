import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  HSK_MOCK_EXAM_ALTERNATE_BANK_RELATIVE_PATH,
  projectHskMockExamAlternateBank,
} from "../../src/content/hskMockExamAlternateBank.mjs";

const root = process.cwd();
const projected = projectHskMockExamAlternateBank(root);
const outputPath = resolve(root, HSK_MOCK_EXAM_ALTERNATE_BANK_RELATIVE_PATH);
const content = `${JSON.stringify(projected, null, 2)}\n`;
const check = process.argv.includes("--check");
if (!check && !process.argv.includes("--write")) {
  throw new Error("Use --write or --check");
}
if (check) {
  if (readFileSync(outputPath, "utf8") !== content) {
    throw new Error(`${HSK_MOCK_EXAM_ALTERNATE_BANK_RELATIVE_PATH} is stale`);
  }
} else {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, content, "utf8");
}
console.log(JSON.stringify({
  valid: true,
  mode: check ? "check" : "write",
  summary: projected.counts,
}, null, 2));
