import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertValidHsk1LevelCheckItemBankBundle,
  loadHsk1LevelCheckItemBankBundle,
} from "../../src/content/hsk1LevelCheckItemBank.mjs";

const main = () => {
  const result = assertValidHsk1LevelCheckItemBankBundle(
    loadHsk1LevelCheckItemBankBundle(),
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
