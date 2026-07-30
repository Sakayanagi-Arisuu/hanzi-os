import { createHash } from "node:crypto";
import { inspectCanonicalWave } from "./audioInspection.mjs";
import { canonicalJson, sha256Json } from "./governance.mjs";
import {
  evaluateHsk1UnitEvidenceIntake,
  loadHsk1UnitEvidenceIntakeSources,
} from "./hsk1UnitEvidenceIntake.mjs";
import { assertValidHsk1UnitPromotionHandoffBundle } from
  "./hsk1UnitPromotionHandoff.mjs";
import { assertValidHsk1UnitReviewerPacketBundle } from
  "./hsk1UnitReviewerPacket.mjs";

const SAFE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u;
const EVIDENCE_PATH_PATTERN =
  /^audio\/evidence\/[a-zA-Z0-9][a-zA-Z0-9._-]*$/u;
const MAX_LOCAL_EVIDENCE_BYTES = 8 * 1024 * 1024;
const DOCUMENT_KEYS = [
  "schemaVersion",
  "assignmentSha256",
  "assignment",
  "response",
];
const ASSIGNMENT_KEYS = [
  "schemaVersion",
  "recordId",
  "packetId",
  "packetSha256",
  "unitReleaseDigest",
  "audioTargetId",
  "targetKind",
  "sourceTargetSha256",
  "expectedFileName",
  "script",
  "asset",
  "speaker",
  "speakerConsent",
  "rights",
  "assignedBy",
  "nativeReviewerId",
  "audioRightsReviewerId",
  "assignedAt",
  "policy",
];
const RESPONSE_KEYS = [
  "schemaVersion",
  "assignmentSha256",
  "nativeReview",
  "audioRightsReview",
];
const REVIEW_KEYS = [
  "reviewerId",
  "reviewedAt",
  "outcome",
  "decisions",
  "note",
];
const NATIVE_DECISION_KEYS = [
  "transcriptMatchesPacket",
  "pronunciationAccepted",
  "deliveryAndSegmentationAccepted",
  "audioIsIntelligible",
  "noUnintendedContent",
];
const RIGHTS_DECISION_KEYS = [
  "speakerConsentVerified",
  "permittedUseVerified",
  "assetIdentityVerified",
  "retentionAndDistributionTermsVerified",
  "independenceConfirmed",
];
const POLICY = {
  localEvidenceOnly: true,
  assignmentBindsCurrentPacketAndBytes: true,
  nativeAndRightsReviewersMustBeIndependent: true,
  exportDoesNotApproveAudio: true,
  importWritesLocalRecordOnly: true,
  importDoesNotAuthorizePackageOrRuntime: true,
  grantsMeasurementOrMastery: false,
};

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value, keys) =>
  isRecord(value)
  && Object.keys(value).length === keys.length
  && keys.every((key) => Object.hasOwn(value, key));
const exact = (left, right) => canonicalJson(left) === canonicalJson(right);
const canonicalTimestamp = (value) =>
  typeof value === "string"
  && !Number.isNaN(Date.parse(value))
  && new Date(Date.parse(value)).toISOString() === value;
const safeId = (value) =>
  typeof value === "string"
  && value.length > 0
  && value.length <= 128
  && SAFE_ID_PATTERN.test(value);
const validNote = (value) =>
  value === null
  || (typeof value === "string" && value.length > 0 && value.length <= 2_000);
const sha256Bytes = (bytes) =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

const assertEvidenceBytes = (bytes, label) => {
  if (
    !(bytes instanceof Uint8Array)
    || bytes.byteLength === 0
    || bytes.byteLength > MAX_LOCAL_EVIDENCE_BYTES
  ) {
    throw new Error(`${label} must be a non-empty file of at most 8 MiB`);
  }
};

const loadContext = async (root) => {
  const source = loadHsk1UnitEvidenceIntakeSources(root);
  await assertValidHsk1UnitPromotionHandoffBundle(source.handoffBundle);
  await assertValidHsk1UnitReviewerPacketBundle(source.packetBundle);
  return {
    source,
    handoff: source.handoffBundle.handoff,
    packet: source.packetBundle.packet,
  };
};

