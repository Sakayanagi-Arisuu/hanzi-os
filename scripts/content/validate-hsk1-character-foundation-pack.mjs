import {
  assertValidHsk1CharacterFoundationPackBundle,
  loadHsk1CharacterFoundationPackBundle,
} from "../../src/content/hsk1CharacterFoundationPack.mjs";

const bundle = loadHsk1CharacterFoundationPackBundle();
const result = assertValidHsk1CharacterFoundationPackBundle(bundle);
console.log(JSON.stringify({
  valid: true,
  packId: bundle.pack.packId,
  unitId: bundle.pack.unitId,
  summary: result.summary,
}, null, 2));
