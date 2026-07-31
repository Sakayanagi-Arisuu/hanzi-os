import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const HSK_LOCAL_STUDY_PROFILE_RELATIVE_PATH =
  "config/hsk0-4-local-study-profile.json";
export const HSK_LOCAL_STUDY_PROFILE_ID =
  "hsk0-4-personal-study-2026.07.1";

export const HSK_LOCAL_STUDY_REVIEW_PASSES = [
  "mandarin-accuracy-and-naturalness",
  "pinyin-and-tone-consistency",
  "vietnamese-meaning-and-usage",
  "pedagogy-rubric-and-distractors",
  "source-and-level-mapping",
];

const ROOT_KEYS = [
  "assessment",
  "audience",
  "audio",
  "contentAcceptance",
  "goal",
  "productionBoundary",
  "profileId",
  "schemaVersion",
];
const CONTENT_ACCEPTANCE_KEYS = [
  "acceptedLinguisticReviewMode",
  "aiDisclosureRequired",
  "humanReviewRequired",
  "reviewPasses",
  "reviewerIndependenceRequired",
  "schemaValidationRequired",
  "sourceBindingRequired",
  "unresolvedIssuesBlockVisibility",
];
const AUDIO_KEYS = [
  "fallbacks",
  "listeningMasteryEligible",
  "mode",
  "nativeSpeakerReviewRequired",
  "packagedAudioRequired",
  "practiceOnly",
  "pronunciationMasteryEligible",
  "rightsEvidenceRequired",
  "syntheticDisclosureRequired",
];
const ASSESSMENT_KEYS = [
  "objectivePracticeMayBeScored",
  "officialCertificationClaimAllowed",
  "productivePracticeIsSelfAssessed",
  "skillTransferInferenceAllowed",
  "uncalibratedLabelRequired",
];
const PRODUCTION_BOUNDARY_KEYS = [
  "calibrationClaimAllowed",
  "humanReviewClaimAllowed",
  "nativeAudioClaimAllowed",
  "productionEligible",
  "productionReadinessGatesUnchanged",
  "sitesDeferred",
];
const REVIEW_RESULT_KEYS = [
  "aiAssistedDisclosed",
  "humanReviewed",
  "mode",
  "passResults",
  "sourceBound",
  "schemaValid",
  "unresolvedIssueCount",
];

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const hasExactKeys = (value, keys) =>
  isRecord(value)
  && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
const exact = (left, right) => JSON.stringify(left) === JSON.stringify(right);

export const loadHskLocalStudyProfile = (root = process.cwd()) =>
  JSON.parse(readFileSync(
    resolve(root, HSK_LOCAL_STUDY_PROFILE_RELATIVE_PATH),
    "utf8",
  ));

