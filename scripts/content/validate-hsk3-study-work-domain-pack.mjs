import {
  assertValidHsk3StudyWorkDomainPackBundle,
  loadHsk3StudyWorkDomainPackBundle,
} from "../../src/content/hsk3StudyWorkDomainPack.mjs";

const result = assertValidHsk3StudyWorkDomainPackBundle(
  loadHsk3StudyWorkDomainPackBundle(),
);
console.log(JSON.stringify({ valid: true, summary: result.summary }, null, 2));
