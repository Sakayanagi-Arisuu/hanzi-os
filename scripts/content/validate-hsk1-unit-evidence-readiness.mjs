import {
  assertValidHsk1UnitEvidenceReadinessBundle,
  loadHsk1UnitEvidenceReadinessBundle,
} from "../../src/content/hsk1UnitEvidenceIntake.mjs";

const bundle = loadHsk1UnitEvidenceReadinessBundle();
const result = await assertValidHsk1UnitEvidenceReadinessBundle(bundle);

console.log(JSON.stringify({
  valid: true,
  reportId: bundle.report.reportId,
  state: bundle.report.state,
  summary: result.summary,
}, null, 2));
