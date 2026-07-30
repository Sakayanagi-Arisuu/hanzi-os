import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import { relative, resolve, sep } from "node:path";
import { inspectCanonicalWave } from "./audioInspection.mjs";
import { canonicalJson, sha256Json } from "./governance.mjs";
import {
  buildHsk1ReviewAssignmentDocument,
  validateCompletedHsk1ReviewDocument,
} from "./hsk1ReviewWorkflow.mjs";
import {
  assertValidHsk1UnitPromotionHandoffBundle,
  HSK1_UNIT_PROMOTION_HANDOFF_RELATIVE_PATH,
  loadHsk1UnitPromotionHandoffBundle,
} from "./hsk1UnitPromotionHandoff.mjs";
import {
  assertValidHsk1UnitReviewerPacketBundle,
  HSK1_UNIT_REVIEWER_PACKET_RELATIVE_PATH,
  loadHsk1UnitReviewerPacketBundle,
} from "./hsk1UnitReviewerPacket.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

export const HSK1_UNIT_EVIDENCE_READINESS_RELATIVE_PATH =
  "content/reports/hsk1-time-place-events-evidence-readiness.json";
export const HSK1_UNIT_EVIDENCE_READINESS_ID =
  "hsk1-time-place-events-evidence-readiness-2026.07.1";
export const HSK1_UNIT_LOCAL_EVIDENCE_RELATIVE_PATH =
  "content/review/local/hsk1-time-place-events";

const REVIEW_ASSIGNMENTS_RELATIVE_PATH =
  "content/review/local/assignments";
const REVIEW_RECEIPTS_RELATIVE_PATH = "content/review/local/receipts";
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const SAFE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u;
const SAFE_LOCAL_FILE_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u;
const AUDIO_RELATIVE_PATH_PATTERN =
  /^audio\/(?:assets|evidence)\/[a-zA-Z0-9][a-zA-Z0-9._-]*$/u;
const MAX_LOCAL_JSON_BYTES = 8 * 1024 * 1024;
const MAX_LOCAL_EVIDENCE_BYTES = 8 * 1024 * 1024;
const MAX_LOCAL_FILES = 1_000;
const FIXTURE_ASSIGNED_AT = "2026-07-30T00:00:00.000Z";
const FIXTURE_RECORDED_AT = "2026-07-30T00:10:00.000Z";
const FIXTURE_REVIEWED_AT = "2026-07-30T00:20:00.000Z";
const FIXTURE_NOW = Date.parse("2026-07-30T00:30:00.000Z");
/**
 * @typedef {{
 *   schemaVersion: number;
 *   evidenceMode: string;
 *   reviewDocuments: Array<object>;
 *   audioRecords: Array<object>;
 * }} Hsk1UnitEvidence
 */
/** @type {Hsk1UnitEvidence} */
const EMPTY_EVIDENCE = {
  schemaVersion: 1,
  evidenceMode: "repository-real",
  reviewDocuments: [],
  audioRecords: [],
};
const POLICY = {
  localEvidenceOnly: true,
  reviewDocumentsRevalidatedAgainstCurrentManifest: true,
  exactApprovedReviewSlotsRequired: true,
  canonicalWaveInspectionRequired: true,
  speakerProvenanceRequired: true,
  nativeAudioReviewRequired: true,
  audioRightsEvidenceAndReviewRequired: true,
  duplicateAssetReuseForbidden: true,
  testFixturesNeverReadyForPackage: true,
  evaluatorWritesContentOrRuntime: false,
  evaluatorAuthorizesImport: false,
  grantsMeasurementOrMastery: false,
};
const EVIDENCE_KEYS = [
  "schemaVersion",
  "evidenceMode",
  "reviewDocuments",
  "audioRecords",
];
const REVIEW_DOCUMENT_ENTRY_KEYS = ["document", "receipt"];
const AUDIO_RECORD_ENTRY_KEYS = [
  "record",
  "assetBytes",
  "speakerConsentBytes",
  "rightsEvidenceBytes",
];
const RECORD_KEYS = [
  "schemaVersion",
  "recordId",
  "audioTargetId",
  "sourceTargetSha256",
  "evidenceClass",
  "asset",
  "speaker",
  "speakerConsent",
  "rights",
  "nativeReview",
  "audioRightsReview",
  "recordSha256",
];
const ASSET_KEYS = ["relativePath", "sha256", "media"];
const SPEAKER_KEYS = ["speakerId", "languageTag", "recordedAt"];
const FILE_EVIDENCE_KEYS = ["relativePath", "sha256"];
const NATIVE_REVIEW_KEYS = [
  "schemaVersion",
  "receiptKind",
  "audioTargetId",
  "sourceTargetSha256",
  "assetSha256",
  "reviewerId",
  "reviewedAt",
  "outcome",
  "evidenceClass",
  "receiptSha256",
];
const RIGHTS_REVIEW_KEYS = [
  "schemaVersion",
  "receiptKind",
  "audioTargetId",
  "assetSha256",
  "speakerConsentSha256",
  "rightsEvidenceSha256",
  "reviewerId",
  "reviewedAt",
  "outcome",
  "evidenceClass",
  "receiptSha256",
];

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exact = (left, right) => canonicalJson(left) === canonicalJson(right);
const exactKeys = (value, keys) =>
  isRecord(value)
  && Object.keys(value).length === keys.length
  && keys.every((key) => Object.hasOwn(value, key));
