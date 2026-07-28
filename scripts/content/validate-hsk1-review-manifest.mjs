import {
  assertValidHsk1ReviewManifestBundle,
  loadHsk1ReviewManifestBundle,
} from "../../src/content/hsk1ReviewManifest.mjs";

const bundle = loadHsk1ReviewManifestBundle();
const result = assertValidHsk1ReviewManifestBundle(bundle);
console.log(JSON.stringify({
  valid: true,
  manifestId: bundle.manifest.manifestId,
  summary: result.summary,
}, null, 2));
