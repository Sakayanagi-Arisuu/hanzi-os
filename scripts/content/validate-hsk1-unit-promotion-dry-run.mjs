import {
  assertValidHsk1UnitPromotionDryRunBundle,
  loadHsk1UnitPromotionDryRunBundle,
} from "../../src/content/hsk1UnitPromotionDryRun.mjs";

const bundle = loadHsk1UnitPromotionDryRunBundle();
const result = await assertValidHsk1UnitPromotionDryRunBundle(bundle);

console.log(JSON.stringify({
  valid: true,
  reportId: bundle.report.reportId,
  state: bundle.report.state,
  summary: result.summary,
}, null, 2));
