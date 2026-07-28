import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertValidHsk2CurriculumScopeBundle,
  loadHsk2CurriculumScopeBundle,
} from "../../src/content/hsk2CurriculumScope.mjs";

const main = () => {
  const result = assertValidHsk2CurriculumScopeBundle(
    loadHsk2CurriculumScopeBundle(),
  );
  console.log(JSON.stringify({
    valid: true,
    summary: result.summary,
  }, null, 2));
};

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main();
}
