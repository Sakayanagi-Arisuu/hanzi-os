import {
  assertValidHsk1UnitPackagePlanBundle,
  loadHsk1UnitPackagePlanBundle,
} from "../../src/content/hsk1UnitPackagePlan.mjs";

const bundle = loadHsk1UnitPackagePlanBundle();
const result = await assertValidHsk1UnitPackagePlanBundle(bundle);

console.log(JSON.stringify({
  valid: true,
  planId: bundle.plan.planId,
  state: bundle.plan.state,
  summary: result.summary,
}, null, 2));
