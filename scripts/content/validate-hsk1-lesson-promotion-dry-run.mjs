import {
  assertValidHsk1LessonPromotionDryRunBundle,
  loadHsk1LessonPromotionDryRunBundle,
} from "../../src/content/hsk1LessonPromotionDryRun.mjs";

const bundle = loadHsk1LessonPromotionDryRunBundle();
const result = await assertValidHsk1LessonPromotionDryRunBundle(bundle);

console.log(JSON.stringify({
  valid: true,
  reportId: bundle.report.reportId,
  state: bundle.report.state,
  summary: result.summary,
  unitBoundary: bundle.report.result.unitBoundary,
  unintendedActivation: {
    units: bundle.report.result.activation.unintendedNewlyEligibleUnitIds,
    lessons: bundle.report.result.activation.unintendedLessonIds,
  },
}, null, 2));
