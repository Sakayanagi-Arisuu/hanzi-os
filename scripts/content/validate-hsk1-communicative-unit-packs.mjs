import {
  assertValidHsk1CommunicativeUnitPacksBundle,
  loadHsk1CommunicativeUnitPacksBundle,
} from "../../src/content/hsk1CommunicativeUnitPacks.mjs";

const bundle = loadHsk1CommunicativeUnitPacksBundle();
const result = assertValidHsk1CommunicativeUnitPacksBundle(bundle);
console.log(JSON.stringify({
  valid: true,
  collectionId: bundle.collection.collectionId,
  summary: result.summary,
}, null, 2));
