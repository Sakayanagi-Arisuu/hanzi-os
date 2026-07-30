import {
  assertValidHsk1LessonPromotionHandoffBundle,
  loadHsk1LessonPromotionHandoffBundle,
} from "../../src/content/hsk1LessonPromotionHandoff.mjs";

const bundle = loadHsk1LessonPromotionHandoffBundle();
const result = await assertValidHsk1LessonPromotionHandoffBundle(bundle);

console.log(JSON.stringify({
  valid: true,
  handoffId: bundle.handoff.handoffId,
  state: bundle.handoff.state,
  summary: result.summary,
  readiness: bundle.handoff.readiness,
}, null, 2));
