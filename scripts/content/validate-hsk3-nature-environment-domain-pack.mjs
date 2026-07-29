import {
  assertValidHsk3NatureEnvironmentDomainPackBundle,
  loadHsk3NatureEnvironmentDomainPackBundle,
} from "../../src/content/hsk3NatureEnvironmentDomainPack.mjs";

const result = assertValidHsk3NatureEnvironmentDomainPackBundle(
  loadHsk3NatureEnvironmentDomainPackBundle(),
);
console.log(JSON.stringify({ valid: true, summary: result.summary }, null, 2));
