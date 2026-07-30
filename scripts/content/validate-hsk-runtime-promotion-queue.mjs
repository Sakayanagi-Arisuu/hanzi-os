import {
  assertValidHskRuntimePromotionQueueBundle,
  loadHskRuntimePromotionQueueBundle,
} from "../../src/content/hskRuntimePromotionQueue.mjs";

const bundle = loadHskRuntimePromotionQueueBundle();
const result = assertValidHskRuntimePromotionQueueBundle(bundle);

console.log(JSON.stringify({
  valid: true,
  reportId: bundle.report.reportId,
  summary: result.summary,
  nextPromotionCandidate: bundle.report.nextPromotionCandidate,
}, null, 2));
