import {
  assertValidHsk01LocalDemoBundle,
  loadHsk01LocalDemoBundle,
} from "../../src/demo/hsk01LocalDemo.mjs";

const bundle = loadHsk01LocalDemoBundle();
const result = assertValidHsk01LocalDemoBundle(bundle);

console.log(JSON.stringify({
  valid: true,
  demoId: bundle.manifest.demoId,
  summary: result.summary,
}, null, 2));
