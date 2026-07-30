import {
  assertValidHsk4ReviewManifestBundle,
  loadHsk4ReviewManifestBundle,
} from "../../src/content/hsk4ReviewManifest.mjs";

const bundle = loadHsk4ReviewManifestBundle();
const result = assertValidHsk4ReviewManifestBundle(bundle);
console.log(JSON.stringify({
  valid: true,
  manifestId: bundle.manifest.manifestId,
  summary: result.summary,
}, null, 2));
