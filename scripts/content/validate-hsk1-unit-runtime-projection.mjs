import {
  assertValidHsk1UnitRuntimeProjectionBundle,
  loadHsk1UnitRuntimeProjectionBundle,
} from "../../src/content/hsk1UnitRuntimeProjection.mjs";

const bundle = loadHsk1UnitRuntimeProjectionBundle();
const result = await assertValidHsk1UnitRuntimeProjectionBundle(bundle);

console.log(JSON.stringify({
  valid: true,
  projectionId: bundle.projection.projectionId,
  state: bundle.projection.state,
  summary: result.summary,
}, null, 2));