const resolveAudioTarget = (context, audioTargetId) => {
  const requirement = context.handoff.targetBundle.audioRequirements.find(
    (candidate) => candidate.audioTargetId === audioTargetId,
  );
  const packetTarget = context.packet.audioRecordingManifest.find(
    (candidate) => candidate.audioTargetId === audioTargetId,
  );
  if (!requirement || !packetTarget) {
    throw new Error(`Unknown HSK1 atomic-unit audio target: ${audioTargetId}`);
  }
  if (
    requirement.sourceTargetSha256 !== packetTarget.sourceTargetSha256
    || requirement.lessonId !== packetTarget.lessonId
  ) {
    throw new Error(`${audioTargetId} handoff and packet bindings disagree`);
  }
  return { requirement, packetTarget };
};

const assertIdentityAndTime = ({
  recordId,
  speakerId,
  languageTag,
  recordedAt,
  assignedBy,
  nativeReviewerId,
  audioRightsReviewerId,
  assignedAt,
  nowEpochMs,
}) => {
  for (const [value, label] of [
    [recordId, "recordId"],
    [speakerId, "speakerId"],
    [assignedBy, "assignedBy"],
    [nativeReviewerId, "nativeReviewerId"],
    [audioRightsReviewerId, "audioRightsReviewerId"],
  ]) {
    if (!safeId(value)) throw new Error(`${label} must be a safe identifier`);
  }
  if (
    new Set([speakerId, nativeReviewerId, audioRightsReviewerId]).size !== 3
  ) {
    throw new Error("Speaker, native reviewer and rights reviewer must differ");
  }
  if (
    typeof languageTag !== "string"
    || languageTag.length === 0
    || languageTag.length > 64
  ) {
    throw new Error("languageTag must be a non-empty value of at most 64 characters");
  }
  if (
    !canonicalTimestamp(recordedAt)
    || !canonicalTimestamp(assignedAt)
    || Date.parse(recordedAt) > Date.parse(assignedAt)
    || Date.parse(assignedAt) > nowEpochMs
  ) {
    throw new Error(
      "recordedAt/assignedAt must be canonical UTC, ordered and not in the future",
    );
  }
};

export const buildHsk1UnitAudioReviewDocument = async ({
  root = process.cwd(),
  recordId,
  audioTargetId,
  assetBytes,
  speakerId,
  languageTag,
  recordedAt,
  speakerConsentRelativePath,
  speakerConsentBytes,
  rightsRelativePath,
  rightsEvidenceBytes,
  assignedBy,
  nativeReviewerId,
  audioRightsReviewerId,
  assignedAt,
  nowEpochMs = Date.now(),
}) => {
  assertEvidenceBytes(assetBytes, "assetBytes");
  assertEvidenceBytes(speakerConsentBytes, "speakerConsentBytes");
  assertEvidenceBytes(rightsEvidenceBytes, "rightsEvidenceBytes");
  if (
    !EVIDENCE_PATH_PATTERN.test(speakerConsentRelativePath ?? "")
    || !EVIDENCE_PATH_PATTERN.test(rightsRelativePath ?? "")
  ) {
    throw new Error("Consent and rights files must use safe audio/evidence paths");
  }
  assertIdentityAndTime({
    recordId,
    speakerId,
    languageTag,
    recordedAt,
    assignedBy,
    nativeReviewerId,
    audioRightsReviewerId,
    assignedAt,
    nowEpochMs,
  });

  const context = await loadContext(root);
  const { requirement, packetTarget } = resolveAudioTarget(
    context,
    audioTargetId,
  );
  const assignment = {
    schemaVersion: 1,
    recordId,
    packetId: context.packet.packetId,
    packetSha256: context.packet.packetSha256,
    unitReleaseDigest: context.packet.unitReleaseDigest,
    audioTargetId,
    targetKind: packetTarget.targetKind,
    sourceTargetSha256: requirement.sourceTargetSha256,
    expectedFileName: packetTarget.expectedFileName,
    script: packetTarget.script,
    asset: {
      relativePath: `audio/assets/${packetTarget.expectedFileName}`,
      sha256: sha256Bytes(assetBytes),
      media: inspectCanonicalWave(assetBytes),
    },
    speaker: { speakerId, languageTag, recordedAt },
    speakerConsent: {
      relativePath: speakerConsentRelativePath,
      sha256: sha256Bytes(speakerConsentBytes),
    },
    rights: {
      relativePath: rightsRelativePath,
      sha256: sha256Bytes(rightsEvidenceBytes),
    },
    assignedBy,
    nativeReviewerId,
    audioRightsReviewerId,
    assignedAt,
    policy: POLICY,
  };
  const assignmentSha256 = await sha256Json(assignment);
  return {
    schemaVersion: 1,
    assignmentSha256,
    assignment,
    response: {
      schemaVersion: 1,
      assignmentSha256,
      nativeReview: {
        reviewerId: nativeReviewerId,
        reviewedAt: null,
        outcome: null,
        decisions: Object.fromEntries(
          NATIVE_DECISION_KEYS.map((key) => [key, null]),
        ),
        note: null,
      },
      audioRightsReview: {
        reviewerId: audioRightsReviewerId,
        reviewedAt: null,
        outcome: null,
        decisions: Object.fromEntries(
          RIGHTS_DECISION_KEYS.map((key) => [key, null]),
        ),
        note: null,
      },
    },
  };
};

