import {
  assertValidHsk4NatureTechnologyLongFormPackBundle,
  loadHsk4NatureTechnologyLongFormPackBundle,
} from "../../src/content/hsk4NatureTechnologyLongFormPack.mjs";

const result = assertValidHsk4NatureTechnologyLongFormPackBundle(
  loadHsk4NatureTechnologyLongFormPackBundle(),
);
console.log(JSON.stringify(result.summary, null, 2));
