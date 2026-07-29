import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sha256Json } from "./governance.mjs";
import {
  assertValidHsk3ReviewManifestBundle,
  loadHsk3ReviewManifestBundle,
} from "./hsk3ReviewManifest.mjs";
import { fileSha256 } from "./hskSyllabusInventory.mjs";

const SAFE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u;
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const OUTCOMES = new Set(["approved", "changes-requested", "rejected"]);
const TARGET_KEYS = [
  "lessonIds",
  "vocabularyIds",
  "textIds",
  "grammarRowIds",
  "narrationIds",
  "practiceItemIds",
  "promptIds",
  "assessmentItemIds",
];
const ASSIGNMENT_KEYS = [
  "schemaVersion",
  "assignmentId",
  "manifestId",
  "manifestSha256",
  "sourceKind",
  "sourceId",
  "sourceSha256",
  "batchId",
  "role",
  "targetDigest",
  "targets",
  "assignedBy",
  "assignee",
  "assignedAt",
  "policy",
];
const DOCUMENT_KEYS = [
  "schemaVersion",
  "assignmentSha256",
  "assignment",
  "response",
];
const RESPONSE_KEYS = [
  "schemaVersion",
  "assignmentSha256",
  "reviewerId",
  "role",
  "reviewedAt",
  "outcome",
  "targetDecisions",
  "batchNote",
  "evidenceRefs",
];
const POLICY = {
  operatorIdentitiesAreDeclaredLocalMetadata: true,
  reviewDoesNotPublish: true,
  reviewDoesNotCalibrate: true,
  reviewDoesNotGrantMastery: true,
  importWritesLocalReceiptOnly: true,
};
const workflowContextCache = new Map();

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value, keys) =>
  isRecord(value)
  && Object.keys(value).length === keys.length
  && keys.every((key) => Object.hasOwn(value, key));
const uniqueSortedStrings = (values) =>
  [...new Set((Array.isArray(values) ? values : []).filter(
    (value) => typeof value === "string" && value.length > 0,
  ))].sort();
const canonicalTimestamp = (value) =>
  typeof value === "string"
  && !Number.isNaN(Date.parse(value))
  && new Date(Date.parse(value)).toISOString() === value;
const validNote = (value) =>
  value === null
  || (typeof value === "string" && value.length > 0 && value.length <= 2_000);

export const assertSafeHsk3ReviewId = (value, label) => {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > 128
    || !SAFE_ID_PATTERN.test(value)
  ) {
    throw new Error(
      `${label} must be a safe identifier of at most 128 characters`,
    );
  }
};

const sourceArtifact = (root, source) => {
  const path = join(root, source.relativePath);
  if (fileSha256(path) !== source.sha256) {
    throw new Error(`${source.sourceId} bytes do not match the review manifest`);
  }
  return {
    path,
    artifact: JSON.parse(readFileSync(path, "utf8")),
  };
};

const cachedContextIsCurrent = (context) =>
  fileSha256(context.manifestPath) === context.manifestSha256
  && context.manifest.sources.every((source) =>
    fileSha256(join(context.root, source.relativePath)) === source.sha256
  );

const loadWorkflowContext = (root) => {
  const cached = workflowContextCache.get(root);
  if (cached && cachedContextIsCurrent(cached)) return cached;
  const manifestBundle = loadHsk3ReviewManifestBundle(root);
  assertValidHsk3ReviewManifestBundle(manifestBundle);
  const sources = new Map(manifestBundle.manifest.sources.map((source) => [
    `${source.sourceKind}:${source.sourceId}`,
    {
      source,
      loaded: sourceArtifact(root, source),
    },
  ]));
  const context = {
    root,
    manifest: manifestBundle.manifest,
    manifestPath: manifestBundle.manifestPath,
    manifestSha256: fileSha256(manifestBundle.manifestPath),
    sources,
  };
  workflowContextCache.set(root, context);
  return context;
};

const normalizedTargets = (batch) => ({
  lessonIds: uniqueSortedStrings(batch.targetLessonIds),
  vocabularyIds: uniqueSortedStrings(batch.lexemeIds),
  textIds: uniqueSortedStrings(batch.textIds),
  grammarRowIds: uniqueSortedStrings(batch.grammarRowIds),
  narrationIds: uniqueSortedStrings(batch.narrationIds),
  practiceItemIds: uniqueSortedStrings(batch.practiceItemIds),
  promptIds: uniqueSortedStrings(batch.promptItemIds),
  assessmentItemIds: uniqueSortedStrings(batch.itemIds),
});

const flattenedTargets = (targets) => TARGET_KEYS.flatMap((targetType) =>
  targets[targetType].map((targetId) => ({ targetType, targetId }))
);

