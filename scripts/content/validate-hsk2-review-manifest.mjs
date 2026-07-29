import {
  assertValidHsk2ReviewManifestBundle,
  loadHsk2ReviewManifestBundle,
} from "../../src/content/hsk2ReviewManifest.mjs";

const bundle = loadHsk2ReviewManifestBundle();
const result = assertValidHsk2ReviewManifestBundle(bundle);
console.log(JSON.stringify({
  valid: true,
  manifestId: bundle.manifest.manifestId,
  summary: result.summary,
}, null, 2));
