import {
  assertValidHsk1PersonalExchangePackBundle,
  loadHsk1PersonalExchangePackBundle,
} from "../../src/content/hsk1PersonalExchangePack.mjs";

const bundle = loadHsk1PersonalExchangePackBundle();
const result = assertValidHsk1PersonalExchangePackBundle(bundle);
console.log(JSON.stringify({
  valid: true,
  packId: bundle.pack.packId,
  unitId: bundle.pack.unitId,
  summary: result.summary,
}, null, 2));
