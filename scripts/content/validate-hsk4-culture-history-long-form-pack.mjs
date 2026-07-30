import {
  assertValidHsk4CultureHistoryLongFormPackBundle,
  loadHsk4CultureHistoryLongFormPackBundle,
} from "../../src/content/hsk4CultureHistoryLongFormPack.mjs";

const summary = assertValidHsk4CultureHistoryLongFormPackBundle(
  loadHsk4CultureHistoryLongFormPackBundle(),
).summary;

console.log(JSON.stringify(summary, null, 2));
