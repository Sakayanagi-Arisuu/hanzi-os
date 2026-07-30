import {
  assertValidHsk1UnitRuntimeActivityProjectionBundle,
  loadHsk1UnitRuntimeActivityProjectionBundle,
} from "../../src/content/hsk1UnitRuntimeActivityProjection.mjs";

const bundle = loadHsk1UnitRuntimeActivityProjectionBundle();
const result = await assertValidHsk1UnitRuntimeActivityProjectionBundle(bundle);

console.log(JSON.stringify({
  valid: true,
  projectionId: bundle.projection.projectionId,
  state: bundle.projection.state,
  summary: result.summary,
}, null, 2));