const completedReviewErrors = ({
  review,
  keys,
  expectedReviewerId,
  assignedAt,
  nowEpochMs,
  label,
}) => {
  const errors = [];
  if (
    !exactKeys(review, REVIEW_KEYS)
    || review.reviewerId !== expectedReviewerId
    || !exactKeys(review.decisions, keys)
    || keys.some((key) => review.decisions[key] !== true)
    || review.outcome !== "approved"
    || !canonicalTimestamp(review.reviewedAt)
    || Date.parse(review.reviewedAt) < Date.parse(assignedAt)
    || Date.parse(review.reviewedAt) > nowEpochMs
    || !validNote(review.note)
  ) {
    errors.push(`${label} must approve every exact checklist decision`);
  }
  return errors;
};

/**
 * @param {object} document
 * @param {{
 *   root?: string;
 *   assetBytes: Uint8Array;
 *   speakerConsentBytes: Uint8Array;
 *   rightsEvidenceBytes: Uint8Array;
 *   nowEpochMs?: number;
 * }} options
 */
export const validateCompletedHsk1UnitAudioReviewDocument = async (
  document,
  {
    root = process.cwd(),
    assetBytes,
    speakerConsentBytes,
    rightsEvidenceBytes,
    nowEpochMs = Date.now(),
  },
) => {
  const errors = [];
  if (!exactKeys(document, DOCUMENT_KEYS) || document.schemaVersion !== 1) {
    return {
      valid: false,
      errors: ["audio review document root schema is invalid"],
      record: null,
    };
  }
  const assignment = document.assignment;
  if (
    !exactKeys(assignment, ASSIGNMENT_KEYS)
    || assignment.schemaVersion !== 1
    || !exactKeys(assignment.policy, Object.keys(POLICY))
    || Object.entries(POLICY).some(
      ([key, value]) => assignment.policy[key] !== value,
    )
  ) {
    errors.push("audio review assignment schema or policy is invalid");
  }

  let expected = null;
  try {
    expected = await buildHsk1UnitAudioReviewDocument({
      root,
      recordId: assignment?.recordId,
      audioTargetId: assignment?.audioTargetId,
      assetBytes,
      speakerId: assignment?.speaker?.speakerId,
      languageTag: assignment?.speaker?.languageTag,
      recordedAt: assignment?.speaker?.recordedAt,
      speakerConsentRelativePath: assignment?.speakerConsent?.relativePath,
      speakerConsentBytes,
      rightsRelativePath: assignment?.rights?.relativePath,
      rightsEvidenceBytes,
      assignedBy: assignment?.assignedBy,
      nativeReviewerId: assignment?.nativeReviewerId,
      audioRightsReviewerId: assignment?.audioRightsReviewerId,
      assignedAt: assignment?.assignedAt,
      nowEpochMs,
    });
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  if (
    expected
    && (
      !exact(assignment, expected.assignment)
      || document.assignmentSha256 !== expected.assignmentSha256
    )
  ) {
    errors.push("audio review assignment no longer matches current bytes/packet");
  }

  const response = document.response;
  if (
    !exactKeys(response, RESPONSE_KEYS)
    || response.schemaVersion !== 1
    || response.assignmentSha256 !== document.assignmentSha256
  ) {
    errors.push("audio review response schema is invalid");
  } else {
    errors.push(...completedReviewErrors({
      review: response.nativeReview,
      keys: NATIVE_DECISION_KEYS,
      expectedReviewerId: assignment?.nativeReviewerId,
      assignedAt: assignment?.assignedAt,
      nowEpochMs,
      label: "Native Mandarin audio review",
    }));
    errors.push(...completedReviewErrors({
      review: response.audioRightsReview,
      keys: RIGHTS_DECISION_KEYS,
      expectedReviewerId: assignment?.audioRightsReviewerId,
      assignedAt: assignment?.assignedAt,
      nowEpochMs,
      label: "Audio rights review",
    }));
  }
  if (errors.length > 0 || !expected) {
    return { valid: false, errors, record: null };
  }

  const nativeReviewCore = {
    schemaVersion: 1,
    receiptKind: "native-mandarin-audio-review",
    audioTargetId: assignment.audioTargetId,
    sourceTargetSha256: assignment.sourceTargetSha256,
    assetSha256: assignment.asset.sha256,
    reviewerId: response.nativeReview.reviewerId,
    reviewedAt: response.nativeReview.reviewedAt,
    outcome: "approved",
    evidenceClass: "repository-real",
  };
  const rightsReviewCore = {
    schemaVersion: 1,
    receiptKind: "audio-rights-review",
    audioTargetId: assignment.audioTargetId,
    assetSha256: assignment.asset.sha256,
    speakerConsentSha256: assignment.speakerConsent.sha256,
    rightsEvidenceSha256: assignment.rights.sha256,
    reviewerId: response.audioRightsReview.reviewerId,
    reviewedAt: response.audioRightsReview.reviewedAt,
    outcome: "approved",
    evidenceClass: "repository-real",
  };
  const recordCore = {
    schemaVersion: 1,
    recordId: assignment.recordId,
    audioTargetId: assignment.audioTargetId,
    sourceTargetSha256: assignment.sourceTargetSha256,
    evidenceClass: "repository-real",
    asset: assignment.asset,
    speaker: assignment.speaker,
    speakerConsent: assignment.speakerConsent,
    rights: assignment.rights,
    nativeReview: {
      ...nativeReviewCore,
      receiptSha256: await sha256Json(nativeReviewCore),
    },
    audioRightsReview: {
      ...rightsReviewCore,
      receiptSha256: await sha256Json(rightsReviewCore),
    },
  };
  const record = {
    ...recordCore,
    recordSha256: await sha256Json(recordCore),
  };
  const evidenceResult = await evaluateHsk1UnitEvidenceIntake({
    source: loadHsk1UnitEvidenceIntakeSources(root),
    evidence: {
      schemaVersion: 1,
      evidenceMode: "repository-real",
      reviewDocuments: [],
      audioRecords: [{
        record,
        assetBytes,
        speakerConsentBytes,
        rightsEvidenceBytes,
      }],
    },
    nowEpochMs,
  });
  if (
    !evidenceResult.evidenceValid
    || evidenceResult.audio.reviewedTargets !== 1
  ) {
    return {
      valid: false,
      errors: evidenceResult.validationErrors.length > 0
        ? evidenceResult.validationErrors
        : ["Audio record did not satisfy the unit evidence evaluator"],
      record: null,
    };
  }
  return { valid: true, errors: [], record };
};

export const validateHsk1UnitAudioEvidenceWorkflow = async (
  root = process.cwd(),
) => {
  const context = await loadContext(root);
  const requirements = context.handoff.targetBundle.audioRequirements;
  const targets = context.packet.audioRecordingManifest;
  const targetIds = new Set(targets.map((target) => target.audioTargetId));
  const fileNames = new Set(targets.map((target) => target.expectedFileName));
  if (
    requirements.length !== targets.length
    || targetIds.size !== targets.length
    || fileNames.size !== targets.length
    || requirements.some((requirement) => {
      try {
        resolveAudioTarget(context, requirement.audioTargetId);
        return false;
      } catch {
        return true;
      }
    })
  ) {
    throw new Error("HSK1 unit audio workflow target inventory is invalid");
  }
  return {
    packetId: context.packet.packetId,
    packetSha256: context.packet.packetSha256,
    unitReleaseDigest: context.packet.unitReleaseDigest,
    audioTargets: targets.length,
    dialogueTargets: targets.filter(
      (target) => target.targetKind !== "listening-selection",
    ).length,
    vocabularyTargets: targets.filter(
      (target) => target.targetKind === "listening-selection",
    ).length,
    importedRecords: 0,
    packageOrRuntimeMutations: 0,
  };
};