const canonicalTimestamp = (value) =>
  typeof value === "string"
  && !Number.isNaN(Date.parse(value))
  && new Date(Date.parse(value)).toISOString() === value;
const sha256Bytes = (bytes) =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const sourceBinding = (root, id, relativePath) => ({
  id,
  relativePath,
  sha256: fileSha256(resolve(root, relativePath)),
});
const slotKey = (batchId, role) => `${batchId}:${role}`;
const safeId = (value) =>
  typeof value === "string"
  && value.length > 0
  && value.length <= 128
  && SAFE_ID_PATTERN.test(value);
const expectedEvidenceClass = (mode) =>
  mode === "test-fixture" ? "test-fixture" : "repository-real";

const recordCore = (record) => Object.fromEntries(
  RECORD_KEYS.filter((key) => key !== "recordSha256")
    .map((key) => [key, record[key]]),
);
const receiptCore = (receipt, keys) => Object.fromEntries(
  keys.filter((key) => key !== "receiptSha256")
    .map((key) => [key, receipt[key]]),
);

const validateAudioRecord = async ({
  entry,
  requirement,
  expectedFileName,
  evidenceMode,
  nowEpochMs,
}) => {
  const errors = [];
  const record = entry?.record;
  if (
    !exactKeys(entry, AUDIO_RECORD_ENTRY_KEYS)
    || !(entry.assetBytes instanceof Uint8Array)
    || !(entry.speakerConsentBytes instanceof Uint8Array)
    || !(entry.rightsEvidenceBytes instanceof Uint8Array)
    || !exactKeys(record, RECORD_KEYS)
    || !exactKeys(record?.asset, ASSET_KEYS)
    || !exactKeys(record?.speaker, SPEAKER_KEYS)
    || !exactKeys(record?.speakerConsent, FILE_EVIDENCE_KEYS)
    || !exactKeys(record?.rights, FILE_EVIDENCE_KEYS)
    || !exactKeys(record?.nativeReview, NATIVE_REVIEW_KEYS)
    || !exactKeys(record?.audioRightsReview, RIGHTS_REVIEW_KEYS)
  ) {
    return ["audio evidence record shape is invalid"];
  }
  const evidenceClass = expectedEvidenceClass(evidenceMode);
  if (
    record.schemaVersion !== 1
    || !safeId(record.recordId)
    || record.audioTargetId !== requirement.audioTargetId
    || record.sourceTargetSha256 !== requirement.sourceTargetSha256
    || record.evidenceClass !== evidenceClass
    || record.asset.relativePath !== `audio/assets/${expectedFileName}`
    || !AUDIO_RELATIVE_PATH_PATTERN.test(record.asset.relativePath)
    || !AUDIO_RELATIVE_PATH_PATTERN.test(record.speakerConsent.relativePath)
    || !AUDIO_RELATIVE_PATH_PATTERN.test(record.rights.relativePath)
    || !DIGEST_PATTERN.test(record.asset.sha256)
    || !DIGEST_PATTERN.test(record.speakerConsent.sha256)
    || !DIGEST_PATTERN.test(record.rights.sha256)
  ) {
    errors.push(`${requirement.audioTargetId} audio identity is invalid`);
  }
  if (
    entry.assetBytes.byteLength === 0
    || entry.assetBytes.byteLength > MAX_LOCAL_EVIDENCE_BYTES
    || sha256Bytes(entry.assetBytes) !== record.asset.sha256
  ) {
    errors.push(`${requirement.audioTargetId} audio bytes do not match`);
  } else {
    try {
      if (!exact(inspectCanonicalWave(entry.assetBytes), record.asset.media)) {
        errors.push(`${requirement.audioTargetId} inspected media has drifted`);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (
    entry.speakerConsentBytes.byteLength === 0
    || entry.speakerConsentBytes.byteLength > MAX_LOCAL_EVIDENCE_BYTES
    || sha256Bytes(entry.speakerConsentBytes) !== record.speakerConsent.sha256
  ) {
    errors.push(`${requirement.audioTargetId} speaker consent does not match`);
  }
  if (
    entry.rightsEvidenceBytes.byteLength === 0
    || entry.rightsEvidenceBytes.byteLength > MAX_LOCAL_EVIDENCE_BYTES
    || sha256Bytes(entry.rightsEvidenceBytes) !== record.rights.sha256
  ) {
    errors.push(`${requirement.audioTargetId} rights evidence does not match`);
  }
  if (
    !safeId(record.speaker.speakerId)
    || typeof record.speaker.languageTag !== "string"
    || record.speaker.languageTag.length === 0
    || record.speaker.languageTag.length > 64
    || !canonicalTimestamp(record.speaker.recordedAt)
    || Date.parse(record.speaker.recordedAt) > nowEpochMs
  ) {
    errors.push(`${requirement.audioTargetId} speaker provenance is invalid`);
  }
  const nativeReview = record.nativeReview;
  const nativeReviewExpectedCore = {
    schemaVersion: 1,
    receiptKind: "native-mandarin-audio-review",
    audioTargetId: requirement.audioTargetId,
    sourceTargetSha256: requirement.sourceTargetSha256,
    assetSha256: record.asset.sha256,
    reviewerId: nativeReview.reviewerId,
    reviewedAt: nativeReview.reviewedAt,
    outcome: "approved",
    evidenceClass,
  };
  if (
    !safeId(nativeReview.reviewerId)
    || !canonicalTimestamp(nativeReview.reviewedAt)
    || Date.parse(nativeReview.reviewedAt) < Date.parse(record.speaker.recordedAt)
    || Date.parse(nativeReview.reviewedAt) > nowEpochMs
    || !exact(receiptCore(nativeReview, NATIVE_REVIEW_KEYS), nativeReviewExpectedCore)
    || nativeReview.receiptSha256 !== await sha256Json(nativeReviewExpectedCore)
    || nativeReview.reviewerId === record.speaker.speakerId
  ) {
    errors.push(`${requirement.audioTargetId} native audio review is invalid`);
  }
  const rightsReview = record.audioRightsReview;
  const rightsReviewExpectedCore = {
    schemaVersion: 1,
    receiptKind: "audio-rights-review",
    audioTargetId: requirement.audioTargetId,
    assetSha256: record.asset.sha256,
    speakerConsentSha256: record.speakerConsent.sha256,
    rightsEvidenceSha256: record.rights.sha256,
    reviewerId: rightsReview.reviewerId,
    reviewedAt: rightsReview.reviewedAt,
    outcome: "approved",
    evidenceClass,
  };
  if (
    !safeId(rightsReview.reviewerId)
    || !canonicalTimestamp(rightsReview.reviewedAt)
    || Date.parse(rightsReview.reviewedAt) < Date.parse(record.speaker.recordedAt)
    || Date.parse(rightsReview.reviewedAt) > nowEpochMs
    || !exact(
      receiptCore(rightsReview, RIGHTS_REVIEW_KEYS),
      rightsReviewExpectedCore,
    )
    || rightsReview.receiptSha256 !== await sha256Json(rightsReviewExpectedCore)
    || rightsReview.reviewerId === record.speaker.speakerId
    || rightsReview.reviewerId === nativeReview.reviewerId
  ) {
    errors.push(`${requirement.audioTargetId} audio-rights review is invalid`);
  }
  if (record.recordSha256 !== await sha256Json(recordCore(record))) {
    errors.push(`${requirement.audioTargetId} evidence record digest is invalid`);
  }
  return errors;
};

export const loadHsk1UnitEvidenceIntakeSources = (
  root = process.cwd(),
) => ({
  root,
  handoffBundle: loadHsk1UnitPromotionHandoffBundle(root),
  packetBundle: loadHsk1UnitReviewerPacketBundle(root),
});

export const evaluateHsk1UnitEvidenceIntake = async ({
  source,
  evidence = EMPTY_EVIDENCE,
  nowEpochMs = Date.now(),
}) => {
  await assertValidHsk1UnitPromotionHandoffBundle(source.handoffBundle);
  await assertValidHsk1UnitReviewerPacketBundle(source.packetBundle);
  const handoff = source.handoffBundle.handoff;
  const packet = source.packetBundle.packet;
  if (
    !exactKeys(evidence, EVIDENCE_KEYS)
    || evidence.schemaVersion !== 1
    || !["repository-real", "test-fixture"].includes(evidence.evidenceMode)
    || !Array.isArray(evidence.reviewDocuments)
    || !Array.isArray(evidence.audioRecords)
  ) {
    throw new Error("HSK1 unit evidence input schema is invalid");
  }
  const validationErrors = [];
  const approvedReviewSlotKeys = new Set();
  const suppliedReviewSlotKeys = new Set();
  const approvedReviewersByBatch = new Map();
  const expectedSlots = new Map(handoff.requiredReviewReceipts.map((slot) => [
    slotKey(slot.batchId, slot.role),
    slot,
  ]));
  for (const [index, entry] of evidence.reviewDocuments.entries()) {
    if (
      !exactKeys(entry, REVIEW_DOCUMENT_ENTRY_KEYS)
      || !isRecord(entry.document)
      || !isRecord(entry.receipt)
    ) {
      validationErrors.push(`review evidence ${index} shape is invalid`);
      continue;
    }
    const assignment = entry.document.assignment;
    const key = slotKey(assignment?.batchId, assignment?.role);
    const expectedSlot = expectedSlots.get(key);
    if (!expectedSlot) {
      validationErrors.push(`review evidence ${index} is outside the unit handoff`);
      continue;
    }
    if (suppliedReviewSlotKeys.has(key)) {
      validationErrors.push(`review evidence duplicates ${key}`);
      continue;
    }
    suppliedReviewSlotKeys.add(key);
    const result = await validateCompletedHsk1ReviewDocument(entry.document, {
      root: source.root,
      nowEpochMs,
    });
    if (
      !result.valid
      || !result.receipt
      || !exact(result.receipt, entry.receipt)
      || entry.receipt.batchId !== expectedSlot.batchId
      || entry.receipt.role !== expectedSlot.role
      || entry.receipt.targetDigest !== expectedSlot.targetDigest
      || entry.receipt.outcome !== "approved"
    ) {
      validationErrors.push(`review evidence ${index} is not an exact approval`);
      continue;
    }
    const batchReviewers = approvedReviewersByBatch.get(
      entry.receipt.batchId,
    ) ?? new Set();
    if (batchReviewers.has(entry.receipt.reviewerId)) {
      validationErrors.push(
        `${entry.receipt.batchId} reuses one reviewer across required roles`,
      );
      continue;
    }
    batchReviewers.add(entry.receipt.reviewerId);
    approvedReviewersByBatch.set(entry.receipt.batchId, batchReviewers);
    approvedReviewSlotKeys.add(key);
  }
  const requirements = new Map(
    handoff.targetBundle.audioRequirements.map((requirement) => [
      requirement.audioTargetId,
      requirement,
    ]),
  );
  const packetAudio = new Map(packet.audioRecordingManifest.map((target) => [
    target.audioTargetId,
    target,
  ]));
  const suppliedAudioTargetIds = new Set();
  const reviewedAudioTargetIds = new Set();
  const assetHashes = new Set();
  for (const [index, entry] of evidence.audioRecords.entries()) {
    const audioTargetId = entry?.record?.audioTargetId;
    const requirement = requirements.get(audioTargetId);
    const packetTarget = packetAudio.get(audioTargetId);
    if (!requirement || !packetTarget) {
      validationErrors.push(`audio evidence ${index} is outside the unit handoff`);
      continue;
    }
    if (suppliedAudioTargetIds.has(audioTargetId)) {
      validationErrors.push(`audio evidence duplicates ${audioTargetId}`);
      continue;
    }
    suppliedAudioTargetIds.add(audioTargetId);
    const errors = await validateAudioRecord({
      entry,
      requirement,
      expectedFileName: packetTarget.expectedFileName,
      evidenceMode: evidence.evidenceMode,
      nowEpochMs,
    });
    if (errors.length > 0) {
      validationErrors.push(...errors);
      continue;
    }
    if (assetHashes.has(entry.record.asset.sha256)) {
      validationErrors.push(
        `${audioTargetId} reuses another target's audio bytes`,
      );
      continue;
    }
    assetHashes.add(entry.record.asset.sha256);
    reviewedAudioTargetIds.add(audioTargetId);
  }
  const missingReviewSlotKeys = [...expectedSlots.keys()].filter(
    (key) => !approvedReviewSlotKeys.has(key),
  );
  const missingAudioTargetIds = [...requirements.keys()].filter(
    (audioTargetId) => !reviewedAudioTargetIds.has(audioTargetId),
  );
  const evidenceValid = validationErrors.length === 0;
  const evidenceComplete =
    evidenceValid
    && missingReviewSlotKeys.length === 0
    && missingAudioTargetIds.length === 0;
  const fixtureOnly = evidence.evidenceMode === "test-fixture";
  const readyForPackage = evidenceComplete && !fixtureOnly;
  const blockers = [];
  if (!evidenceValid) blockers.push("EVIDENCE_VALIDATION_FAILED");
  if (missingReviewSlotKeys.length > 0) {
    blockers.push("ATTRIBUTABLE_REVIEW_RECEIPTS_MISSING");
  }
  if (missingAudioTargetIds.length > 0) {
    blockers.push("REVIEWED_AUDIO_OR_RIGHTS_EVIDENCE_MISSING");
  }
  if (fixtureOnly) blockers.push("TEST_FIXTURE_NOT_AUTHORITY");
  return {
    evidenceMode: evidence.evidenceMode,
    evidenceValid,
    evidenceComplete,
    fixtureOnly,
    readyForPackage,
    importAuthorized: false,
    validationErrors,
    blockers,
    review: {
      requiredSlots: expectedSlots.size,
      suppliedSlots: suppliedReviewSlotKeys.size,
      approvedSlots: approvedReviewSlotKeys.size,
      missingSlotKeys: missingReviewSlotKeys,
    },
    audio: {
      requiredTargets: requirements.size,
      suppliedTargets: suppliedAudioTargetIds.size,
      reviewedTargets: reviewedAudioTargetIds.size,
      missingTargetIds: missingAudioTargetIds,
    },
  };
};

const makeFixtureWave = (seed) => {
  const sampleRateHz = 16_000;
  const frameCount = sampleRateHz / 4;
  const dataByteLength = frameCount * 2;
  const bytes = new Uint8Array(44 + dataByteLength);
  const view = new DataView(bytes.buffer);
  const writeFourCc = (offset, value) => {
    for (let index = 0; index < 4; index += 1) {
      bytes[offset + index] = value.charCodeAt(index);
    }
  };
  writeFourCc(0, "RIFF");
  view.setUint32(4, bytes.byteLength - 8, true);
  writeFourCc(8, "WAVE");
  writeFourCc(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRateHz, true);
  view.setUint32(28, sampleRateHz * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeFourCc(36, "data");
  view.setUint32(40, dataByteLength, true);
  view.setInt16(44, seed + 1, true);
  return bytes;
};

export const buildHsk1UnitEvidenceTestFixture = async (
  source = loadHsk1UnitEvidenceIntakeSources(),
) => {
  await assertValidHsk1UnitPromotionHandoffBundle(source.handoffBundle);
  await assertValidHsk1UnitReviewerPacketBundle(source.packetBundle);
  const handoff = source.handoffBundle.handoff;
  const packet = source.packetBundle.packet;
  /** @type {Hsk1UnitEvidence} */
  const evidence = {
    schemaVersion: 1,
    evidenceMode: "test-fixture",
    reviewDocuments: [],
    audioRecords: [],
  };
  for (const [index, slot] of handoff.requiredReviewReceipts.entries()) {
    const assignmentId = `hsk1-unit-fixture-review-${index + 1}`;
    const document = await buildHsk1ReviewAssignmentDocument({
      root: source.root,
      assignmentId,
      batchId: slot.batchId,
      role: slot.role,
      assignedBy: "fixture-owner",
      assignee: `fixture-reviewer-${index + 1}`,
      assignedAt: FIXTURE_ASSIGNED_AT,
      nowEpochMs: FIXTURE_NOW,
    });
    document.response.reviewedAt = FIXTURE_REVIEWED_AT;
    document.response.outcome = "approved";
    for (const decision of document.response.targetDecisions) {
      decision.decision = "approved";
    }
    const result = await validateCompletedHsk1ReviewDocument(document, {
      root: source.root,
      nowEpochMs: FIXTURE_NOW,
    });
    if (!result.valid || !result.receipt) {
      throw new Error(`Unable to build review fixture ${assignmentId}`);
    }
    evidence.reviewDocuments.push({ document, receipt: result.receipt });
  }
  for (const [index, requirement] of
    handoff.targetBundle.audioRequirements.entries()) {
    const packetTarget = packet.audioRecordingManifest.find(
      (target) => target.audioTargetId === requirement.audioTargetId,
    );
    if (!packetTarget) throw new Error("Fixture audio target is missing");
    const assetBytes = makeFixtureWave(index);
    const speakerConsentBytes = new TextEncoder().encode(
      `fixture speaker consent ${index}`,
    );
    const rightsEvidenceBytes = new TextEncoder().encode(
      `fixture rights evidence ${index}`,
    );
    const assetSha256 = sha256Bytes(assetBytes);
    const speakerConsentSha256 = sha256Bytes(speakerConsentBytes);
    const rightsEvidenceSha256 = sha256Bytes(rightsEvidenceBytes);
    const nativeReviewCore = {
      schemaVersion: 1,
      receiptKind: "native-mandarin-audio-review",
      audioTargetId: requirement.audioTargetId,
      sourceTargetSha256: requirement.sourceTargetSha256,
      assetSha256,
      reviewerId: "fixture-native-reviewer",
      reviewedAt: FIXTURE_REVIEWED_AT,
      outcome: "approved",
      evidenceClass: "test-fixture",
    };
    const rightsReviewCore = {
      schemaVersion: 1,
      receiptKind: "audio-rights-review",
      audioTargetId: requirement.audioTargetId,
      assetSha256,
      speakerConsentSha256,
      rightsEvidenceSha256,
      reviewerId: "fixture-rights-reviewer",
      reviewedAt: FIXTURE_REVIEWED_AT,
      outcome: "approved",
      evidenceClass: "test-fixture",
    };
    const core = {
      schemaVersion: 1,
      recordId: `hsk1-unit-fixture-audio-${index + 1}`,
      audioTargetId: requirement.audioTargetId,
      sourceTargetSha256: requirement.sourceTargetSha256,
      evidenceClass: "test-fixture",
      asset: {
        relativePath: `audio/assets/${packetTarget.expectedFileName}`,
        sha256: assetSha256,
        media: inspectCanonicalWave(assetBytes),
      },
      speaker: {
        speakerId: "fixture-speaker",
        languageTag: "cmn-Hans",
        recordedAt: FIXTURE_RECORDED_AT,
      },
      speakerConsent: {
        relativePath: `audio/evidence/speaker-consent-${index + 1}.txt`,
        sha256: speakerConsentSha256,
      },
      rights: {
        relativePath: `audio/evidence/rights-grant-${index + 1}.txt`,
        sha256: rightsEvidenceSha256,
      },
      nativeReview: {
        ...nativeReviewCore,
        receiptSha256: await sha256Json(nativeReviewCore),
      },
      audioRightsReview: {
        ...rightsReviewCore,
        receiptSha256: await sha256Json(rightsReviewCore),
      },
    };
    evidence.audioRecords.push({
      record: {
        ...core,
        recordSha256: await sha256Json(core),
      },
      assetBytes,
      speakerConsentBytes,
      rightsEvidenceBytes,
    });
  }
  return evidence;
};

const readBoundedRegularFile = (path, maxBytes) => {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maxBytes) {
    throw new Error(`Unsafe or oversized local evidence file: ${path}`);
  }
  return new Uint8Array(readFileSync(path));
};
const readJsonDirectory = (directory) => {
  if (!existsSync(directory)) return [];
  const entries = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .sort((left, right) => left.name.localeCompare(right.name));
  if (entries.length > MAX_LOCAL_FILES) {
    throw new Error(`Too many local evidence files in ${directory}`);
  }
  return entries.map((entry) => {
    if (!SAFE_LOCAL_FILE_PATTERN.test(entry.name)) {
      throw new Error(`Unsafe local evidence filename: ${entry.name}`);
    }
    const path = resolve(directory, entry.name);
    const bytes = readBoundedRegularFile(path, MAX_LOCAL_JSON_BYTES);
    return {
      path,
      value: JSON.parse(new TextDecoder().decode(bytes)),
    };
  });
};
const resolveLocalEvidenceFile = (localRoot, relativePath) => {
  if (
    typeof relativePath !== "string"
    || !AUDIO_RELATIVE_PATH_PATTERN.test(relativePath)
  ) {
    throw new Error(`Unsafe local evidence path: ${relativePath}`);
  }
  const resolvedRoot = realpathSync(localRoot);
  const path = resolve(localRoot, relativePath);
  const resolvedPath = realpathSync(path);
  if (
    resolvedPath === resolvedRoot
    || !resolvedPath.startsWith(`${resolvedRoot}${sep}`)
  ) {
    throw new Error(`Local evidence path escapes its root: ${relativePath}`);
  }
  return path;
};

export const loadLocalHsk1UnitEvidence = (root = process.cwd()) => {
  const source = loadHsk1UnitEvidenceIntakeSources(root);
  const requiredSlotKeys = new Set(
    source.handoffBundle.handoff.requiredReviewReceipts.map(
      (slot) => slotKey(slot.batchId, slot.role),
    ),
  );
  const receiptDirectory = resolve(root, REVIEW_RECEIPTS_RELATIVE_PATH);
  const receiptsById = new Map(readJsonDirectory(receiptDirectory).map(
    ({ value }) => [value?.receiptId, value],
  ));
  const reviewDocuments = [];
  for (const { value: document } of readJsonDirectory(
    resolve(root, REVIEW_ASSIGNMENTS_RELATIVE_PATH),
  )) {
    const key = slotKey(
      document?.assignment?.batchId,
      document?.assignment?.role,
    );
    if (!requiredSlotKeys.has(key)) continue;
    const receipt = receiptsById.get(
      `${document.assignment.assignmentId}.receipt`,
    );
    if (receipt) reviewDocuments.push({ document, receipt });
  }
  const localRoot = resolve(root, HSK1_UNIT_LOCAL_EVIDENCE_RELATIVE_PATH);
  const audioRecords = [];
  const recordsDirectory = resolve(localRoot, "records");
  if (existsSync(recordsDirectory)) {
    for (const { value: record } of readJsonDirectory(recordsDirectory)) {
      audioRecords.push({
        record,
        assetBytes: readBoundedRegularFile(
          resolveLocalEvidenceFile(localRoot, record?.asset?.relativePath),
          MAX_LOCAL_EVIDENCE_BYTES,
        ),
        speakerConsentBytes: readBoundedRegularFile(
          resolveLocalEvidenceFile(
            localRoot,
            record?.speakerConsent?.relativePath,
          ),
          MAX_LOCAL_EVIDENCE_BYTES,
        ),
        rightsEvidenceBytes: readBoundedRegularFile(
          resolveLocalEvidenceFile(localRoot, record?.rights?.relativePath),
          MAX_LOCAL_EVIDENCE_BYTES,
        ),
      });
    }
  }
  return {
    source,
    evidence: {
      schemaVersion: 1,
      evidenceMode: "repository-real",
      reviewDocuments,
      audioRecords,
    },
  };
};

export const projectCheckedHsk1UnitEvidenceReadiness = async (
  source = loadHsk1UnitEvidenceIntakeSources(),
) => {
  const result = await evaluateHsk1UnitEvidenceIntake({
    source,
    evidence: EMPTY_EVIDENCE,
  });
  return {
    schemaVersion: 1,
    reportId: HSK1_UNIT_EVIDENCE_READINESS_ID,
    state: "blocked-awaiting-real-review-and-audio-evidence",
    policy: POLICY,
    sourceBindings: [
      sourceBinding(
        source.root,
        "atomicUnitHandoff",
        HSK1_UNIT_PROMOTION_HANDOFF_RELATIVE_PATH,
      ),
      sourceBinding(
        source.root,
        "reviewerPacket",
        HSK1_UNIT_REVIEWER_PACKET_RELATIVE_PATH,
      ),
    ],
    result,
    claims: {
      humanReviewComplete: false,
      reviewedAudioComplete: false,
      readyForPackage: false,
      runtimePackagePresent: false,
      unitReleaseAuthorized: false,
      importAuthorized: false,
      runtimeMutated: false,
      learnerContentExposed: false,
      completionGranted: false,
      masteryGranted: false,
    },
  };
};

export const validateHsk1UnitEvidenceReadinessBundle = async ({
  source,
  report,
}) => {
  const errors = [];
  let expected;
  try {
    expected = await projectCheckedHsk1UnitEvidenceReadiness(source);
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)],
      summary: null,
    };
  }
  if (
    !isRecord(report)
    || report.schemaVersion !== 1
    || report.reportId !== HSK1_UNIT_EVIDENCE_READINESS_ID
    || report.state !== "blocked-awaiting-real-review-and-audio-evidence"
    || !isRecord(report.policy)
    || !Array.isArray(report.sourceBindings)
    || !isRecord(report.result)
    || !isRecord(report.claims)
  ) {
    errors.push("HSK1 unit evidence readiness report shape is invalid");
  }
  if (
    Object.entries(POLICY).some(
      ([key, value]) => report?.policy?.[key] !== value,
    )
    || Object.values(report?.claims ?? {}).some((value) => value !== false)
    || report?.result?.readyForPackage !== false
    || report?.result?.importAuthorized !== false
  ) {
    errors.push("HSK1 unit evidence readiness report is not fail-closed");
  }
  if (!exact(report, expected)) {
    errors.push("HSK1 unit evidence readiness report does not match sources");
  }
  return {
    valid: errors.length === 0,
    errors,
    summary: {
      requiredReviewSlots: expected.result.review.requiredSlots,
      approvedReviewSlots: expected.result.review.approvedSlots,
      requiredAudioTargets: expected.result.audio.requiredTargets,
      reviewedAudioTargets: expected.result.audio.reviewedTargets,
      evidenceValid: expected.result.evidenceValid,
      evidenceComplete: expected.result.evidenceComplete,
      readyForPackage: expected.result.readyForPackage,
      importAuthorized: expected.result.importAuthorized,
    },
  };
};

export const assertValidHsk1UnitEvidenceReadinessBundle = async (bundle) => {
  const result = await validateHsk1UnitEvidenceReadinessBundle(bundle);
  if (!result.valid) {
    throw new Error(
      `Invalid HSK1 unit evidence readiness report:\n- ${
        result.errors.join("\n- ")
      }`,
    );
  }
  return result;
};

export const loadHsk1UnitEvidenceReadinessBundle = (
  root = process.cwd(),
) => ({
  source: loadHsk1UnitEvidenceIntakeSources(root),
  reportPath: resolve(root, HSK1_UNIT_EVIDENCE_READINESS_RELATIVE_PATH),
  report: JSON.parse(readFileSync(
    resolve(root, HSK1_UNIT_EVIDENCE_READINESS_RELATIVE_PATH),
    "utf8",
  )),
});

export const repositoryRelativeEvidencePath = (root, path) =>
  relative(root, path).replaceAll("\\", "/");