const resolveBatchFromContext = async (workflowContext, batchId) => {
  const manifestBatch = workflowContext.manifest.reviewBatches.find(
    (candidate) => candidate.batchId === batchId,
  );
  if (!manifestBatch) throw new Error(`Unknown HSK3 review batch: ${batchId}`);
  const sourceContext = workflowContext.sources.get(
    `${manifestBatch.sourceKind}:${manifestBatch.sourceId}`,
  );
  if (!sourceContext) throw new Error(`${batchId} manifest source is missing`);
  const { source, loaded } = sourceContext;
  const batch = loaded.artifact.reviewBatches?.find(
    (candidate) => candidate.batchId === batchId,
  );
  if (!batch) throw new Error(`${batchId} source batch is missing`);
  if (
    batch.state !== "pending"
    || !Array.isArray(batch.approvals)
    || batch.approvals.length !== 0
    || JSON.stringify(uniqueSortedStrings(batch.requiredRoles))
      !== JSON.stringify(uniqueSortedStrings(manifestBatch.requiredRoles))
  ) {
    throw new Error(`${batchId} source review state has drifted`);
  }
  const targets = normalizedTargets(batch);
  const flatTargets = flattenedTargets(targets);
  if (flatTargets.length === 0) {
    throw new Error(`${batchId} has no exact review targets`);
  }
  return {
    manifest: workflowContext.manifest,
    manifestPath: workflowContext.manifestPath,
    manifestBatch,
    source,
    targets,
    flatTargets,
    targetDigest: await sha256Json(targets),
  };
};

export const resolveHsk3ReviewBatch = async (
  root = process.cwd(),
  batchId,
) => resolveBatchFromContext(loadWorkflowContext(root), batchId);

export const buildHsk3ReviewAssignmentDocument = async ({
  root = process.cwd(),
  assignmentId,
  batchId,
  role,
  assignedBy,
  assignee,
  assignedAt,
  nowEpochMs = Date.now(),
}) => {
  assertSafeHsk3ReviewId(assignmentId, "assignmentId");
  assertSafeHsk3ReviewId(assignedBy, "assignedBy");
  assertSafeHsk3ReviewId(assignee, "assignee");
  if (
    !canonicalTimestamp(assignedAt)
    || Date.parse(assignedAt) > nowEpochMs
  ) {
    throw new Error("assignedAt must be canonical UTC and not in the future");
  }
  const context = await resolveHsk3ReviewBatch(root, batchId);
  if (!context.manifestBatch.requiredRoles.includes(role)) {
    throw new Error(`${role} is not required for ${batchId}`);
  }
  const assignment = {
    schemaVersion: 1,
    assignmentId,
    manifestId: context.manifest.manifestId,
    manifestSha256: fileSha256(context.manifestPath),
    sourceKind: context.source.sourceKind,
    sourceId: context.source.sourceId,
    sourceSha256: context.source.sha256,
    batchId,
    role,
    targetDigest: context.targetDigest,
    targets: context.targets,
    assignedBy,
    assignee,
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
      reviewerId: assignee,
      role,
      reviewedAt: null,
      outcome: null,
      targetDecisions: context.flatTargets.map((target) => ({
        ...target,
        decision: null,
        note: null,
      })),
      batchNote: null,
      evidenceRefs: [],
    },
  };
};

const derivedOutcome = (decisions) => {
  if (decisions.includes("rejected")) return "rejected";
  if (decisions.includes("changes-requested")) return "changes-requested";
  return decisions.every((decision) => decision === "approved")
    ? "approved"
    : null;
};

