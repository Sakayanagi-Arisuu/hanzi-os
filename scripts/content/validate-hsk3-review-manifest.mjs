import {
  assertValidHsk3ReviewManifestBundle,
  loadHsk3ReviewManifestBundle,
} from "../../src/content/hsk3ReviewManifest.mjs";

const bundle = loadHsk3ReviewManifestBundle();
const result = assertValidHsk3ReviewManifestBundle(bundle);
console.log(JSON.stringify({
  valid: true,
  manifestId: bundle.manifest.manifestId,
  summary: result.summary,
}, null, 2));
