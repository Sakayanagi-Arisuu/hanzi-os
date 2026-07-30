import {
  assertValidHsk4EducationWorkLongFormPackBundle,
  loadHsk4EducationWorkLongFormPackBundle,
} from "../../src/content/hsk4EducationWorkLongFormPack.mjs";

const result = assertValidHsk4EducationWorkLongFormPackBundle(
  loadHsk4EducationWorkLongFormPackBundle(),
);
console.log(JSON.stringify(result.summary, null, 2));