export const validateHskLocalStudyProfile = (profile) => {
  const errors = [];
  if (!hasExactKeys(profile, ROOT_KEYS)) {
    errors.push("Local-study profile root keys are invalid");
  }
  if (
    profile?.schemaVersion !== 1
    || profile?.profileId !== HSK_LOCAL_STUDY_PROFILE_ID
    || profile?.audience !== "personal-local-study"
    || profile?.goal !== "graduation-project-and-personal-hsk0-4-study"
  ) {
    errors.push("Local-study profile identity is invalid");
  }

  const acceptance = profile?.contentAcceptance;
  if (
    !hasExactKeys(acceptance, CONTENT_ACCEPTANCE_KEYS)
    || acceptance.schemaValidationRequired !== true
    || acceptance.sourceBindingRequired !== true
    || acceptance.acceptedLinguisticReviewMode !== "ai-assisted-self-review"
    || acceptance.humanReviewRequired !== false
    || acceptance.reviewerIndependenceRequired !== false
    || !exact(acceptance.reviewPasses, HSK_LOCAL_STUDY_REVIEW_PASSES)
    || acceptance.aiDisclosureRequired !== true
    || acceptance.unresolvedIssuesBlockVisibility !== true
  ) {
    errors.push("Local-study content acceptance policy is unsafe or invalid");
  }

  const audio = profile?.audio;
  if (
    !hasExactKeys(audio, AUDIO_KEYS)
    || audio.mode !== "browser-speech-synthesis"
    || audio.practiceOnly !== true
    || audio.syntheticDisclosureRequired !== true
    || audio.packagedAudioRequired !== false
    || audio.nativeSpeakerReviewRequired !== false
    || audio.rightsEvidenceRequired !== false
    || !exact(audio.fallbacks, ["hanzi", "pinyin"])
    || audio.listeningMasteryEligible !== false
    || audio.pronunciationMasteryEligible !== false
  ) {
    errors.push("Local-study synthetic audio boundary is invalid");
  }

  const assessment = profile?.assessment;
  if (
    !hasExactKeys(assessment, ASSESSMENT_KEYS)
    || assessment.objectivePracticeMayBeScored !== true
    || assessment.uncalibratedLabelRequired !== true
    || assessment.productivePracticeIsSelfAssessed !== true
    || assessment.skillTransferInferenceAllowed !== false
    || assessment.officialCertificationClaimAllowed !== false
  ) {
    errors.push("Local-study assessment boundary is invalid");
  }

  const production = profile?.productionBoundary;
  if (
    !hasExactKeys(production, PRODUCTION_BOUNDARY_KEYS)
    || production.productionEligible !== false
    || production.humanReviewClaimAllowed !== false
    || production.nativeAudioClaimAllowed !== false
    || production.calibrationClaimAllowed !== false
    || production.productionReadinessGatesUnchanged !== true
    || production.sitesDeferred !== true
  ) {
    errors.push("Local-study production boundary is invalid");
  }

  return {
    valid: errors.length === 0,
    errors,
    summary: {
      profileId: profile?.profileId ?? null,
      reviewPasses: Array.isArray(acceptance?.reviewPasses)
        ? acceptance.reviewPasses.length
        : 0,
      syntheticPracticeAudio: audio?.practiceOnly === true,
      productionEligible: production?.productionEligible === true,
    },
  };
};

export const evaluateHskLocalStudyReview = (
  review,
  profile = loadHskLocalStudyProfile(),
) => {
  const profileValidation = validateHskLocalStudyProfile(profile);
  const blockers = [...profileValidation.errors.map(
    (error) => `INVALID_PROFILE:${error}`,
  )];
  if (!hasExactKeys(review, REVIEW_RESULT_KEYS)) {
    blockers.push("INVALID_REVIEW_SHAPE");
  }
  if (review?.mode !== profile?.contentAcceptance?.acceptedLinguisticReviewMode) {
    blockers.push("UNACCEPTED_REVIEW_MODE");
  }
  if (review?.schemaValid !== true) blockers.push("SCHEMA_VALIDATION_MISSING");
  if (review?.sourceBound !== true) blockers.push("SOURCE_BINDING_MISSING");
  if (review?.aiAssistedDisclosed !== true) blockers.push("AI_DISCLOSURE_MISSING");
  if (review?.humanReviewed !== false) blockers.push("FALSE_HUMAN_REVIEW_CLAIM");
  if (!Number.isInteger(review?.unresolvedIssueCount)
    || review.unresolvedIssueCount !== 0) {
    blockers.push("UNRESOLVED_REVIEW_ISSUES");
  }
  if (!hasExactKeys(
    review?.passResults,
    HSK_LOCAL_STUDY_REVIEW_PASSES,
  )) {
    blockers.push("INVALID_REVIEW_PASS_SET");
  } else {
    for (const pass of HSK_LOCAL_STUDY_REVIEW_PASSES) {
      if (review.passResults[pass] !== "passed") {
        blockers.push(`REVIEW_PASS_NOT_PASSED:${pass}`);
      }
    }
  }
  return {
    profileId: profile?.profileId ?? null,
    audience: profile?.audience ?? null,
    readyForLocalStudyVisibility: blockers.length === 0,
    blockers,
    claims: {
      aiAssistedReview: blockers.length === 0,
      humanReview: false,
      nativeAudio: false,
      calibratedAssessment: false,
      listeningMastery: false,
      pronunciationMastery: false,
      officialHskCertification: false,
      productionEligible: false,
    },
  };
};

export const assertValidHskLocalStudyProfile = (profile) => {
  const result = validateHskLocalStudyProfile(profile);
  if (!result.valid) {
    throw new Error(`Invalid HSK local-study profile:\n- ${result.errors.join("\n- ")}`);
  }
  return result;
};
