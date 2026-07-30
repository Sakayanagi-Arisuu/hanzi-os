import {
  evaluateHsk1UnitEvidenceIntake,
  loadLocalHsk1UnitEvidence,
} from "../../src/content/hsk1UnitEvidenceIntake.mjs";

const { source, evidence } = loadLocalHsk1UnitEvidence();
const result = await evaluateHsk1UnitEvidenceIntake({ source, evidence });

console.log(JSON.stringify({
  valid: result.evidenceValid,
  evidenceMode: result.evidenceMode,
  evidenceComplete: result.evidenceComplete,
  readyForPackage: result.readyForPackage,
  importAuthorized: result.importAuthorized,
  blockers: result.blockers,
  validationErrors: result.validationErrors,
  review: {
    requiredSlots: result.review.requiredSlots,
    suppliedSlots: result.review.suppliedSlots,
    approvedSlots: result.review.approvedSlots,
    missingSlots: result.review.missingSlotKeys.length,
  },
  audio: {
    requiredTargets: result.audio.requiredTargets,
    suppliedTargets: result.audio.suppliedTargets,
    reviewedTargets: result.audio.reviewedTargets,
    missingTargets: result.audio.missingTargetIds.length,
  },
}, null, 2));

if (!result.evidenceValid) process.exitCode = 1;
