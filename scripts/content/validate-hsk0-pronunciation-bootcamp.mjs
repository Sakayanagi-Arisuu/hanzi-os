import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertValidHsk0PronunciationBootcampBundle,
  loadHsk0PronunciationBootcampBundle,
} from "../../src/content/hsk0PronunciationBootcamp.mjs";

const main = () => {
  const result = assertValidHsk0PronunciationBootcampBundle(
    loadHsk0PronunciationBootcampBundle(),
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
