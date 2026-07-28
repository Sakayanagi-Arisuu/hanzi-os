import {
  assertValidHskSyllabusBundle,
  loadHskSyllabusBundle,
} from "../../src/content/hskSyllabusInventory.mjs";

const bundle = loadHskSyllabusBundle();
const result = assertValidHskSyllabusBundle(bundle);
console.log(JSON.stringify({
  valid: true,
  sourceId: bundle.source.sourceId,
  sourcePdfSha256: bundle.source.pdfSha256,
  inventorySha256: bundle.inventorySha256,
  counts: result.counts,
}, null, 2));
