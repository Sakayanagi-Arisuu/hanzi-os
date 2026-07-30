import {
  assertValidHsk1UnitPromotionHandoffBundle,
  loadHsk1UnitPromotionHandoffBundle,
} from "../../src/content/hsk1UnitPromotionHandoff.mjs";

const bundle = loadHsk1UnitPromotionHandoffBundle();
const result = await assertValidHsk1UnitPromotionHandoffBundle(bundle);

console.log(JSON.stringify({
  valid: true,
  handoffId: bundle.handoff.handoffId,
  state: bundle.handoff.state,
  unitReleaseDigest: bundle.handoff.unitReleaseDigest,
  summary: result.summary,
  readiness: bundle.handoff.readiness,
}, null, 2));