export const validateCompletedHsk3ReviewDocument = async (
  document,
  {
    root = process.cwd(),
    nowEpochMs = Date.now(),
  } = {},
) => {
  const errors = [];
  if (!exactKeys(document, DOCUMENT_KEYS) || document.schemaVersion !== 1) {
    return {
      valid: false,
      errors: ["review document root schema is invalid"],
      receipt: null,
    };
  }
  const assignment = document.assignment;
  if (
    !exactKeys(assignment, ASSIGNMENT_KEYS)
    || assignment.schemaVersion !== 1
    || !exactKeys(assignment.targets, TARGET_KEYS)
    || !exactKeys(assignment.policy, Object.keys(POLICY))
    || Object.entries(POLICY).some(
      ([key, value]) => assignment.policy[key] !== value,
    )
  ) {
    errors.push("review assignment schema or policy is invalid");
  }
  for (const [value, label] of [
    [assignment?.assignmentId, "assignmentId"],
    [assignment?.assignedBy, "assignedBy"],
    [assignment?.assignee, "assignee"],
  ]) {
    try {
      assertSafeHsk3ReviewId(value, label);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  if (
    !canonicalTimestamp(assignment?.assignedAt)
    || Date.parse(assignment.assignedAt) > nowEpochMs
  ) {
    errors.push("assignment assignedAt is invalid");
  }
  let context = null;
  try {
    context = await resolveHsk3ReviewBatch(root, assignment?.batchId);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  if (context) {
    if (
      assignment.manifestId !== context.manifest.manifestId
      || assignment.manifestSha256 !== fileSha256(context.manifestPath)
      || assignment.sourceKind !== context.source.sourceKind
      || assignment.sourceId !== context.source.sourceId
      || assignment.sourceSha256 !== context.source.sha256
      || assignment.targetDigest !== context.targetDigest
      || TARGET_KEYS.some(
        (key) =>
          JSON.stringify(assignment.targets[key])
          !== JSON.stringify(context.targets[key]),
      )
      || !context.manifestBatch.requiredRoles.includes(assignment.role)
    ) {
      errors.push("review assignment no longer matches the exact manifest batch");
    }
  }
  const computedAssignmentSha256 = isRecord(assignment)
    ? await sha256Json(assignment)
    : null;
  if (
    !DIGEST_PATTERN.test(document.assignmentSha256 ?? "")
    || document.assignmentSha256 !== computedAssignmentSha256
  ) {
    errors.push("assignmentSha256 does not match the assignment");
  }

  const response = document.response;
  if (
    !exactKeys(response, RESPONSE_KEYS)
    || response.schemaVersion !== 1
  ) {
    errors.push("review response schema is invalid");
  } else {
    if (
      response.assignmentSha256 !== document.assignmentSha256
      || response.reviewerId !== assignment.assignee
      || response.role !== assignment.role
    ) {
      errors.push("review response identity does not match the assignment");
    }
    if (
      !canonicalTimestamp(response.reviewedAt)
      || Date.parse(response.reviewedAt) < Date.parse(assignment.assignedAt)
      || Date.parse(response.reviewedAt) > nowEpochMs
    ) {
      errors.push("reviewedAt must be canonical, ordered and not in the future");
    }
    if (!OUTCOMES.has(response.outcome)) {
      errors.push("review response outcome is invalid");
    }
    if (!validNote(response.batchNote)) {
      errors.push("review response batchNote is invalid");
    }
    if (
      !Array.isArray(response.evidenceRefs)
      || response.evidenceRefs.length > 50
      || response.evidenceRefs.some(
        (value) =>
          typeof value !== "string"
          || value.length === 0
          || value.length > 500,
      )
    ) {
      errors.push("review response evidenceRefs are invalid");
    }
    const decisions = Array.isArray(response.targetDecisions)
      ? response.targetDecisions
      : [];
    const expectedTargets = context?.flatTargets ?? [];
    if (
      decisions.length !== expectedTargets.length
      || decisions.some((decision, index) =>
        !exactKeys(
          decision,
          ["targetType", "targetId", "decision", "note"],
        )
        || decision.targetType !== expectedTargets[index]?.targetType
        || decision.targetId !== expectedTargets[index]?.targetId
        || !OUTCOMES.has(decision.decision)
        || !validNote(decision.note)
      )
    ) {
      errors.push("review response must decide every exact target once");
    } else if (
      derivedOutcome(decisions.map((decision) => decision.decision))
        !== response.outcome
    ) {
      errors.push("review response outcome does not match target decisions");
    }
    if (
      assignment.role === "audio-rights-reviewer"
      && response.outcome === "approved"
    ) {
      errors.push(
        "audio-rights review cannot approve while HSK3 audio is absent",
      );
    }
  }
  if (errors.length > 0 || !context) {
    return { valid: false, errors, receipt: null };
  }
  const receiptCore = {
    schemaVersion: 1,
    receiptId: `${assignment.assignmentId}.receipt`,
    assignmentSha256: document.assignmentSha256,
    manifestId: assignment.manifestId,
    manifestSha256: assignment.manifestSha256,
    sourceId: assignment.sourceId,
    sourceSha256: assignment.sourceSha256,
    batchId: assignment.batchId,
    role: assignment.role,
    reviewerId: response.reviewerId,
    reviewedAt: response.reviewedAt,
    outcome: response.outcome,
    targetDigest: assignment.targetDigest,
    responseSha256: await sha256Json(response),
    policy: POLICY,
  };
  return {
    valid: true,
    errors: [],
    receipt: {
      ...receiptCore,
      receiptSha256: await sha256Json(receiptCore),
    },
  };
};

export const validateHsk3ReviewWorkflow = async (root = process.cwd()) => {
  const workflowContext = loadWorkflowContext(root);
  let roleAssignments = 0;
  let exactTargets = 0;
  for (const batch of workflowContext.manifest.reviewBatches) {
    const context = await resolveBatchFromContext(
      workflowContext,
      batch.batchId,
    );
    roleAssignments += batch.requiredRoles.length;
    exactTargets += context.flatTargets.length;
  }
  return {
    manifestId: workflowContext.manifest.manifestId,
    manifestSha256: workflowContext.manifestSha256,
    batches: workflowContext.manifest.reviewBatches.length,
    roleAssignments,
    exactTargets,
    approvalsImportedIntoManifest: 0,
    runtimeMutations: 0,
  };
};
