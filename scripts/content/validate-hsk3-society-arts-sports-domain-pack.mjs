import {
  assertValidHsk3SocietyArtsSportsDomainPackBundle,
  loadHsk3SocietyArtsSportsDomainPackBundle,
} from "../../src/content/hsk3SocietyArtsSportsDomainPack.mjs";

const result = assertValidHsk3SocietyArtsSportsDomainPackBundle(
  loadHsk3SocietyArtsSportsDomainPackBundle(),
);
console.log(JSON.stringify({ valid: true, summary: result.summary }, null, 2));
