import {
  parseAbandonAssessmentSessionCommand,
  type AbandonAssessmentSessionCommandV1,
  type AbandonAssessmentSessionReceiptV1,
} from "../assessment/assessmentAbandonmentProtocol";
import {
  parseRecordAssessmentAttemptCommand,
  type RecordAssessmentAttemptCommandV1,
  type RecordAssessmentAttemptReceiptV1,
} from "../assessment/assessmentAttemptProtocol";
import {
  hashAssessmentForm,
  isExactAssessmentFormV1,
  MAX_ASSESSMENT_FORM_ITEMS,
  parseOpenAssessmentSessionCommand,
  type AssessmentSessionAuthorityBindingV1,
  type OpenAssessmentSessionCommandV1,
  type OpenAssessmentSessionReceiptV1,
} from "../assessment/assessmentSessionProtocol";
import {
  parseSubmitAssessmentSessionCommand,
  type SubmitAssessmentSessionCommandV1,
  type SubmitAssessmentSessionReceiptV1,
} from "../assessment/assessmentSubmissionProtocol";
import { deriveStableNormalizedAssessmentCommandIds } from "../assessment/normalizedAssessmentCommands";
import {
  parseLearningAttemptCommand,
  type LearningAttemptCommandV1,
  type LearningAttemptReceiptV1,
} from "../learning/attemptProtocol";
import {
  CURRENT_CONTENT_MANIFEST_SHA256,
  CURRENT_CONTENT_VERSION as CONTENT_VERSION,
} from "../content/currentContentIdentity";
import {
  parseAbandonLessonSessionCommand,
  type AbandonLessonSessionCommandV1,
  type AbandonLessonSessionReceiptV1,
} from "../learning/lessonSessionAbandonmentProtocol";
import {
  hashLessonSessionForm,
  parseOpenLessonSessionCommand,
  type LessonSessionAuthorityBindingV1,
  type OpenLessonSessionCommandV1,
  type OpenLessonSessionReceiptV1,
} from "../learning/lessonSessionProtocol";
import type {
  ActiveAssessmentAttemptProjectionV2,
  ActiveLessonAttemptProjectionV1,
  ActiveReaderAttemptProjectionV3,
} from "../learning/projectionProtocol";
import { deriveStableNormalizedLessonCommandIds } from "../learning/normalizedLessonCommands";
import {
  parseSubmitLessonSessionCommand,
  type SubmitLessonSessionCommandV1,
  type SubmitLessonSessionReceiptV1,
} from "../learning/lessonSessionSubmissionProtocol";
import {
  parseGradeReviewCommand,
  type GradeReviewCommandV1,
  type GradeReviewReceiptV1,
} from "../learning/reviewProtocol";
import {
  deriveStableNormalizedReaderCommandIds,
} from "../learning/normalizedReaderSessionCommands";
import {
  parseAbandonReaderSessionCommand,
  type AbandonReaderSessionCommandV1,
  type AbandonReaderSessionReceiptV1,
} from "../reader/readerAbandonmentProtocol";
import {
  parseRecordReaderAttemptCommand,
  type RecordReaderAttemptCommandV1,
  type RecordReaderAttemptReceiptV1,
} from "../reader/readerAttemptProtocol";
import {
  hashReaderSessionForm,
  isExactReaderSessionFormV1,
  parseOpenReaderSessionCommand,
  type OpenReaderSessionCommandV1,
  type OpenReaderSessionReceiptV1,
  type ReaderSessionAuthorityBindingV1,
} from "../reader/readerSessionProtocol";
import {
  parseSubmitReaderSessionCommand,
  type SubmitReaderSessionCommandV1,
  type SubmitReaderSessionReceiptV1,
} from "../reader/readerSubmissionProtocol";
import { MAX_READER_FORM_ITEMS } from "../reader/protocolSupport";
import { canonicalStringify, sha256Hex } from "./canonicalHash";
import {
  ACTIVE_OWNER_GENERATION_KEY,
  allocateDeviceSequence,
  LEARNING_COMMAND_OUTBOX_STORE,
  LEARNING_COMMAND_OWNER_INDEX,
  LEARNING_COMMAND_SESSION_ALIAS_INDEX,
  openSyncDatabase,
  StaleOwnerGenerationError,
  SYNC_DOCUMENT_STORE,
  SYNC_META_STORE,
  type OwnerGeneration,
} from "./indexedDb";
import {
  LEARNING_COMMAND_QUEUE_CHANGED_EVENT,
} from "./learningCommandQueueEvent";

export const LEARNING_COMMAND_OUTBOX_VERSION = 1 as const;
export const LEARNING_COMMAND_LEASE_MS = 30_000;
export const LEARNING_COMMAND_RETRY_BASE_MS = 1_000;
export const LEARNING_COMMAND_RETRY_MAX_MS = 5 * 60_000;
export { LEARNING_COMMAND_QUEUE_CHANGED_EVENT };

export type LearningCommandStatus =
  | "pending"
  | "acknowledged"
  | "quarantined";

export type ObjectiveAttemptQueueCommandV1 = Omit<
  LearningAttemptCommandV1,
  "deviceSequence" | "sessionId" | "resetEpoch"
>;

export type ReviewGradeQueueCommandV1 = Omit<
  GradeReviewCommandV1,
  "deviceSequence" | "resetEpoch"
>;

export type LessonSessionSubmissionQueueCommandV1 = Omit<
  SubmitLessonSessionCommandV1,
  "deviceSequence" | "sessionId" | "formHash" | "resetEpoch"
>;

export type LessonSessionAbandonmentQueueCommandV1 = Omit<
  AbandonLessonSessionCommandV1,
  "deviceSequence" | "sessionId" | "resetEpoch"
>;

export type AssessmentAttemptQueueCommandV1 = Omit<
  RecordAssessmentAttemptCommandV1,
  "deviceSequence" | "resetEpoch" | "sessionId" | "formHash"
>;

export type AssessmentSessionSubmissionQueueCommandV1 = Omit<
  SubmitAssessmentSessionCommandV1,
  "deviceSequence" | "resetEpoch" | "sessionId" | "formHash"
>;

export type AssessmentSessionAbandonmentQueueCommandV1 = Omit<
  AbandonAssessmentSessionCommandV1,
  "deviceSequence" | "resetEpoch" | "sessionId" | "formHash"
>;

export type ReaderAttemptQueueCommandV1 = Omit<
  RecordReaderAttemptCommandV1,
  "deviceSequence" | "resetEpoch" | "sessionId" | "formHash"
>;

export type ReaderSessionOpenQueueCommandV1 = Omit<
  OpenReaderSessionCommandV1,
  "deviceSequence" | "resetEpoch"
>;

export type ReaderSessionSubmissionQueueCommandV1 = Omit<
  SubmitReaderSessionCommandV1,
  "deviceSequence" | "resetEpoch" | "sessionId" | "formHash"
>;

export type ReaderSessionAbandonmentQueueCommandV1 = Omit<
  AbandonReaderSessionCommandV1,
  "deviceSequence" | "resetEpoch" | "sessionId" | "formHash"
>;

type QueuedObjectiveAttemptCommandV1 = ObjectiveAttemptQueueCommandV1 & {
  deviceSequence: number;
  resetEpoch: number;
};

type QueuedReviewGradeCommandV1 = ReviewGradeQueueCommandV1 & {
  deviceSequence: number;
  resetEpoch: number;
};

type QueuedLessonSessionSubmissionCommandV1 =
  LessonSessionSubmissionQueueCommandV1 & {
    deviceSequence: number;
    resetEpoch: number;
  };

type QueuedLessonSessionAbandonmentCommandV1 =
  LessonSessionAbandonmentQueueCommandV1 & {
    deviceSequence: number;
    resetEpoch: number;
  };

type QueuedAssessmentAttemptCommandV1 = AssessmentAttemptQueueCommandV1 & {
  deviceSequence: number;
  resetEpoch: number;
};

type QueuedAssessmentSessionSubmissionCommandV1 =
  AssessmentSessionSubmissionQueueCommandV1 & {
    deviceSequence: number;
    resetEpoch: number;
  };

type QueuedAssessmentSessionAbandonmentCommandV1 =
  AssessmentSessionAbandonmentQueueCommandV1 & {
    deviceSequence: number;
    resetEpoch: number;
  };

type QueuedReaderAttemptCommandV1 = ReaderAttemptQueueCommandV1 & {
  deviceSequence: number;
  resetEpoch: number;
};

type QueuedReaderSessionSubmissionCommandV1 =
  ReaderSessionSubmissionQueueCommandV1 & {
    deviceSequence: number;
    resetEpoch: number;
  };

type QueuedReaderSessionAbandonmentCommandV1 =
  ReaderSessionAbandonmentQueueCommandV1 & {
    deviceSequence: number;
    resetEpoch: number;
  };

export type ProjectedLessonSessionAnchorCommandV1 = {
  schemaVersion: 1;
  adoptionKey: string;
  installationId: string;
  deviceId: string;
  resetEpoch: number;
  contentVersion: string;
  manifestSha256: string;
  projectionCursor: number;
};

export type ProjectedAssessmentSessionAnchorCommandV1 = {
  schemaVersion: 1;
  adoptionKey: string;
  installationId: string;
  deviceId: string;
  resetEpoch: number;
  contentVersion: string;
  manifestSha256: string;
  projectionCursor: number;
};

export type ProjectedReaderSessionAnchorCommandV1 = {
  schemaVersion: 1;
  adoptionKey: string;
  installationId: string;
  deviceId: string;
  resetEpoch: number;
  contentVersion: string;
  manifestSha256: string;
  projectionCursor: number;
};

type LearningCommandRecordBase = {
  outboxVersion: 1;
  recordKey: string;
  commandId: string;
  requestHash: string;
  ownerKey: string;
  deviceSequence: number;
  resetEpoch: number;
  enqueuedAt: string;
  status: LearningCommandStatus;
  attemptCount: number;
  lastAttemptAt: string | null;
  nextAttemptAt: string | null;
  leaseUntil: string | null;
  acknowledgedAt: string | null;
  quarantinedAt: string | null;
  quarantineReason: string | null;
};

export type QueuedLessonSessionCommand = LearningCommandRecordBase & {
  kind: "lesson-session-open";
  sessionAlias: string;
  /** Index-only field; dependent attempts deliberately omit it. */
  sessionAliasLookupKey: string;
  dependencyRecordKey: null;
  attemptDependencyRecordKeys?: never;
  command: OpenLessonSessionCommandV1;
  receipt: OpenLessonSessionReceiptV1 | null;
};

export type QueuedObjectiveAttemptCommand = LearningCommandRecordBase & {
  kind: "objective-attempt";
  sessionAlias: string | null;
  sessionAliasLookupKey?: never;
  dependencyRecordKey: string | null;
  attemptDependencyRecordKeys?: never;
  command: QueuedObjectiveAttemptCommandV1;
  receipt: LearningAttemptReceiptV1 | null;
};

export type QueuedReviewGradeCommand = LearningCommandRecordBase & {
  kind: "review-grade";
  sessionAlias: null;
  sessionAliasLookupKey?: never;
  dependencyRecordKey: null;
  attemptDependencyRecordKeys?: never;
  command: QueuedReviewGradeCommandV1;
  receipt: GradeReviewReceiptV1 | null;
};

export type QueuedLessonSessionSubmissionCommand = LearningCommandRecordBase & {
  kind: "lesson-session-submit";
  sessionAlias: string;
  sessionAliasLookupKey?: never;
  dependencyRecordKey: string;
  attemptDependencyRecordKeys: string[];
  command: QueuedLessonSessionSubmissionCommandV1;
  receipt: SubmitLessonSessionReceiptV1 | null;
};

export type QueuedLessonSessionAbandonmentCommand = LearningCommandRecordBase & {
  kind: "lesson-session-abandon";
  sessionAlias: string;
  sessionAliasLookupKey?: never;
  dependencyRecordKey: string;
  attemptDependencyRecordKeys?: never;
  command: QueuedLessonSessionAbandonmentCommandV1;
  receipt: AbandonLessonSessionReceiptV1 | null;
};

export type QueuedProjectedLessonSessionAnchor = LearningCommandRecordBase & {
  kind: "projected-lesson-session-anchor";
  sessionAlias: string;
  sessionAliasLookupKey: string;
  dependencyRecordKey: null;
  attemptDependencyRecordKeys?: never;
  status: "acknowledged";
  command: ProjectedLessonSessionAnchorCommandV1;
  binding: LessonSessionAuthorityBindingV1;
  projectedAttempts: ActiveLessonAttemptProjectionV1[];
  receipt: null;
};

export type QueuedAssessmentSessionCommand = LearningCommandRecordBase & {
  kind: "assessment-session-open";
  sessionAlias: string;
  sessionAliasLookupKey: string;
  dependencyRecordKey: null;
  attemptDependencyRecordKeys?: never;
  command: OpenAssessmentSessionCommandV1;
  receipt: OpenAssessmentSessionReceiptV1 | null;
};

export type QueuedProjectedAssessmentSessionAnchor =
  LearningCommandRecordBase & {
    kind: "projected-assessment-session-anchor";
    sessionAlias: string;
    sessionAliasLookupKey: string;
    dependencyRecordKey: null;
    attemptDependencyRecordKeys?: never;
    status: "acknowledged";
    command: ProjectedAssessmentSessionAnchorCommandV1;
    binding: AssessmentSessionAuthorityBindingV1;
    projectedAttempts: ActiveAssessmentAttemptProjectionV2[];
    receipt: null;
  };

export type QueuedAssessmentAttemptCommand = LearningCommandRecordBase & {
  kind: "assessment-attempt";
  sessionAlias: string;
  sessionAliasLookupKey?: never;
  dependencyRecordKey: string;
  attemptDependencyRecordKeys?: never;
  command: QueuedAssessmentAttemptCommandV1;
  receipt: RecordAssessmentAttemptReceiptV1 | null;
};

export type QueuedAssessmentSessionSubmissionCommand =
  LearningCommandRecordBase & {
    kind: "assessment-session-submit";
    sessionAlias: string;
    sessionAliasLookupKey?: never;
    dependencyRecordKey: string;
    attemptDependencyRecordKeys: string[];
    command: QueuedAssessmentSessionSubmissionCommandV1;
    receipt: SubmitAssessmentSessionReceiptV1 | null;
  };

export type QueuedAssessmentSessionAbandonmentCommand =
  LearningCommandRecordBase & {
    kind: "assessment-session-abandon";
    sessionAlias: string;
    sessionAliasLookupKey?: never;
    dependencyRecordKey: string;
    attemptDependencyRecordKeys?: never;
    command: QueuedAssessmentSessionAbandonmentCommandV1;
    receipt: AbandonAssessmentSessionReceiptV1 | null;
  };

export type QueuedReaderSessionCommand = LearningCommandRecordBase & {
  kind: "reader-session-open";
  sessionAlias: string;
  sessionAliasLookupKey: string;
  /** Optional acknowledged support-request abandonment from a prior session. */
  dependencyRecordKey: string | null;
  attemptDependencyRecordKeys?: never;
  command: OpenReaderSessionCommandV1;
  receipt: OpenReaderSessionReceiptV1 | null;
};

export type QueuedProjectedReaderSessionAnchor =
  LearningCommandRecordBase & {
    kind: "projected-reader-session-anchor";
    sessionAlias: string;
    sessionAliasLookupKey: string;
    dependencyRecordKey: null;
    attemptDependencyRecordKeys?: never;
    status: "acknowledged";
    command: ProjectedReaderSessionAnchorCommandV1;
    binding: ReaderSessionAuthorityBindingV1;
    projectedAttempts: ActiveReaderAttemptProjectionV3[];
    receipt: null;
  };

export type QueuedReaderAttemptCommand = LearningCommandRecordBase & {
  kind: "reader-attempt";
  sessionAlias: string;
  sessionAliasLookupKey?: never;
  dependencyRecordKey: string;
  attemptDependencyRecordKeys?: never;
  command: QueuedReaderAttemptCommandV1;
  receipt: RecordReaderAttemptReceiptV1 | null;
};

export type QueuedReaderSessionSubmissionCommand =
  LearningCommandRecordBase & {
    kind: "reader-session-submit";
    sessionAlias: string;
    sessionAliasLookupKey?: never;
    dependencyRecordKey: string;
    attemptDependencyRecordKeys: string[];
    command: QueuedReaderSessionSubmissionCommandV1;
    receipt: SubmitReaderSessionReceiptV1 | null;
  };

export type QueuedReaderSessionAbandonmentCommand =
  LearningCommandRecordBase & {
    kind: "reader-session-abandon";
    sessionAlias: string;
    sessionAliasLookupKey?: never;
    dependencyRecordKey: string;
    attemptDependencyRecordKeys?: never;
    command: QueuedReaderSessionAbandonmentCommandV1;
    receipt: AbandonReaderSessionReceiptV1 | null;
  };

export type QueuedLessonSessionDependency =
  | QueuedLessonSessionCommand
  | QueuedProjectedLessonSessionAnchor;

export type QueuedAssessmentSessionDependency =
  | QueuedAssessmentSessionCommand
  | QueuedProjectedAssessmentSessionAnchor;

export type QueuedReaderSessionDependency =
  | QueuedReaderSessionCommand
  | QueuedProjectedReaderSessionAnchor;

export type LearningCommandOutboxRecord =
  | QueuedLessonSessionCommand
  | QueuedObjectiveAttemptCommand
  | QueuedReviewGradeCommand
  | QueuedLessonSessionSubmissionCommand
  | QueuedLessonSessionAbandonmentCommand
  | QueuedProjectedLessonSessionAnchor
  | QueuedAssessmentSessionCommand
  | QueuedProjectedAssessmentSessionAnchor
  | QueuedAssessmentAttemptCommand
  | QueuedAssessmentSessionSubmissionCommand
  | QueuedAssessmentSessionAbandonmentCommand
  | QueuedReaderSessionCommand
  | QueuedProjectedReaderSessionAnchor
  | QueuedReaderAttemptCommand
  | QueuedReaderSessionSubmissionCommand
  | QueuedReaderSessionAbandonmentCommand;

export type LearningCommandQueueSummary = {
  /** Includes commands under an active delivery lease or retry backoff. */
  pendingCount: number;
  quarantinedCount: number;
};

export type EnqueueLessonSessionInput = {
  ownerGeneration: OwnerGeneration;
  expectedResetEpoch: number;
  sessionAlias: string;
  command: Omit<OpenLessonSessionCommandV1, "deviceSequence" | "resetEpoch">;
  enqueuedAt?: string;
};

export type EnqueueObjectiveAttemptInput = {
  ownerGeneration: OwnerGeneration;
  expectedResetEpoch: number;
  command: ObjectiveAttemptQueueCommandV1;
  /** Required for lesson attempts and forbidden for reader attempts. */
  sessionAlias?: string;
  enqueuedAt?: string;
};

export type EnqueueReviewGradeInput = {
  ownerGeneration: OwnerGeneration;
  expectedResetEpoch: number;
  command: ReviewGradeQueueCommandV1;
  enqueuedAt?: string;
};

export type EnqueueLessonSessionSubmissionInput = {
  ownerGeneration: OwnerGeneration;
  expectedResetEpoch: number;
  sessionAlias: string;
  /** Exact idempotency keys for every objective attempt in this session. */
  attemptCommandIds: string[];
  command: LessonSessionSubmissionQueueCommandV1;
  enqueuedAt?: string;
};

export type EnqueueLessonSessionAbandonmentInput = {
  ownerGeneration: OwnerGeneration;
  expectedResetEpoch: number;
  sessionAlias: string;
  /** Exact open-command idempotency key bound to this local session alias. */
  dependencyCommandId: string;
  command: LessonSessionAbandonmentQueueCommandV1;
  enqueuedAt?: string;
};

export type EnqueueAssessmentSessionInput = {
  ownerGeneration: OwnerGeneration;
  expectedResetEpoch: number;
  sessionAlias: string;
  command: Omit<
    OpenAssessmentSessionCommandV1,
    "deviceSequence" | "resetEpoch"
  >;
  enqueuedAt?: string;
};

export type EnqueueAssessmentAttemptInput = {
  ownerGeneration: OwnerGeneration;
  expectedResetEpoch: number;
  sessionAlias: string;
  command: AssessmentAttemptQueueCommandV1;
  enqueuedAt?: string;
};

export type EnqueueAssessmentSessionSubmissionInput = {
  ownerGeneration: OwnerGeneration;
  expectedResetEpoch: number;
  sessionAlias: string;
  /** Exact idempotency keys for every item attempt in the issued form. */
  attemptCommandIds: string[];
  command: AssessmentSessionSubmissionQueueCommandV1;
  enqueuedAt?: string;
};

export type EnqueueAssessmentSessionAbandonmentInput = {
  ownerGeneration: OwnerGeneration;
  expectedResetEpoch: number;
  sessionAlias: string;
  /** Exact open-command idempotency key bound to this local alias. */
  dependencyCommandId: string;
  command: AssessmentSessionAbandonmentQueueCommandV1;
  enqueuedAt?: string;
};

export type EnqueueReaderSessionInput = {
  ownerGeneration: OwnerGeneration;
  expectedResetEpoch: number;
  sessionAlias: string;
  command: ReaderSessionOpenQueueCommandV1;
  /** Queue a same-story assisted reopen only after this abandonment succeeds. */
  supportDowngradeDependencyCommandId?: string;
  enqueuedAt?: string;
};

export type EnqueueReaderAttemptInput = {
  ownerGeneration: OwnerGeneration;
  expectedResetEpoch: number;
  sessionAlias: string;
  command: ReaderAttemptQueueCommandV1;
  enqueuedAt?: string;
};

export type EnqueueReaderSessionSubmissionInput = {
  ownerGeneration: OwnerGeneration;
  expectedResetEpoch: number;
  sessionAlias: string;
  /** Exact local Reader attempt keys; projected attempts stay on the anchor. */
  attemptCommandIds: string[];
  command: ReaderSessionSubmissionQueueCommandV1;
  enqueuedAt?: string;
};

export type EnqueueReaderSessionAbandonmentInput = {
  ownerGeneration: OwnerGeneration;
  expectedResetEpoch: number;
  sessionAlias: string;
  /** Exact open or projected-anchor command id bound to this alias. */
  dependencyCommandId: string;
  command: ReaderSessionAbandonmentQueueCommandV1;
  enqueuedAt?: string;
};

export type PersistProjectedLessonSessionAnchorInput = {
  ownerGeneration: OwnerGeneration;
  installationId: string;
  deviceId: string;
  resetEpoch: number;
  manifestSha256: string;
  projectionCursor: number;
  binding: LessonSessionAuthorityBindingV1;
  projectedAttempts: ActiveLessonAttemptProjectionV1[];
  adoptedAt?: string;
};

export type PersistProjectedAssessmentSessionAnchorInput = {
  ownerGeneration: OwnerGeneration;
  installationId: string;
  deviceId: string;
  resetEpoch: number;
  manifestSha256: string;
  projectionCursor: number;
  binding: AssessmentSessionAuthorityBindingV1;
  projectedAttempts: ActiveAssessmentAttemptProjectionV2[];
  adoptedAt?: string;
};

export type PersistProjectedReaderSessionAnchorInput = {
  ownerGeneration: OwnerGeneration;
  installationId: string;
  deviceId: string;
  resetEpoch: number;
  manifestSha256: string;
  projectionCursor: number;
  binding: ReaderSessionAuthorityBindingV1;
  projectedAttempts: ActiveReaderAttemptProjectionV3[];
  adoptedAt?: string;
};

export type ProjectedLessonSessionAnchorIdentity = {
  commandSeed: string;
  sessionAlias: string;
};

export type ProjectedAssessmentSessionAnchorIdentity = {
  commandSeed: string;
  sessionAlias: string;
};

export type ProjectedReaderSessionAnchorIdentity = {
  commandSeed: string;
  sessionAlias: string;
};

export type PreparedLearningCommand =
  | {
      kind: "lesson-session-open";
      record: QueuedLessonSessionCommand;
      command: OpenLessonSessionCommandV1;
    }
  | {
      kind: "objective-attempt";
      record: QueuedObjectiveAttemptCommand;
      command: LearningAttemptCommandV1;
    }
  | {
      kind: "review-grade";
      record: QueuedReviewGradeCommand;
      command: GradeReviewCommandV1;
    }
  | {
      kind: "lesson-session-submit";
      record: QueuedLessonSessionSubmissionCommand;
      command: SubmitLessonSessionCommandV1;
      sessionReceipt: LessonSessionAuthorityBindingV1;
    }
  | {
      kind: "lesson-session-abandon";
      record: QueuedLessonSessionAbandonmentCommand;
      command: AbandonLessonSessionCommandV1;
      sessionReceipt: LessonSessionAuthorityBindingV1;
    }
  | {
      kind: "assessment-session-open";
      record: QueuedAssessmentSessionCommand;
      command: OpenAssessmentSessionCommandV1;
    }
  | {
      kind: "assessment-attempt";
      record: QueuedAssessmentAttemptCommand;
      command: RecordAssessmentAttemptCommandV1;
      sessionReceipt: AssessmentSessionAuthorityBindingV1;
    }
  | {
      kind: "assessment-session-submit";
      record: QueuedAssessmentSessionSubmissionCommand;
      command: SubmitAssessmentSessionCommandV1;
      sessionReceipt: AssessmentSessionAuthorityBindingV1;
      attemptReceipts: RecordAssessmentAttemptReceiptV1[];
      projectedAttempts: ActiveAssessmentAttemptProjectionV2[];
    }
  | {
      kind: "assessment-session-abandon";
      record: QueuedAssessmentSessionAbandonmentCommand;
      command: AbandonAssessmentSessionCommandV1;
      sessionReceipt: AssessmentSessionAuthorityBindingV1;
    }
  | {
      kind: "reader-session-open";
      record: QueuedReaderSessionCommand;
      command: OpenReaderSessionCommandV1;
    }
  | {
      kind: "reader-attempt";
      record: QueuedReaderAttemptCommand;
      command: RecordReaderAttemptCommandV1;
      sessionReceipt: ReaderSessionAuthorityBindingV1;
    }
  | {
      kind: "reader-session-submit";
      record: QueuedReaderSessionSubmissionCommand;
      command: SubmitReaderSessionCommandV1;
      sessionReceipt: ReaderSessionAuthorityBindingV1;
      attemptReceipts: RecordReaderAttemptReceiptV1[];
      projectedAttempts: ActiveReaderAttemptProjectionV3[];
    }
  | {
      kind: "reader-session-abandon";
      record: QueuedReaderSessionAbandonmentCommand;
      command: AbandonReaderSessionCommandV1;
      sessionReceipt: ReaderSessionAuthorityBindingV1;
    };

export type LearningCommandPreparation =
  | { state: "ready"; prepared: PreparedLearningCommand }
  | { state: "blocked"; reason: string }
  | { state: "invalid"; reason: string }
  | { state: "gone" };

type MetaRecord = {
  key: string;
  value: unknown;
};

export class LearningCommandConflictError extends Error {
  constructor(message = "Learning command idempotency key was reused.") {
    super(message);
    this.name = "LearningCommandConflictError";
  }
}

export class LearningCommandReceiptConflictError extends Error {
  constructor() {
    super("Learning command was acknowledged with a different receipt.");
    this.name = "LearningCommandReceiptConflictError";
  }
}

const canonicalReceiptIdentity = (
  receipt:
    | OpenLessonSessionReceiptV1
    | LearningAttemptReceiptV1
    | SubmitLessonSessionReceiptV1
    | AbandonLessonSessionReceiptV1
    | OpenAssessmentSessionReceiptV1
    | RecordAssessmentAttemptReceiptV1
    | SubmitAssessmentSessionReceiptV1
    | AbandonAssessmentSessionReceiptV1
    | GradeReviewReceiptV1
    | OpenReaderSessionReceiptV1
    | RecordReaderAttemptReceiptV1
    | SubmitReaderSessionReceiptV1
    | AbandonReaderSessionReceiptV1
    | null,
) => {
  if (!receipt) return canonicalStringify(receipt);
  const { duplicate: _deliveryObservation, ...identity } = receipt;
  return canonicalStringify(identity);
};

const requestResult = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), {
      once: true,
    });
    request.addEventListener("error", () => reject(request.error), {
      once: true,
    });
  });

const transactionDone = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener(
      "abort",
      () => reject(
        transaction.error ?? new Error("IndexedDB transaction aborted"),
      ),
      { once: true },
    );
    transaction.addEventListener(
      "error",
      () => reject(
        transaction.error ?? new Error("IndexedDB transaction failed"),
      ),
      { once: true },
    );
  });

const abortTransaction = (transaction: IDBTransaction) => {
  try {
    transaction.abort();
  } catch {
    // The transaction may already have completed after an IndexedDB error.
  }
};

const notifyLearningCommandQueueChanged = (ownerKey: string) => {
  if (typeof window === "undefined") return;
  if (typeof CustomEvent !== "undefined") {
    window.dispatchEvent(new CustomEvent(LEARNING_COMMAND_QUEUE_CHANGED_EVENT));
  }
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel("hanzi-os-sync-v1");
    channel.postMessage({
      type: "learning-command-queue-changed",
      ownerKey,
    });
    channel.close();
  }
};

const isOwnerGeneration = (value: unknown): value is OwnerGeneration => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<OwnerGeneration>;
  return typeof candidate.ownerKey === "string"
    && candidate.ownerKey.length > 0
    && Number.isSafeInteger(candidate.generation)
    && Number(candidate.generation) > 0;
};

const assertOwnerGeneration = async (
  transaction: IDBTransaction,
  expected: OwnerGeneration,
) => {
  const record = await requestResult(
    transaction.objectStore(SYNC_META_STORE).get(ACTIVE_OWNER_GENERATION_KEY) as
      IDBRequest<MetaRecord | undefined>,
  );
  const actual = isOwnerGeneration(record?.value) ? record.value : null;
  if (
    actual?.ownerKey !== expected.ownerKey
    || actual.generation !== expected.generation
  ) {
    throw new StaleOwnerGenerationError();
  }
};

const assertOwnerResetEpoch = async (
  transaction: IDBTransaction,
  ownerKey: string,
  expectedResetEpoch: number,
) => {
  const document = await requestResult(
    transaction.objectStore(SYNC_DOCUMENT_STORE).get(ownerKey) as
      IDBRequest<{ document?: { reset?: { epoch?: unknown } } } | undefined>,
  );
  const actual = document?.document?.reset?.epoch ?? 0;
  if (
    typeof actual !== "number"
    || !Number.isSafeInteger(actual)
    || actual < 0
    || actual !== expectedResetEpoch
  ) {
    throw new StaleOwnerGenerationError();
  }
};

const normalizedTime = (value: string | undefined) => {
  const parsed = value === undefined ? new Date() : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Learning command timestamp is invalid.");
  }
  return parsed.toISOString();
};

const boundedAlias = (value: string) =>
  value.length > 0 && value.length <= 200;

const recordKeyFor = (ownerKey: string, commandId: string) =>
  canonicalStringify([ownerKey, commandId]);

const baseRecord = (
  ownerKey: string,
  commandId: string,
  requestHash: string,
  deviceSequence: number,
  resetEpoch: number,
  enqueuedAt: string,
): LearningCommandRecordBase => ({
  outboxVersion: LEARNING_COMMAND_OUTBOX_VERSION,
  recordKey: recordKeyFor(ownerKey, commandId),
  commandId,
  requestHash,
  ownerKey,
  deviceSequence,
  resetEpoch,
  enqueuedAt,
  status: "pending",
  attemptCount: 0,
  lastAttemptAt: null,
  nextAttemptAt: null,
  leaseUntil: null,
  acknowledgedAt: null,
  quarantinedAt: null,
  quarantineReason: null,
});

const sessionAuthorityBinding = (
  session: QueuedLessonSessionDependency,
): LessonSessionAuthorityBindingV1 | null =>
  session.kind === "projected-lesson-session-anchor"
    ? session.binding
    : session.receipt;

const projectedSessionAttempts = (
  session: QueuedLessonSessionDependency,
) => session.kind === "projected-lesson-session-anchor"
  ? session.projectedAttempts
  : [];

const attemptsExactlyMatchForm = (
  session: QueuedLessonSessionDependency,
  attempts: QueuedObjectiveAttemptCommand[],
) => {
  const binding = sessionAuthorityBinding(session);
  if (!binding) return false;
  const projectedAttempts = projectedSessionAttempts(session);
  if (
    attempts.length + projectedAttempts.length
      !== binding.form.activities.length
  ) {
    return false;
  }
  const unmatched = new Set(attempts.map((attempt) => attempt.recordKey));
  const unmatchedProjected = new Set(
    projectedAttempts.map((attempt) => attempt.attemptId),
  );
  for (const activity of binding.form.activities) {
    const localMatch = attempts.find((attempt) =>
      unmatched.has(attempt.recordKey)
      && attempt.command.source === "lesson"
      && attempt.command.activityId === activity.activityId
      && attempt.command.activityVersion === activity.activityVersion
      && attempt.command.method === activity.method
    );
    const projectedMatch = projectedAttempts.find((attempt) =>
      unmatchedProjected.has(attempt.attemptId)
      && attempt.activityId === activity.activityId
      && attempt.activityVersion === activity.activityVersion
      && attempt.method === activity.method
      && attempt.skill === activity.skill
    );
    if (Boolean(localMatch) === Boolean(projectedMatch)) return false;
    if (localMatch) unmatched.delete(localMatch.recordKey);
    if (projectedMatch) unmatchedProjected.delete(projectedMatch.attemptId);
  }
  return unmatched.size === 0 && unmatchedProjected.size === 0;
};

const assessmentSessionAuthorityBinding = (
  session: QueuedAssessmentSessionDependency,
): AssessmentSessionAuthorityBindingV1 | null =>
  session.kind === "projected-assessment-session-anchor"
    ? session.binding
    : session.receipt;

const projectedAssessmentSessionAttempts = (
  session: QueuedAssessmentSessionDependency,
) => session.kind === "projected-assessment-session-anchor"
  ? session.projectedAttempts
  : [];

const canonicalTimestamp = (value: string) => {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
};

const projectedAssessmentAttemptsMatchBinding = (
  attempts: readonly ActiveAssessmentAttemptProjectionV2[],
  binding: AssessmentSessionAuthorityBindingV1,
) => {
  if (attempts.length > binding.form.items.length) return false;
  const attemptIds = new Set<string>();
  const positions = new Set<number>();
  const itemIds = new Set<string>();
  const itemVersions = new Set<string>();
  return attempts.every((attempt) => {
    const item = binding.form.items[attempt.position];
    if (
      !item
      || item.itemId !== attempt.itemId
      || item.itemVersion !== attempt.itemVersion
      || item.skill !== attempt.skill
      || item.measurementEligible !== attempt.measurementEligible
      || attempt.masteryEligible !== false
      || attempt.status !== "recorded"
      || !canonicalTimestamp(attempt.recordedAt)
      || attempt.attemptId.length < 1
      || attempt.attemptId.length > 160
      || attemptIds.has(attempt.attemptId)
      || positions.has(attempt.position)
      || itemIds.has(attempt.itemId)
      || itemVersions.has(attempt.itemVersion)
    ) return false;
    attemptIds.add(attempt.attemptId);
    positions.add(attempt.position);
    itemIds.add(attempt.itemId);
    itemVersions.add(attempt.itemVersion);
    return true;
  });
};

const validAssessmentSessionAuthorityWithoutFormHash = (
  session: QueuedAssessmentSessionDependency,
) => {
  const binding = assessmentSessionAuthorityBinding(session);
  if (!binding) return false;
  return binding.enrollmentId.length > 0
    && binding.enrollmentId.length <= 160
    && binding.contentVersion === session.command.contentVersion
    && binding.resetEpoch === session.resetEpoch
    && binding.status === "started"
    && canonicalTimestamp(binding.startedAt)
    && isExactAssessmentFormV1(
      binding.form,
      binding.expectedItemCount,
    )
    && binding.expectedItemCount === binding.form.items.length
    && binding.form.blueprintId === binding.blueprintId
    && binding.form.formVersion === binding.formVersion
    && binding.form.scoringPolicyVersion === binding.scoringPolicyVersion
    && (
      session.kind === "assessment-session-open"
        ? session.receipt?.protocolVersion === 1
          && session.receipt.idempotencyKey === session.command.idempotencyKey
          && binding.enrollmentId === session.command.enrollmentId
        : session.command.schemaVersion === 1
          && session.command.adoptionKey === session.commandId
          && session.command.manifestSha256
            === CURRENT_CONTENT_MANIFEST_SHA256
          && projectedAssessmentAttemptsMatchBinding(
            session.projectedAttempts,
            binding,
          )
    );
};

const validAssessmentSessionAuthority = async (
  session: QueuedAssessmentSessionDependency,
) => {
  const binding = assessmentSessionAuthorityBinding(session);
  return Boolean(
    binding
    && validAssessmentSessionAuthorityWithoutFormHash(session)
    && await hashAssessmentForm(binding.form) === binding.formHash,
  );
};

const assessmentAttemptsExactlyMatchForm = (
  session: QueuedAssessmentSessionDependency,
  attempts: QueuedAssessmentAttemptCommand[],
  requireReceipts: boolean,
) => {
  const binding = assessmentSessionAuthorityBinding(session);
  const projectedAttempts = projectedAssessmentSessionAttempts(session);
  if (
    !binding
    || attempts.length + projectedAttempts.length !== binding.form.items.length
  ) return false;
  const unmatched = new Set(attempts.map((attempt) => attempt.recordKey));
  const unmatchedProjected = new Set(
    projectedAttempts.map((attempt) => attempt.attemptId),
  );
  for (const item of binding.form.items) {
    const match = attempts.find((attempt) =>
      unmatched.has(attempt.recordKey)
      && attempt.command.itemId === item.itemId
      && attempt.command.itemVersion === item.itemVersion
    );
    const projectedMatch = projectedAttempts.find((attempt) =>
      unmatchedProjected.has(attempt.attemptId)
      && attempt.position === item.position
      && attempt.itemId === item.itemId
      && attempt.itemVersion === item.itemVersion
      && attempt.skill === item.skill
      && attempt.measurementEligible === item.measurementEligible
      && attempt.masteryEligible === false
      && attempt.status === "recorded"
    );
    if (Boolean(match) === Boolean(projectedMatch)) return false;
    if (requireReceipts) {
      const receipt = match?.receipt;
      if (projectedMatch) {
        unmatchedProjected.delete(projectedMatch.attemptId);
        continue;
      }
      if (
        !receipt
        || receipt.sessionId !== binding.sessionId
        || receipt.formHash !== binding.formHash
        || receipt.position !== item.position
        || receipt.itemId !== item.itemId
        || receipt.itemVersion !== item.itemVersion
        || receipt.skill !== item.skill
        || receipt.measurementEligible !== item.measurementEligible
        || receipt.masteryEligible !== false
        || receipt.status !== "recorded"
      ) return false;
    }
    if (match) unmatched.delete(match.recordKey);
    if (projectedMatch) unmatchedProjected.delete(projectedMatch.attemptId);
  }
  return unmatched.size === 0 && unmatchedProjected.size === 0;
};

const readerSessionAuthorityBinding = (
  session: QueuedReaderSessionDependency,
): ReaderSessionAuthorityBindingV1 | null =>
  session.kind === "projected-reader-session-anchor"
    ? session.binding
    : session.receipt;

const projectedReaderSessionAttempts = (
  session: QueuedReaderSessionDependency,
) => session.kind === "projected-reader-session-anchor"
  ? session.projectedAttempts
  : [];

const projectedReaderAttemptsMatchBinding = (
  attempts: readonly ActiveReaderAttemptProjectionV3[],
  binding: ReaderSessionAuthorityBindingV1,
) => {
  if (attempts.length > binding.form.items.length) return false;
  const attemptIds = new Set<string>();
  const evidenceIds = new Set<string>();
  const positions = new Set<number>();
  const itemIds = new Set<string>();
  const itemVersions = new Set<string>();
  return attempts.every((attempt) => {
    const item = binding.form.items[attempt.position];
    if (
      !item
      || attempt.sessionId !== binding.sessionId
      || attempt.resetEpoch !== binding.resetEpoch
      || attempt.contentVersion !== binding.contentVersion
      || attempt.formHash !== binding.formHash
      || item.itemId !== attempt.itemId
      || item.itemVersion !== attempt.itemVersion
      || attempt.method !== item.method
      || attempt.skill !== item.skill
      || attempt.script !== binding.script
      || attempt.supportMode !== binding.supportMode
      || attempt.supportPolicyVersion !== binding.supportPolicyVersion
      || attempt.answerExposure !== item.answerExposure
      || attempt.priorExposure !== item.priorExposure
      || attempt.masteryEligible !== item.masteryEligible
      || (
        (attempt.outcome === "correct" && attempt.score !== 100)
        || (attempt.outcome === "incorrect" && attempt.score !== 0)
      )
      || (
        attempt.outcome !== "correct"
        && attempt.outcome !== "incorrect"
      )
      || attempt.verification !== "server-objective"
      || attempt.status !== "recorded"
      || !canonicalTimestamp(attempt.recordedAt)
      || attempt.attemptId.length < 1
      || attempt.attemptId.length > 160
      || attempt.evidenceId.length < 1
      || attempt.evidenceId.length > 160
      || attemptIds.has(attempt.attemptId)
      || evidenceIds.has(attempt.evidenceId)
      || positions.has(attempt.position)
      || itemIds.has(attempt.itemId)
      || itemVersions.has(attempt.itemVersion)
    ) return false;
    attemptIds.add(attempt.attemptId);
    evidenceIds.add(attempt.evidenceId);
    positions.add(attempt.position);
    itemIds.add(attempt.itemId);
    itemVersions.add(attempt.itemVersion);
    return true;
  });
};

const validReaderSessionAuthorityWithoutFormHash = (
  session: QueuedReaderSessionDependency,
) => {
  const binding = readerSessionAuthorityBinding(session);
  if (!binding) return false;
  return binding.sessionId.length > 0
    && binding.sessionId.length <= 160
    && binding.enrollmentId.length > 0
    && binding.enrollmentId.length <= 160
    && binding.contentVersion === session.command.contentVersion
    && binding.resetEpoch === session.resetEpoch
    && binding.status === "started"
    && canonicalTimestamp(binding.startedAt)
    && binding.expectedItemCount === binding.form.items.length
    && isExactReaderSessionFormV1(
      binding.form,
      binding.expectedItemCount,
    )
    && binding.storyId === binding.form.storyId
    && binding.storyVersion === binding.form.storyVersion
    && binding.formVersion === binding.form.formVersion
    && binding.formSchemaVersion === binding.form.formSchemaVersion
    && binding.script === binding.form.script
    && binding.supportMode === binding.form.supportMode
    && binding.supportPolicyVersion === binding.form.supportPolicyVersion
    && (
      session.kind === "reader-session-open"
        ? session.receipt?.protocolVersion === 1
          && session.receipt.idempotencyKey === session.command.idempotencyKey
          && binding.enrollmentId === session.command.enrollmentId
          && binding.storyId === session.command.storyId
          && binding.script === session.command.script
          && binding.supportMode === session.command.supportMode
        : session.command.schemaVersion === 1
          && session.command.adoptionKey === session.commandId
          && session.command.manifestSha256
            === CURRENT_CONTENT_MANIFEST_SHA256
          && projectedReaderAttemptsMatchBinding(
            session.projectedAttempts,
            binding,
          )
    );
};

const validReaderSessionAuthority = async (
  session: QueuedReaderSessionDependency,
) => {
  const binding = readerSessionAuthorityBinding(session);
  return Boolean(
    binding
    && validReaderSessionAuthorityWithoutFormHash(session)
    && await hashReaderSessionForm(binding.form) === binding.formHash,
  );
};

const readerAttemptsExactlyMatchForm = (
  session: QueuedReaderSessionDependency,
  attempts: QueuedReaderAttemptCommand[],
  requireReceipts: boolean,
) => {
  const binding = readerSessionAuthorityBinding(session);
  const projectedAttempts = projectedReaderSessionAttempts(session);
  if (
    !binding
    || attempts.length + projectedAttempts.length !== binding.form.items.length
  ) return false;
  const unmatched = new Set(attempts.map((attempt) => attempt.recordKey));
  const unmatchedProjected = new Set(
    projectedAttempts.map((attempt) => attempt.attemptId),
  );
  for (const item of binding.form.items) {
    const match = attempts.find((attempt) =>
      unmatched.has(attempt.recordKey)
      && attempt.command.position === item.position
      && attempt.command.itemId === item.itemId
      && attempt.command.itemVersion === item.itemVersion
      && item.options.includes(attempt.command.selectedOption)
    );
    const projectedMatch = projectedAttempts.find((attempt) =>
      unmatchedProjected.has(attempt.attemptId)
      && attempt.position === item.position
      && attempt.itemId === item.itemId
      && attempt.itemVersion === item.itemVersion
    );
    if (Boolean(match) === Boolean(projectedMatch)) return false;
    if (requireReceipts && match) {
      const receipt = match.receipt;
      if (
        !receipt
        || receipt.sessionId !== binding.sessionId
        || receipt.resetEpoch !== binding.resetEpoch
        || receipt.contentVersion !== binding.contentVersion
        || receipt.formHash !== binding.formHash
        || receipt.position !== item.position
        || receipt.itemId !== item.itemId
        || receipt.itemVersion !== item.itemVersion
        || receipt.method !== item.method
        || receipt.skill !== item.skill
        || receipt.script !== binding.script
        || receipt.supportMode !== binding.supportMode
        || receipt.supportPolicyVersion !== binding.supportPolicyVersion
        || receipt.answerExposure !== item.answerExposure
        || receipt.priorExposure !== item.priorExposure
        || receipt.masteryEligible !== item.masteryEligible
        || receipt.status !== "recorded"
      ) return false;
    }
    if (match) unmatched.delete(match.recordKey);
    if (projectedMatch) unmatchedProjected.delete(projectedMatch.attemptId);
  }
  return unmatched.size === 0 && unmatchedProjected.size === 0;
};

const enqueueRecord = async (
  record: LearningCommandOutboxRecord,
  ownerGeneration: OwnerGeneration,
) => {
  const database = await openSyncDatabase();
  const transaction = database.transaction(
    [SYNC_META_STORE, SYNC_DOCUMENT_STORE, LEARNING_COMMAND_OUTBOX_STORE],
    "readwrite",
  );
  const done = transactionDone(transaction);
  try {
    await assertOwnerGeneration(transaction, ownerGeneration);
    await assertOwnerResetEpoch(
      transaction,
      ownerGeneration.ownerKey,
      record.resetEpoch,
    );
    if (record.ownerKey !== ownerGeneration.ownerKey) {
      throw new StaleOwnerGenerationError();
    }
    const store = transaction.objectStore(LEARNING_COMMAND_OUTBOX_STORE);
    const existing = await requestResult(
      store.get(record.recordKey) as IDBRequest<
        LearningCommandOutboxRecord | undefined
      >,
    );
    if (existing) {
      if (existing.requestHash !== record.requestHash) {
        throw new LearningCommandConflictError();
      }
      await done;
      notifyLearningCommandQueueChanged(existing.ownerKey);
      return existing;
    }

    if (
      record.kind === "lesson-session-open"
      || record.kind === "projected-lesson-session-anchor"
      || record.kind === "assessment-session-open"
      || record.kind === "projected-assessment-session-anchor"
      || record.kind === "reader-session-open"
      || record.kind === "projected-reader-session-anchor"
    ) {
      const aliasOwner = await requestResult(
        store.index(LEARNING_COMMAND_SESSION_ALIAS_INDEX).get(
          IDBKeyRange.only([record.ownerKey, record.sessionAlias]),
        ) as IDBRequest<LearningCommandOutboxRecord | undefined>,
      );
      if (aliasOwner) {
        throw new LearningCommandConflictError(
          "Lesson-session alias is already bound to another command.",
        );
      }
      if (
        record.kind === "reader-session-open"
        && record.dependencyRecordKey !== null
      ) {
        const terminal = await requestResult(
          store.get(record.dependencyRecordKey) as IDBRequest<
            LearningCommandOutboxRecord | undefined
          >,
        );
        const previousSession = terminal?.kind === "reader-session-abandon"
          ? await requestResult(
              store.get(terminal.dependencyRecordKey) as IDBRequest<
                LearningCommandOutboxRecord | undefined
              >,
            )
          : undefined;
        const previousReaderSession = previousSession
          && (
            previousSession.kind === "reader-session-open"
            || previousSession.kind === "projected-reader-session-anchor"
          )
          ? previousSession
          : null;
        const previousBinding = previousReaderSession
          ? readerSessionAuthorityBinding(previousReaderSession)
          : null;
        if (
          !terminal
          || terminal.kind !== "reader-session-abandon"
          || terminal.status === "quarantined"
          || terminal.ownerKey !== record.ownerKey
          || terminal.resetEpoch !== record.resetEpoch
          || terminal.command.resetEpoch !== record.resetEpoch
          || terminal.command.contentVersion !== record.command.contentVersion
          || terminal.command.installationId
            !== record.command.installationId
          || terminal.command.deviceId !== record.command.deviceId
          || terminal.command.reason !== "support-requested"
          || terminal.deviceSequence >= record.deviceSequence
          || terminal.sessionAlias === record.sessionAlias
          || !previousReaderSession
          || !validReaderSessionAuthorityWithoutFormHash(
            previousReaderSession,
          )
          || !previousBinding
          || previousBinding.storyId !== record.command.storyId
          || previousBinding.supportMode !== "unassisted"
          || record.command.supportMode !== "assisted"
        ) {
          throw new LearningCommandConflictError(
            "Reader support downgrade dependency is incompatible.",
          );
        }
      }
      if (record.kind === "projected-lesson-session-anchor") {
        const ownerRecords = await requestResult(
          store.index(LEARNING_COMMAND_OWNER_INDEX).getAll(
            IDBKeyRange.only(record.ownerKey),
          ) as IDBRequest<LearningCommandOutboxRecord[]>,
        );
        const duplicateSession = ownerRecords.some((candidate) => {
          if (candidate.kind === "projected-lesson-session-anchor") {
            return candidate.binding.sessionId === record.binding.sessionId;
          }
          return candidate.kind === "lesson-session-open"
            && candidate.receipt?.sessionId === record.binding.sessionId;
        });
        if (duplicateSession) {
          throw new LearningCommandConflictError(
            "Server lesson session is already bound to another local anchor.",
          );
        }
      } else if (record.kind === "projected-assessment-session-anchor") {
        const ownerRecords = await requestResult(
          store.index(LEARNING_COMMAND_OWNER_INDEX).getAll(
            IDBKeyRange.only(record.ownerKey),
          ) as IDBRequest<LearningCommandOutboxRecord[]>,
        );
        const duplicateSession = ownerRecords.some((candidate) => {
          if (candidate.kind === "projected-assessment-session-anchor") {
            return candidate.binding.sessionId === record.binding.sessionId;
          }
          return candidate.kind === "assessment-session-open"
            && candidate.receipt?.sessionId === record.binding.sessionId;
        });
        if (duplicateSession) {
          throw new LearningCommandConflictError(
            "Server assessment session is already bound to another local anchor.",
          );
        }
      } else if (record.kind === "projected-reader-session-anchor") {
        const ownerRecords = await requestResult(
          store.index(LEARNING_COMMAND_OWNER_INDEX).getAll(
            IDBKeyRange.only(record.ownerKey),
          ) as IDBRequest<LearningCommandOutboxRecord[]>,
        );
        const duplicateSession = ownerRecords.some((candidate) => {
          if (candidate.kind === "projected-reader-session-anchor") {
            return candidate.binding.sessionId === record.binding.sessionId;
          }
          return candidate.kind === "reader-session-open"
            && candidate.receipt?.sessionId === record.binding.sessionId;
        });
        if (duplicateSession) {
          throw new LearningCommandConflictError(
            "Server Reader session is already bound to another local anchor.",
          );
        }
      }
    } else if (record.kind === "review-grade") {
      const ownerRecords = await requestResult(
        store.index(LEARNING_COMMAND_OWNER_INDEX).getAll(
          IDBKeyRange.only(record.ownerKey),
        ) as IDBRequest<LearningCommandOutboxRecord[]>,
      );
      const conflictingGrade = ownerRecords.some((candidate) =>
        candidate.kind === "review-grade"
        && candidate.resetEpoch === record.resetEpoch
        && candidate.command.idempotencyKey
          !== record.command.idempotencyKey
        && candidate.command.cardId === record.command.cardId
        && candidate.command.expectedCardRevision
          === record.command.expectedCardRevision
        && (
          candidate.status === "pending"
          || candidate.status === "acknowledged"
        )
      );
      if (conflictingGrade) {
        throw new LearningCommandConflictError(
          "Review card revision is already bound to another grade command.",
        );
      }
    } else if (
      record.kind === "reader-attempt"
      || record.kind === "reader-session-submit"
      || record.kind === "reader-session-abandon"
    ) {
      const dependency = await requestResult(
        store.get(record.dependencyRecordKey) as IDBRequest<
          LearningCommandOutboxRecord | undefined
        >,
      );
      if (
        !dependency
        || (
          dependency.kind !== "reader-session-open"
          && dependency.kind !== "projected-reader-session-anchor"
        )
        || dependency.ownerKey !== record.ownerKey
        || dependency.sessionAlias !== record.sessionAlias
        || dependency.resetEpoch !== record.resetEpoch
        || dependency.command.resetEpoch !== record.resetEpoch
        || dependency.command.contentVersion !== record.command.contentVersion
        || dependency.command.installationId !== record.command.installationId
        || dependency.command.deviceId !== record.command.deviceId
        || dependency.deviceSequence >= record.deviceSequence
        || dependency.status !== "acknowledged"
        || !validReaderSessionAuthorityWithoutFormHash(dependency)
      ) {
        throw new LearningCommandConflictError(
          "Reader-session dependency is absent or incompatible.",
        );
      }
      const ownerRecords = await requestResult(
        store.index(LEARNING_COMMAND_OWNER_INDEX).getAll(
          IDBKeyRange.only(record.ownerKey),
        ) as IDBRequest<LearningCommandOutboxRecord[]>,
      );
      const terminalCommand = ownerRecords.find((candidate) =>
        candidate.sessionAlias === record.sessionAlias
        && (
          candidate.kind === "reader-session-submit"
          || candidate.kind === "reader-session-abandon"
        )
      );
      if (record.kind === "reader-attempt") {
        if (terminalCommand) {
          throw new LearningCommandConflictError(
            "Reader attempts cannot be queued after a terminal command.",
          );
        }
        const authorityBinding = readerSessionAuthorityBinding(dependency)!;
        const item = authorityBinding.form.items[record.command.position];
        const alreadyCovered = ownerRecords.some((candidate) =>
          candidate.kind === "reader-attempt"
          && candidate.sessionAlias === record.sessionAlias
          && (
            candidate.command.position === record.command.position
            || candidate.command.itemId === record.command.itemId
            || candidate.command.itemVersion === record.command.itemVersion
          )
        ) || projectedReaderSessionAttempts(dependency).some((attempt) =>
          attempt.position === record.command.position
          || attempt.itemId === record.command.itemId
          || attempt.itemVersion === record.command.itemVersion
        );
        if (
          !item
          || item.itemId !== record.command.itemId
          || item.itemVersion !== record.command.itemVersion
          || !item.options.includes(record.command.selectedOption)
          || alreadyCovered
        ) {
          throw new LearningCommandConflictError(
            "Reader item is absent from the form or already covered.",
          );
        }
      } else if (record.kind === "reader-session-submit") {
        if (terminalCommand) {
          throw new LearningCommandConflictError(
            "Reader session already has a terminal command.",
          );
        }
        const dependencyKeys = new Set(record.attemptDependencyRecordKeys);
        const attempts = ownerRecords.filter(
          (candidate): candidate is QueuedReaderAttemptCommand =>
            candidate.kind === "reader-attempt"
            && candidate.sessionAlias === record.sessionAlias,
        );
        if (
          dependencyKeys.size !== record.attemptDependencyRecordKeys.length
          || attempts.length !== dependencyKeys.size
          || attempts.some((attempt) =>
            !dependencyKeys.has(attempt.recordKey)
            || attempt.dependencyRecordKey !== dependency.recordKey
            || attempt.resetEpoch !== record.resetEpoch
            || attempt.command.resetEpoch !== record.resetEpoch
            || attempt.command.contentVersion !== record.command.contentVersion
            || attempt.command.installationId !== record.command.installationId
            || attempt.command.deviceId !== record.command.deviceId
            || attempt.deviceSequence >= record.deviceSequence
          )
          || !readerAttemptsExactlyMatchForm(
            dependency,
            attempts,
            false,
          )
        ) {
          throw new LearningCommandConflictError(
            "Submission dependencies are not the exact Reader form attempt set.",
          );
        }
      } else if (terminalCommand) {
        throw new LearningCommandConflictError(
          "Reader session already has a terminal command.",
        );
      }
    } else if (
      record.kind === "assessment-attempt"
      || record.kind === "assessment-session-submit"
      || record.kind === "assessment-session-abandon"
    ) {
      const dependency = await requestResult(
        store.get(record.dependencyRecordKey) as IDBRequest<
          LearningCommandOutboxRecord | undefined
        >,
      );
      if (
        !dependency
        || (
          dependency.kind !== "assessment-session-open"
          && dependency.kind !== "projected-assessment-session-anchor"
        )
        || dependency.ownerKey !== record.ownerKey
        || dependency.sessionAlias !== record.sessionAlias
        || dependency.resetEpoch !== record.resetEpoch
        || dependency.command.resetEpoch !== record.resetEpoch
        || dependency.command.contentVersion !== record.command.contentVersion
        || dependency.command.installationId !== record.command.installationId
        || dependency.command.deviceId !== record.command.deviceId
        || dependency.deviceSequence >= record.deviceSequence
        || dependency.status !== "acknowledged"
        || !validAssessmentSessionAuthorityWithoutFormHash(dependency)
      ) {
        throw new LearningCommandConflictError(
          "Assessment-session dependency is absent or incompatible.",
        );
      }
      const ownerRecords = await requestResult(
        store.index(LEARNING_COMMAND_OWNER_INDEX).getAll(
          IDBKeyRange.only(record.ownerKey),
        ) as IDBRequest<LearningCommandOutboxRecord[]>,
      );
      const terminalCommand = ownerRecords.find((candidate) =>
        candidate.sessionAlias === record.sessionAlias
        && (
          candidate.kind === "assessment-session-submit"
          || candidate.kind === "assessment-session-abandon"
        )
      );
      if (record.kind === "assessment-attempt") {
        if (terminalCommand) {
          throw new LearningCommandConflictError(
            "Assessment attempts cannot be queued after a terminal command.",
          );
        }
        const authorityBinding = assessmentSessionAuthorityBinding(dependency)!;
        const item = authorityBinding.form.items.find((candidate) =>
          candidate.itemId === record.command.itemId
        );
        const alreadyCovered = ownerRecords.some((candidate) =>
          candidate.kind === "assessment-attempt"
          && candidate.sessionAlias === record.sessionAlias
          && candidate.command.itemId === record.command.itemId
        ) || projectedAssessmentSessionAttempts(dependency).some(
          (attempt) => attempt.itemId === record.command.itemId,
        );
        if (
          !item
          || item.itemVersion !== record.command.itemVersion
          || alreadyCovered
        ) {
          throw new LearningCommandConflictError(
            "Assessment item is absent from the form or already covered.",
          );
        }
      } else if (record.kind === "assessment-session-submit") {
        if (terminalCommand) {
          throw new LearningCommandConflictError(
            "Assessment session already has a terminal command.",
          );
        }
        const dependencyKeys = new Set(record.attemptDependencyRecordKeys);
        const attempts = ownerRecords.filter(
          (candidate): candidate is QueuedAssessmentAttemptCommand =>
            candidate.kind === "assessment-attempt"
            && candidate.sessionAlias === record.sessionAlias,
        );
        if (
          dependencyKeys.size !== record.attemptDependencyRecordKeys.length
          || attempts.length !== dependencyKeys.size
          || attempts.some((attempt) =>
            !dependencyKeys.has(attempt.recordKey)
            || attempt.dependencyRecordKey !== dependency.recordKey
            || attempt.resetEpoch !== record.resetEpoch
            || attempt.command.resetEpoch !== record.resetEpoch
            || attempt.command.contentVersion !== record.command.contentVersion
            || attempt.command.installationId !== record.command.installationId
            || attempt.command.deviceId !== record.command.deviceId
            || attempt.deviceSequence >= record.deviceSequence
          )
          || !assessmentAttemptsExactlyMatchForm(
            dependency,
            attempts,
            false,
          )
        ) {
          throw new LearningCommandConflictError(
            "Submission dependencies are not the exact assessment form attempt set.",
          );
        }
      } else if (terminalCommand) {
        throw new LearningCommandConflictError(
          "Assessment session already has a terminal command.",
        );
      }
    } else if (record.kind !== "objective-attempt" || record.sessionAlias) {
      if (!record.dependencyRecordKey) {
        throw new LearningCommandConflictError(
          "Lesson-session dependency is absent.",
        );
      }
      const dependency = await requestResult(
        store.get(record.dependencyRecordKey) as IDBRequest<
          LearningCommandOutboxRecord | undefined
        >,
      );
      if (
        !dependency
        || (
          dependency.kind !== "lesson-session-open"
          && dependency.kind !== "projected-lesson-session-anchor"
        )
        || dependency.ownerKey !== record.ownerKey
        || dependency.sessionAlias !== record.sessionAlias
        || dependency.resetEpoch !== record.resetEpoch
        || dependency.command.resetEpoch !== record.resetEpoch
        || dependency.command.contentVersion !== record.command.contentVersion
        || dependency.command.installationId !== record.command.installationId
        || dependency.command.deviceId !== record.command.deviceId
        || dependency.deviceSequence >= record.deviceSequence
      ) {
        throw new LearningCommandConflictError(
          "Lesson-session dependency is absent or incompatible.",
        );
      }
      const ownerRecords = await requestResult(
        store.index(LEARNING_COMMAND_OWNER_INDEX).getAll(
          IDBKeyRange.only(record.ownerKey),
        ) as IDBRequest<LearningCommandOutboxRecord[]>,
      );
      const terminalCommand = ownerRecords.find((candidate) =>
        candidate.sessionAlias === record.sessionAlias
        && (
          candidate.kind === "lesson-session-submit"
          || candidate.kind === "lesson-session-abandon"
        )
      );
      if (record.kind === "objective-attempt") {
        if (terminalCommand) {
          throw new LearningCommandConflictError(
            "Lesson attempts cannot be queued after a terminal session command.",
          );
        }
        const binding = sessionAuthorityBinding(dependency);
        const activity = binding?.form.activities.find((candidate) =>
          candidate.activityId === record.command.activityId
        );
        const alreadyCovered = projectedSessionAttempts(dependency).some(
          (attempt) => attempt.activityId === record.command.activityId,
        ) || ownerRecords.some((candidate) =>
          candidate.kind === "objective-attempt"
          && candidate.sessionAlias === record.sessionAlias
          && candidate.command.activityId === record.command.activityId
        );
        if (
          binding
          && (
            !activity
            || activity.activityVersion !== record.command.activityVersion
            || activity.method !== record.command.method
            || alreadyCovered
          )
        ) {
          throw new LearningCommandConflictError(
            "Lesson activity is absent from the form or already covered.",
          );
        }
      } else if (record.kind === "lesson-session-submit") {
        if (terminalCommand) {
          throw new LearningCommandConflictError(
            "Lesson session already has a terminal command.",
          );
        }
        const dependencyKeys = new Set(record.attemptDependencyRecordKeys);
        const attempts = ownerRecords.filter(
          (candidate): candidate is QueuedObjectiveAttemptCommand =>
          candidate.kind === "objective-attempt"
          && candidate.sessionAlias === record.sessionAlias
        );
        if (
          dependencyKeys.size !== record.attemptDependencyRecordKeys.length
          || attempts.length !== dependencyKeys.size
          || attempts.some((attempt) =>
            !dependencyKeys.has(attempt.recordKey)
            || attempt.command.source !== "lesson"
            || attempt.dependencyRecordKey !== dependency.recordKey
            || attempt.resetEpoch !== record.resetEpoch
            || attempt.command.resetEpoch !== record.resetEpoch
            || attempt.command.contentVersion !== record.command.contentVersion
            || attempt.command.installationId !== record.command.installationId
            || attempt.command.deviceId !== record.command.deviceId
            || attempt.deviceSequence >= record.deviceSequence
          )
          || (
            dependency.status === "acknowledged"
            && !attemptsExactlyMatchForm(dependency, attempts)
          )
        ) {
          throw new LearningCommandConflictError(
            "Submission dependencies are not the exact lesson form attempt set.",
          );
        }
      } else if (terminalCommand) {
        throw new LearningCommandConflictError(
          "Lesson session already has a terminal command.",
        );
      }
    }

    store.add(record);
    await done;
    notifyLearningCommandQueueChanged(record.ownerKey);
    return record;
  } catch (error) {
    abortTransaction(transaction);
    await done.catch(() => undefined);
    throw error;
  }
};

export async function enqueueLessonSessionCommand(
  input: EnqueueLessonSessionInput,
): Promise<QueuedLessonSessionCommand> {
  if (!boundedAlias(input.sessionAlias)) {
    throw new Error("Lesson-session alias is invalid.");
  }
  const deviceSequence = await allocateDeviceSequence();
  const resetEpoch = input.expectedResetEpoch;
  const parsed = parseOpenLessonSessionCommand({
    ...input.command,
    deviceSequence,
    resetEpoch,
  });
  if (!parsed.ok) throw new Error(parsed.reason);
  const requestHash = await sha256Hex({
    kind: "lesson-session-open",
    sessionAlias: input.sessionAlias,
    resetEpoch,
    command: input.command,
  });
  const record: QueuedLessonSessionCommand = {
    ...baseRecord(
      input.ownerGeneration.ownerKey,
      parsed.command.idempotencyKey,
      requestHash,
      deviceSequence,
      resetEpoch,
      normalizedTime(input.enqueuedAt),
    ),
    kind: "lesson-session-open",
    sessionAlias: input.sessionAlias,
    sessionAliasLookupKey: input.sessionAlias,
    dependencyRecordKey: null,
    command: parsed.command,
    receipt: null,
  };
  return enqueueRecord(record, input.ownerGeneration) as
    Promise<QueuedLessonSessionCommand>;
}

export async function enqueueObjectiveAttemptCommand(
  input: EnqueueObjectiveAttemptInput,
): Promise<QueuedObjectiveAttemptCommand> {
  if ("sessionId" in input.command) {
    throw new Error("Queued attempts cannot provide a server session identifier.");
  }
  const needsSession = input.command.source === "lesson";
  if (
    needsSession !== (typeof input.sessionAlias === "string")
    || (input.sessionAlias !== undefined && !boundedAlias(input.sessionAlias))
  ) {
    throw new Error(
      "Lesson attempts require a local session alias; reader attempts forbid it.",
    );
  }
  const deviceSequence = await allocateDeviceSequence();
  const resetEpoch = input.expectedResetEpoch;
  const command: QueuedObjectiveAttemptCommandV1 = {
    ...input.command,
    deviceSequence,
    resetEpoch,
  };
  if (command.source === "reader") {
    const parsed = parseLearningAttemptCommand(command);
    if (!parsed.ok) throw new Error(parsed.reason);
  }
  const sessionAlias = input.sessionAlias ?? null;
  const dependency = sessionAlias
    ? await findLessonSessionByAlias(
        input.ownerGeneration,
        sessionAlias,
      )
    : null;
  if (sessionAlias && !dependency) {
    throw new LearningCommandConflictError(
      "Lesson attempt dependency is absent or belongs to another owner.",
    );
  }
  const requestHash = await sha256Hex({
    kind: "objective-attempt",
    sessionAlias,
    resetEpoch,
    command: input.command,
  });
  const record: QueuedObjectiveAttemptCommand = {
    ...baseRecord(
      input.ownerGeneration.ownerKey,
      command.idempotencyKey,
      requestHash,
      deviceSequence,
      resetEpoch,
      normalizedTime(input.enqueuedAt),
    ),
    kind: "objective-attempt",
    sessionAlias,
    dependencyRecordKey: dependency?.recordKey ?? null,
    command,
    receipt: null,
  };
  return enqueueRecord(record, input.ownerGeneration) as
    Promise<QueuedObjectiveAttemptCommand>;
}

const reviewGradeRequestHash = (
  ownerKey: string,
  resetEpoch: number,
  command: ReviewGradeQueueCommandV1,
) => sha256Hex({
  ownerKey,
  kind: "review-grade",
  resetEpoch,
  command,
});

const queuedReviewGradeCommand = (
  command: GradeReviewCommandV1,
): ReviewGradeQueueCommandV1 => {
  const {
    deviceSequence: _deviceSequence,
    resetEpoch: _resetEpoch,
    ...queued
  } = command;
  return queued;
};

export async function enqueueReviewGradeCommand(
  input: EnqueueReviewGradeInput,
): Promise<QueuedReviewGradeCommand> {
  if (
    "deviceSequence" in input.command
    || "resetEpoch" in input.command
  ) {
    throw new Error(
      "Queued review grades cannot provide sequence or reset authority.",
    );
  }
  const deviceSequence = await allocateDeviceSequence();
  const resetEpoch = input.expectedResetEpoch;
  const parsed = parseGradeReviewCommand({
    ...input.command,
    deviceSequence,
    resetEpoch,
  });
  if (!parsed.ok) throw new Error(parsed.reason);
  if (
    canonicalStringify(input.command)
    !== canonicalStringify(queuedReviewGradeCommand(parsed.command))
  ) {
    throw new Error("Queued review-grade command is not canonical.");
  }
  const requestHash = await reviewGradeRequestHash(
    input.ownerGeneration.ownerKey,
    resetEpoch,
    input.command,
  );
  const record: QueuedReviewGradeCommand = {
    ...baseRecord(
      input.ownerGeneration.ownerKey,
      parsed.command.idempotencyKey,
      requestHash,
      deviceSequence,
      resetEpoch,
      normalizedTime(input.enqueuedAt),
    ),
    kind: "review-grade",
    sessionAlias: null,
    dependencyRecordKey: null,
    command: parsed.command,
    receipt: null,
  };
  return enqueueRecord(record, input.ownerGeneration) as
    Promise<QueuedReviewGradeCommand>;
}

export async function enqueueLessonSessionSubmissionCommand(
  input: EnqueueLessonSessionSubmissionInput,
): Promise<QueuedLessonSessionSubmissionCommand> {
  if ("sessionId" in input.command || "formHash" in input.command) {
    throw new Error(
      "Queued submissions cannot provide server session or form identifiers.",
    );
  }
  if (
    !boundedAlias(input.sessionAlias)
    || input.attemptCommandIds.length > 100
    || input.attemptCommandIds.some((commandId) =>
      commandId.length < 1 || commandId.length > 200
    )
  ) {
    throw new Error("Lesson-session submission dependencies are invalid.");
  }
  const uniqueCommandIds = [...new Set(input.attemptCommandIds)].sort();
  if (uniqueCommandIds.length !== input.attemptCommandIds.length) {
    throw new Error("Lesson-session submission dependencies must be unique.");
  }
  const dependency = await findLessonSessionByAlias(
    input.ownerGeneration,
    input.sessionAlias,
  );
  if (!dependency) {
    throw new LearningCommandConflictError(
      "Lesson-session submission dependency is absent.",
    );
  }
  const authorityBinding = sessionAuthorityBinding(dependency);
  if (
    input.attemptCommandIds.length === 0
    && (
      dependency.kind !== "projected-lesson-session-anchor"
      || !authorityBinding
      || dependency.projectedAttempts.length
        !== authorityBinding.form.activities.length
    )
  ) {
    throw new Error("Lesson-session submission dependencies are invalid.");
  }
  const deviceSequence = await allocateDeviceSequence();
  const resetEpoch = input.expectedResetEpoch;
  const command: QueuedLessonSessionSubmissionCommandV1 = {
    ...input.command,
    deviceSequence,
    resetEpoch,
  };
  if (authorityBinding) {
    const parsed = parseSubmitLessonSessionCommand({
      ...command,
      sessionId: authorityBinding.sessionId,
      formHash: authorityBinding.formHash,
    });
    if (!parsed.ok) throw new Error(parsed.reason);
  }
  const requestHash = await sha256Hex({
    kind: "lesson-session-submit",
    sessionAlias: input.sessionAlias,
    attemptCommandIds: uniqueCommandIds,
    resetEpoch,
    command: input.command,
  });
  const record: QueuedLessonSessionSubmissionCommand = {
    ...baseRecord(
      input.ownerGeneration.ownerKey,
      command.idempotencyKey,
      requestHash,
      deviceSequence,
      resetEpoch,
      normalizedTime(input.enqueuedAt),
    ),
    kind: "lesson-session-submit",
    sessionAlias: input.sessionAlias,
    dependencyRecordKey: dependency.recordKey,
    attemptDependencyRecordKeys: uniqueCommandIds.map((commandId) =>
      recordKeyFor(input.ownerGeneration.ownerKey, commandId)
    ),
    command,
    receipt: null,
  };
  return enqueueRecord(record, input.ownerGeneration) as
    Promise<QueuedLessonSessionSubmissionCommand>;
}

export async function enqueueLessonSessionAbandonmentCommand(
  input: EnqueueLessonSessionAbandonmentInput,
): Promise<QueuedLessonSessionAbandonmentCommand> {
  if (
    "sessionId" in input.command
    || "resetEpoch" in input.command
    || "deviceSequence" in input.command
  ) {
    throw new Error(
      "Queued abandonment cannot provide server session or sequence identifiers.",
    );
  }
  if (
    !boundedAlias(input.sessionAlias)
    || input.dependencyCommandId.length < 1
    || input.dependencyCommandId.length > 200
  ) {
    throw new Error("Lesson-session abandonment dependency is invalid.");
  }
  const dependency = await findLessonSessionByAlias(
    input.ownerGeneration,
    input.sessionAlias,
  );
  if (
    !dependency
    || dependency.commandId !== input.dependencyCommandId
  ) {
    throw new LearningCommandConflictError(
      "Lesson-session abandonment dependency is absent or mismatched.",
    );
  }
  const deviceSequence = await allocateDeviceSequence();
  const resetEpoch = input.expectedResetEpoch;
  const parsed = parseAbandonLessonSessionCommand({
    ...input.command,
    deviceSequence,
    resetEpoch,
    sessionId: sessionAuthorityBinding(dependency)?.sessionId
      ?? "pending-session",
  });
  if (!parsed.ok) throw new Error(parsed.reason);
  const {
    sessionId: _serverSessionId,
    ...command
  } = parsed.command;
  const requestHash = await sha256Hex({
    kind: "lesson-session-abandon",
    sessionAlias: input.sessionAlias,
    dependencyCommandId: input.dependencyCommandId,
    resetEpoch,
    command: input.command,
  });
  const record: QueuedLessonSessionAbandonmentCommand = {
    ...baseRecord(
      input.ownerGeneration.ownerKey,
      command.idempotencyKey,
      requestHash,
      deviceSequence,
      resetEpoch,
      normalizedTime(input.enqueuedAt),
    ),
    kind: "lesson-session-abandon",
    sessionAlias: input.sessionAlias,
    dependencyRecordKey: dependency.recordKey,
    command,
    receipt: null,
  };
  return enqueueRecord(record, input.ownerGeneration) as
    Promise<QueuedLessonSessionAbandonmentCommand>;
}

export async function enqueueAssessmentSessionCommand(
  input: EnqueueAssessmentSessionInput,
): Promise<QueuedAssessmentSessionCommand> {
  if (!boundedAlias(input.sessionAlias)) {
    throw new Error("Assessment-session alias is invalid.");
  }
  const deviceSequence = await allocateDeviceSequence();
  const resetEpoch = input.expectedResetEpoch;
  const parsed = parseOpenAssessmentSessionCommand({
    ...input.command,
    deviceSequence,
    resetEpoch,
  });
  if (!parsed.ok) throw new Error(parsed.reason);
  const requestHash = await sha256Hex({
    kind: "assessment-session-open",
    sessionAlias: input.sessionAlias,
    resetEpoch,
    command: input.command,
  });
  const record: QueuedAssessmentSessionCommand = {
    ...baseRecord(
      input.ownerGeneration.ownerKey,
      parsed.command.idempotencyKey,
      requestHash,
      deviceSequence,
      resetEpoch,
      normalizedTime(input.enqueuedAt),
    ),
    kind: "assessment-session-open",
    sessionAlias: input.sessionAlias,
    sessionAliasLookupKey: input.sessionAlias,
    dependencyRecordKey: null,
    command: parsed.command,
    receipt: null,
  };
  return enqueueRecord(record, input.ownerGeneration) as
    Promise<QueuedAssessmentSessionCommand>;
}

export async function enqueueAssessmentAttemptCommand(
  input: EnqueueAssessmentAttemptInput,
): Promise<QueuedAssessmentAttemptCommand> {
  if (
    "sessionId" in input.command
    || "formHash" in input.command
    || "deviceSequence" in input.command
    || "resetEpoch" in input.command
  ) {
    throw new Error(
      "Queued assessment attempts cannot provide server authority fields.",
    );
  }
  if (!boundedAlias(input.sessionAlias)) {
    throw new Error("Assessment-session alias is invalid.");
  }
  const dependency = await findAssessmentSessionByAlias(
    input.ownerGeneration,
    input.sessionAlias,
  );
  if (
    !dependency
    || dependency.status !== "acknowledged"
    || !await validAssessmentSessionAuthority(dependency)
  ) {
    throw new LearningCommandConflictError(
      "Assessment attempts require acknowledged session authority.",
    );
  }
  const authorityBinding = assessmentSessionAuthorityBinding(dependency)!;
  const item = authorityBinding.form.items.find((candidate) =>
    candidate.itemId === input.command.itemId
  );
  if (!item || item.itemVersion !== input.command.itemVersion) {
    throw new LearningCommandConflictError(
      "Assessment item is absent from the immutable form.",
    );
  }
  const deviceSequence = await allocateDeviceSequence();
  const resetEpoch = input.expectedResetEpoch;
  const parsed = parseRecordAssessmentAttemptCommand({
    ...input.command,
    deviceSequence,
    resetEpoch,
    sessionId: authorityBinding.sessionId,
    formHash: authorityBinding.formHash,
  });
  if (!parsed.ok) throw new Error(parsed.reason);
  const {
    sessionId: _sessionId,
    formHash: _formHash,
    ...command
  } = parsed.command;
  const requestHash = await sha256Hex({
    kind: "assessment-attempt",
    sessionAlias: input.sessionAlias,
    resetEpoch,
    command: input.command,
  });
  const record: QueuedAssessmentAttemptCommand = {
    ...baseRecord(
      input.ownerGeneration.ownerKey,
      command.idempotencyKey,
      requestHash,
      deviceSequence,
      resetEpoch,
      normalizedTime(input.enqueuedAt),
    ),
    kind: "assessment-attempt",
    sessionAlias: input.sessionAlias,
    dependencyRecordKey: dependency.recordKey,
    command,
    receipt: null,
  };
  return enqueueRecord(record, input.ownerGeneration) as
    Promise<QueuedAssessmentAttemptCommand>;
}

export async function enqueueAssessmentSessionSubmissionCommand(
  input: EnqueueAssessmentSessionSubmissionInput,
): Promise<QueuedAssessmentSessionSubmissionCommand> {
  if (
    "sessionId" in input.command
    || "formHash" in input.command
    || "deviceSequence" in input.command
    || "resetEpoch" in input.command
  ) {
    throw new Error(
      "Queued assessment submissions cannot provide server authority fields.",
    );
  }
  if (
    !boundedAlias(input.sessionAlias)
    || input.attemptCommandIds.length > 100
    || input.attemptCommandIds.some((commandId) =>
      commandId.length < 1 || commandId.length > 200
    )
  ) {
    throw new Error("Assessment submission dependencies are invalid.");
  }
  const uniqueCommandIds = [...new Set(input.attemptCommandIds)].sort();
  if (uniqueCommandIds.length !== input.attemptCommandIds.length) {
    throw new Error("Assessment submission dependencies must be unique.");
  }
  const dependency = await findAssessmentSessionByAlias(
    input.ownerGeneration,
    input.sessionAlias,
  );
  if (
    !dependency
    || dependency.status !== "acknowledged"
    || !await validAssessmentSessionAuthority(dependency)
  ) {
    throw new LearningCommandConflictError(
      "Assessment submission requires acknowledged session authority.",
    );
  }
  const authorityBinding = assessmentSessionAuthorityBinding(dependency)!;
  if (
    input.attemptCommandIds.length === 0
    && (
      dependency.kind !== "projected-assessment-session-anchor"
      || dependency.projectedAttempts.length
        !== authorityBinding.form.items.length
    )
  ) {
    throw new Error("Assessment submission dependencies are invalid.");
  }
  const deviceSequence = await allocateDeviceSequence();
  const resetEpoch = input.expectedResetEpoch;
  const parsed = parseSubmitAssessmentSessionCommand({
    ...input.command,
    deviceSequence,
    resetEpoch,
    sessionId: authorityBinding.sessionId,
    formHash: authorityBinding.formHash,
  });
  if (!parsed.ok) throw new Error(parsed.reason);
  const {
    sessionId: _sessionId,
    formHash: _formHash,
    ...command
  } = parsed.command;
  const requestHash = await sha256Hex({
    kind: "assessment-session-submit",
    sessionAlias: input.sessionAlias,
    attemptCommandIds: uniqueCommandIds,
    resetEpoch,
    command: input.command,
  });
  const record: QueuedAssessmentSessionSubmissionCommand = {
    ...baseRecord(
      input.ownerGeneration.ownerKey,
      command.idempotencyKey,
      requestHash,
      deviceSequence,
      resetEpoch,
      normalizedTime(input.enqueuedAt),
    ),
    kind: "assessment-session-submit",
    sessionAlias: input.sessionAlias,
    dependencyRecordKey: dependency.recordKey,
    attemptDependencyRecordKeys: uniqueCommandIds.map((commandId) =>
      recordKeyFor(input.ownerGeneration.ownerKey, commandId)
    ),
    command,
    receipt: null,
  };
  return enqueueRecord(record, input.ownerGeneration) as
    Promise<QueuedAssessmentSessionSubmissionCommand>;
}

export async function enqueueAssessmentSessionAbandonmentCommand(
  input: EnqueueAssessmentSessionAbandonmentInput,
): Promise<QueuedAssessmentSessionAbandonmentCommand> {
  if (
    "sessionId" in input.command
    || "formHash" in input.command
    || "deviceSequence" in input.command
    || "resetEpoch" in input.command
  ) {
    throw new Error(
      "Queued assessment abandonment cannot provide server authority fields.",
    );
  }
  if (
    !boundedAlias(input.sessionAlias)
    || input.dependencyCommandId.length < 1
    || input.dependencyCommandId.length > 200
  ) {
    throw new Error("Assessment abandonment dependency is invalid.");
  }
  const dependency = await findAssessmentSessionByAlias(
    input.ownerGeneration,
    input.sessionAlias,
  );
  if (
    !dependency
    || dependency.commandId !== input.dependencyCommandId
    || dependency.status !== "acknowledged"
    || !await validAssessmentSessionAuthority(dependency)
  ) {
    throw new LearningCommandConflictError(
      "Assessment abandonment dependency is absent or mismatched.",
    );
  }
  const authorityBinding = assessmentSessionAuthorityBinding(dependency)!;
  const deviceSequence = await allocateDeviceSequence();
  const resetEpoch = input.expectedResetEpoch;
  const parsed = parseAbandonAssessmentSessionCommand({
    ...input.command,
    deviceSequence,
    resetEpoch,
    sessionId: authorityBinding.sessionId,
    formHash: authorityBinding.formHash,
  });
  if (!parsed.ok) throw new Error(parsed.reason);
  const {
    sessionId: _sessionId,
    formHash: _formHash,
    ...command
  } = parsed.command;
  const requestHash = await sha256Hex({
    kind: "assessment-session-abandon",
    sessionAlias: input.sessionAlias,
    dependencyCommandId: input.dependencyCommandId,
    resetEpoch,
    command: input.command,
  });
  const record: QueuedAssessmentSessionAbandonmentCommand = {
    ...baseRecord(
      input.ownerGeneration.ownerKey,
      command.idempotencyKey,
      requestHash,
      deviceSequence,
      resetEpoch,
      normalizedTime(input.enqueuedAt),
    ),
    kind: "assessment-session-abandon",
    sessionAlias: input.sessionAlias,
    dependencyRecordKey: dependency.recordKey,
    command,
    receipt: null,
  };
  return enqueueRecord(record, input.ownerGeneration) as
    Promise<QueuedAssessmentSessionAbandonmentCommand>;
}

const queuedReaderSessionOpenCommand = (
  command: OpenReaderSessionCommandV1,
): ReaderSessionOpenQueueCommandV1 => {
  const {
    deviceSequence: _deviceSequence,
    resetEpoch: _resetEpoch,
    ...queued
  } = command;
  return queued;
};

const queuedReaderAttemptCommand = (
  command: RecordReaderAttemptCommandV1,
): ReaderAttemptQueueCommandV1 => {
  const {
    deviceSequence: _deviceSequence,
    resetEpoch: _resetEpoch,
    sessionId: _sessionId,
    formHash: _formHash,
    ...queued
  } = command;
  return queued;
};

const queuedReaderSessionSubmissionCommand = (
  command: SubmitReaderSessionCommandV1,
): ReaderSessionSubmissionQueueCommandV1 => {
  const {
    deviceSequence: _deviceSequence,
    resetEpoch: _resetEpoch,
    sessionId: _sessionId,
    formHash: _formHash,
    ...queued
  } = command;
  return queued;
};

const queuedReaderSessionAbandonmentCommand = (
  command: AbandonReaderSessionCommandV1,
): ReaderSessionAbandonmentQueueCommandV1 => {
  const {
    deviceSequence: _deviceSequence,
    resetEpoch: _resetEpoch,
    sessionId: _sessionId,
    formHash: _formHash,
    ...queued
  } = command;
  return queued;
};

const readerSessionOpenRequestHash = (
  sessionAlias: string,
  supportDowngradeDependencyCommandId: string | null,
  resetEpoch: number,
  command: ReaderSessionOpenQueueCommandV1,
) => sha256Hex({
  kind: "reader-session-open",
  sessionAlias,
  supportDowngradeDependencyCommandId,
  resetEpoch,
  command,
});

const readerAttemptRequestHash = (
  sessionAlias: string,
  resetEpoch: number,
  command: ReaderAttemptQueueCommandV1,
) => sha256Hex({
  kind: "reader-attempt",
  sessionAlias,
  resetEpoch,
  command,
});

const readerSessionSubmissionRequestHash = (
  sessionAlias: string,
  attemptCommandIds: readonly string[],
  resetEpoch: number,
  command: ReaderSessionSubmissionQueueCommandV1,
) => sha256Hex({
  kind: "reader-session-submit",
  sessionAlias,
  attemptCommandIds,
  resetEpoch,
  command,
});

const readerSessionAbandonmentRequestHash = (
  sessionAlias: string,
  dependencyCommandId: string,
  resetEpoch: number,
  command: ReaderSessionAbandonmentQueueCommandV1,
) => sha256Hex({
  kind: "reader-session-abandon",
  sessionAlias,
  dependencyCommandId,
  resetEpoch,
  command,
});

const validReaderRecordEnvelope = (
  record:
    | QueuedReaderSessionCommand
    | QueuedReaderAttemptCommand
    | QueuedReaderSessionSubmissionCommand
    | QueuedReaderSessionAbandonmentCommand,
  command: {
    idempotencyKey: string;
    deviceSequence: number;
    resetEpoch: number;
  },
) =>
  record.outboxVersion === LEARNING_COMMAND_OUTBOX_VERSION
  && record.recordKey === recordKeyFor(record.ownerKey, record.commandId)
  && record.commandId === command.idempotencyKey
  && record.deviceSequence === command.deviceSequence
  && record.resetEpoch === command.resetEpoch
  && boundedAlias(record.sessionAlias)
  && record.receipt === null
  && (
    record.kind === "reader-session-open"
      ? record.sessionAliasLookupKey === record.sessionAlias
      : !("sessionAliasLookupKey" in record)
  );

export async function enqueueReaderSessionCommand(
  input: EnqueueReaderSessionInput,
): Promise<QueuedReaderSessionCommand> {
  const supportDependencyCommandId =
    input.supportDowngradeDependencyCommandId;
  if (
    !boundedAlias(input.sessionAlias)
    || (
      supportDependencyCommandId !== undefined
      && (
        supportDependencyCommandId.length < 1
        || supportDependencyCommandId.length > 200
      )
    )
    || (
      supportDependencyCommandId !== undefined
      && input.command.supportMode !== "assisted"
    )
  ) {
    throw new Error("Reader-session alias is invalid.");
  }
  const supportDependency = supportDependencyCommandId === undefined
    ? null
    : (await listLearningCommandRecords(input.ownerGeneration)).find(
        (record): record is QueuedReaderSessionAbandonmentCommand =>
          record.kind === "reader-session-abandon"
          && record.commandId === supportDependencyCommandId,
      ) ?? null;
  if (supportDependencyCommandId !== undefined && !supportDependency) {
    throw new LearningCommandConflictError(
      "Reader support downgrade dependency is absent.",
    );
  }
  const deviceSequence = await allocateDeviceSequence();
  const resetEpoch = input.expectedResetEpoch;
  const parsed = parseOpenReaderSessionCommand({
    ...input.command,
    deviceSequence,
    resetEpoch,
  });
  if (!parsed.ok) throw new Error(parsed.reason);
  const requestHash = await readerSessionOpenRequestHash(
    input.sessionAlias,
    supportDependencyCommandId ?? null,
    resetEpoch,
    queuedReaderSessionOpenCommand(parsed.command),
  );
  const record: QueuedReaderSessionCommand = {
    ...baseRecord(
      input.ownerGeneration.ownerKey,
      parsed.command.idempotencyKey,
      requestHash,
      deviceSequence,
      resetEpoch,
      normalizedTime(input.enqueuedAt),
    ),
    kind: "reader-session-open",
    sessionAlias: input.sessionAlias,
    sessionAliasLookupKey: input.sessionAlias,
    dependencyRecordKey: supportDependency?.recordKey ?? null,
    command: parsed.command,
    receipt: null,
  };
  return enqueueRecord(record, input.ownerGeneration) as
    Promise<QueuedReaderSessionCommand>;
}

export async function enqueueReaderAttemptCommand(
  input: EnqueueReaderAttemptInput,
): Promise<QueuedReaderAttemptCommand> {
  if (
    "sessionId" in input.command
    || "formHash" in input.command
    || "deviceSequence" in input.command
    || "resetEpoch" in input.command
  ) {
    throw new Error(
      "Queued Reader attempts cannot provide server authority fields.",
    );
  }
  if (!boundedAlias(input.sessionAlias)) {
    throw new Error("Reader-session alias is invalid.");
  }
  const dependency = await findReaderSessionByAlias(
    input.ownerGeneration,
    input.sessionAlias,
  );
  if (
    !dependency
    || dependency.status !== "acknowledged"
    || !await validReaderSessionAuthority(dependency)
  ) {
    throw new LearningCommandConflictError(
      "Reader attempts require acknowledged session authority.",
    );
  }
  const authorityBinding = readerSessionAuthorityBinding(dependency)!;
  const item = authorityBinding.form.items[input.command.position];
  if (
    !item
    || item.itemId !== input.command.itemId
    || item.itemVersion !== input.command.itemVersion
    || !item.options.includes(input.command.selectedOption)
  ) {
    throw new LearningCommandConflictError(
      "Reader item is absent from the immutable form.",
    );
  }
  const deviceSequence = await allocateDeviceSequence();
  const resetEpoch = input.expectedResetEpoch;
  const parsed = parseRecordReaderAttemptCommand({
    ...input.command,
    deviceSequence,
    resetEpoch,
    sessionId: authorityBinding.sessionId,
    formHash: authorityBinding.formHash,
  });
  if (!parsed.ok) throw new Error(parsed.reason);
  const {
    sessionId: _sessionId,
    formHash: _formHash,
    ...command
  } = parsed.command;
  const requestHash = await readerAttemptRequestHash(
    input.sessionAlias,
    resetEpoch,
    queuedReaderAttemptCommand(parsed.command),
  );
  const record: QueuedReaderAttemptCommand = {
    ...baseRecord(
      input.ownerGeneration.ownerKey,
      command.idempotencyKey,
      requestHash,
      deviceSequence,
      resetEpoch,
      normalizedTime(input.enqueuedAt),
    ),
    kind: "reader-attempt",
    sessionAlias: input.sessionAlias,
    dependencyRecordKey: dependency.recordKey,
    command,
    receipt: null,
  };
  return enqueueRecord(record, input.ownerGeneration) as
    Promise<QueuedReaderAttemptCommand>;
}

export async function enqueueReaderSessionSubmissionCommand(
  input: EnqueueReaderSessionSubmissionInput,
): Promise<QueuedReaderSessionSubmissionCommand> {
  if (
    "sessionId" in input.command
    || "formHash" in input.command
    || "deviceSequence" in input.command
    || "resetEpoch" in input.command
  ) {
    throw new Error(
      "Queued Reader submissions cannot provide server authority fields.",
    );
  }
  if (
    !boundedAlias(input.sessionAlias)
    || input.attemptCommandIds.length > MAX_READER_FORM_ITEMS
    || input.attemptCommandIds.some((commandId) =>
      commandId.length < 1 || commandId.length > 200
    )
  ) {
    throw new Error("Reader submission dependencies are invalid.");
  }
  const uniqueCommandIds = [...new Set(input.attemptCommandIds)].sort();
  if (uniqueCommandIds.length !== input.attemptCommandIds.length) {
    throw new Error("Reader submission dependencies must be unique.");
  }
  const dependency = await findReaderSessionByAlias(
    input.ownerGeneration,
    input.sessionAlias,
  );
  if (
    !dependency
    || dependency.status !== "acknowledged"
    || !await validReaderSessionAuthority(dependency)
  ) {
    throw new LearningCommandConflictError(
      "Reader submission requires acknowledged session authority.",
    );
  }
  const authorityBinding = readerSessionAuthorityBinding(dependency)!;
  if (
    input.command.expectedItemCount !== authorityBinding.expectedItemCount
    || (
      input.attemptCommandIds.length === 0
      && (
        dependency.kind !== "projected-reader-session-anchor"
        || dependency.projectedAttempts.length
          !== authorityBinding.form.items.length
      )
    )
  ) {
    throw new Error("Reader submission dependencies are invalid.");
  }
  const deviceSequence = await allocateDeviceSequence();
  const resetEpoch = input.expectedResetEpoch;
  const parsed = parseSubmitReaderSessionCommand({
    ...input.command,
    deviceSequence,
    resetEpoch,
    sessionId: authorityBinding.sessionId,
    formHash: authorityBinding.formHash,
  });
  if (!parsed.ok) throw new Error(parsed.reason);
  const {
    sessionId: _sessionId,
    formHash: _formHash,
    ...command
  } = parsed.command;
  const requestHash = await readerSessionSubmissionRequestHash(
    input.sessionAlias,
    uniqueCommandIds,
    resetEpoch,
    queuedReaderSessionSubmissionCommand(parsed.command),
  );
  const record: QueuedReaderSessionSubmissionCommand = {
    ...baseRecord(
      input.ownerGeneration.ownerKey,
      command.idempotencyKey,
      requestHash,
      deviceSequence,
      resetEpoch,
      normalizedTime(input.enqueuedAt),
    ),
    kind: "reader-session-submit",
    sessionAlias: input.sessionAlias,
    dependencyRecordKey: dependency.recordKey,
    attemptDependencyRecordKeys: uniqueCommandIds.map((commandId) =>
      recordKeyFor(input.ownerGeneration.ownerKey, commandId)
    ),
    command,
    receipt: null,
  };
  return enqueueRecord(record, input.ownerGeneration) as
    Promise<QueuedReaderSessionSubmissionCommand>;
}

export async function enqueueReaderSessionAbandonmentCommand(
  input: EnqueueReaderSessionAbandonmentInput,
): Promise<QueuedReaderSessionAbandonmentCommand> {
  if (
    "sessionId" in input.command
    || "formHash" in input.command
    || "deviceSequence" in input.command
    || "resetEpoch" in input.command
  ) {
    throw new Error(
      "Queued Reader abandonment cannot provide server authority fields.",
    );
  }
  if (
    !boundedAlias(input.sessionAlias)
    || input.dependencyCommandId.length < 1
    || input.dependencyCommandId.length > 200
  ) {
    throw new Error("Reader abandonment dependency is invalid.");
  }
  const dependency = await findReaderSessionByAlias(
    input.ownerGeneration,
    input.sessionAlias,
  );
  if (
    !dependency
    || dependency.commandId !== input.dependencyCommandId
    || dependency.status !== "acknowledged"
    || !await validReaderSessionAuthority(dependency)
  ) {
    throw new LearningCommandConflictError(
      "Reader abandonment dependency is absent or mismatched.",
    );
  }
  const authorityBinding = readerSessionAuthorityBinding(dependency)!;
  const deviceSequence = await allocateDeviceSequence();
  const resetEpoch = input.expectedResetEpoch;
  const parsed = parseAbandonReaderSessionCommand({
    ...input.command,
    deviceSequence,
    resetEpoch,
    sessionId: authorityBinding.sessionId,
    formHash: authorityBinding.formHash,
  });
  if (!parsed.ok) throw new Error(parsed.reason);
  const {
    sessionId: _sessionId,
    formHash: _formHash,
    ...command
  } = parsed.command;
  const requestHash = await readerSessionAbandonmentRequestHash(
    input.sessionAlias,
    input.dependencyCommandId,
    resetEpoch,
    queuedReaderSessionAbandonmentCommand(parsed.command),
  );
  const record: QueuedReaderSessionAbandonmentCommand = {
    ...baseRecord(
      input.ownerGeneration.ownerKey,
      command.idempotencyKey,
      requestHash,
      deviceSequence,
      resetEpoch,
      normalizedTime(input.enqueuedAt),
    ),
    kind: "reader-session-abandon",
    sessionAlias: input.sessionAlias,
    dependencyRecordKey: dependency.recordKey,
    command,
    receipt: null,
  };
  return enqueueRecord(record, input.ownerGeneration) as
    Promise<QueuedReaderSessionAbandonmentCommand>;
}

const projectedAttemptsMatchBinding = (
  attempts: readonly ActiveLessonAttemptProjectionV1[],
  binding: LessonSessionAuthorityBindingV1,
) => {
  if (attempts.length > binding.form.activities.length) return false;
  const attemptIds = new Set<string>();
  const evidenceIds = new Set<string>();
  const activityIds = new Set<string>();
  return attempts.every((attempt) => {
    const activity = binding.form.activities.find((candidate) =>
      candidate.activityId === attempt.activityId
    );
    if (
      !activity
      || activity.activityVersion !== attempt.activityVersion
      || activity.method !== attempt.method
      || activity.skill !== attempt.skill
      || attempt.source !== "lesson"
      || (
        (attempt.outcome === "correct" && attempt.score !== 100)
        || (attempt.outcome === "incorrect" && attempt.score !== 0)
      )
      || attempt.gateEligible !== (!attempt.usedHint && !attempt.priorExposure)
      || attemptIds.has(attempt.attemptId)
      || evidenceIds.has(attempt.evidenceId)
      || activityIds.has(attempt.activityId)
    ) return false;
    attemptIds.add(attempt.attemptId);
    evidenceIds.add(attempt.evidenceId);
    activityIds.add(attempt.activityId);
    return true;
  });
};

/**
 * Low-level persistence boundary used only after a projection has been read
 * and strictly validated by projectedLessonSessionAdoption. This transaction
 * rechecks owner/reset scope and atomically enforces alias/session uniqueness.
 */
export async function deriveProjectedLessonSessionAnchorIdentity(input: {
  ownerGeneration: OwnerGeneration;
  resetEpoch: number;
  sessionId: string;
  formHash: string;
  installationId: string;
  deviceId: string;
  activityCount: number;
}): Promise<ProjectedLessonSessionAnchorIdentity> {
  const adoptionDigest = await sha256Hex({
    schemaVersion: 1,
    ownerKey: input.ownerGeneration.ownerKey,
    generation: input.ownerGeneration.generation,
    resetEpoch: input.resetEpoch,
    sessionId: input.sessionId,
    formHash: input.formHash,
    installationId: input.installationId,
    deviceId: input.deviceId,
  });
  const commandSeed = `projected-session-anchor:${adoptionDigest}`;
  const ids = await deriveStableNormalizedLessonCommandIds(
    commandSeed,
    input.activityCount,
  );
  return { commandSeed, sessionAlias: ids.sessionAlias };
}

export async function persistProjectedLessonSessionAnchor(
  input: PersistProjectedLessonSessionAnchorInput,
): Promise<QueuedProjectedLessonSessionAnchor> {
  const adoptedAt = normalizedTime(input.adoptedAt);
  if (
    input.installationId.length < 1
    || input.installationId.length > 160
    || input.deviceId.length < 1
    || input.deviceId.length > 160
    || !Number.isSafeInteger(input.resetEpoch)
    || input.resetEpoch < 0
    || !Number.isSafeInteger(input.projectionCursor)
    || input.projectionCursor < 0
    || input.manifestSha256 !== CURRENT_CONTENT_MANIFEST_SHA256
    || input.binding.contentVersion !== CONTENT_VERSION
    || input.binding.resetEpoch !== input.resetEpoch
    || input.binding.status !== "started"
    || input.binding.expectedEvidenceCount
      !== input.binding.form.activities.length
    || input.binding.expectedEvidenceCount < 1
    || input.binding.expectedEvidenceCount > 100
    || await hashLessonSessionForm(input.binding.form) !== input.binding.formHash
    || !projectedAttemptsMatchBinding(
      input.projectedAttempts,
      input.binding,
    )
  ) {
    throw new Error("Projected lesson-session authority binding is invalid.");
  }
  const identity = await deriveProjectedLessonSessionAnchorIdentity({
    ownerGeneration: input.ownerGeneration,
    resetEpoch: input.resetEpoch,
    sessionId: input.binding.sessionId,
    formHash: input.binding.formHash,
    installationId: input.installationId,
    deviceId: input.deviceId,
    activityCount: input.binding.form.activities.length,
  });
  const adoptionKey = identity.commandSeed;
  const deviceSequence = await allocateDeviceSequence();
  const command: ProjectedLessonSessionAnchorCommandV1 = {
    schemaVersion: 1,
    adoptionKey,
    installationId: input.installationId,
    deviceId: input.deviceId,
    resetEpoch: input.resetEpoch,
    contentVersion: CONTENT_VERSION,
    manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
    projectionCursor: input.projectionCursor,
  };
  const requestHash = await sha256Hex({
    kind: "projected-lesson-session-anchor",
    sessionAlias: identity.sessionAlias,
    command,
    binding: input.binding,
    projectedAttempts: input.projectedAttempts,
  });
  const record: QueuedProjectedLessonSessionAnchor = {
    ...baseRecord(
      input.ownerGeneration.ownerKey,
      adoptionKey,
      requestHash,
      deviceSequence,
      input.resetEpoch,
      adoptedAt,
    ),
    kind: "projected-lesson-session-anchor",
    sessionAlias: identity.sessionAlias,
    sessionAliasLookupKey: identity.sessionAlias,
    dependencyRecordKey: null,
    status: "acknowledged",
    acknowledgedAt: adoptedAt,
    command,
    binding: structuredClone(input.binding),
    projectedAttempts: structuredClone(input.projectedAttempts),
    receipt: null,
  };
  return enqueueRecord(record, input.ownerGeneration) as
    Promise<QueuedProjectedLessonSessionAnchor>;
}

export async function deriveProjectedAssessmentSessionAnchorIdentity(input: {
  ownerGeneration: OwnerGeneration;
  resetEpoch: number;
  sessionId: string;
  formHash: string;
  itemCount: number;
}): Promise<ProjectedAssessmentSessionAnchorIdentity> {
  const adoptionDigest = await sha256Hex({
    schemaVersion: 1,
    scope: "projected-assessment-session-anchor",
    ownerKey: input.ownerGeneration.ownerKey,
    resetEpoch: input.resetEpoch,
    sessionId: input.sessionId,
    formHash: input.formHash,
  });
  const commandSeed = `projected-assessment-anchor:${adoptionDigest}`;
  const ids = await deriveStableNormalizedAssessmentCommandIds(
    commandSeed,
    input.itemCount,
  );
  return { commandSeed, sessionAlias: ids.sessionAlias };
}

const projectedAssessmentAttemptSetExtends = (
  previous: readonly ActiveAssessmentAttemptProjectionV2[],
  next: readonly ActiveAssessmentAttemptProjectionV2[],
) => {
  if (next.length < previous.length) return false;
  const nextByAttemptId = new Map(
    next.map((attempt) => [attempt.attemptId, attempt]),
  );
  return previous.every((attempt) => {
    const candidate = nextByAttemptId.get(attempt.attemptId);
    return candidate !== undefined
      && canonicalStringify(candidate) === canonicalStringify(attempt);
  });
};

const replaceProjectedAssessmentSessionAnchor = async (
  expected: QueuedProjectedAssessmentSessionAnchor,
  replacement: QueuedProjectedAssessmentSessionAnchor,
  ownerGeneration: OwnerGeneration,
) => {
  const database = await openSyncDatabase();
  const transaction = database.transaction(
    [SYNC_META_STORE, SYNC_DOCUMENT_STORE, LEARNING_COMMAND_OUTBOX_STORE],
    "readwrite",
  );
  const done = transactionDone(transaction);
  try {
    await assertOwnerGeneration(transaction, ownerGeneration);
    await assertOwnerResetEpoch(
      transaction,
      ownerGeneration.ownerKey,
      replacement.resetEpoch,
    );
    const store = transaction.objectStore(LEARNING_COMMAND_OUTBOX_STORE);
    const current = await requestResult(
      store.get(expected.recordKey) as IDBRequest<
        LearningCommandOutboxRecord | undefined
      >,
    );
    if (
      !current
      || current.kind !== "projected-assessment-session-anchor"
      || current.requestHash !== expected.requestHash
      || current.command.projectionCursor
        !== expected.command.projectionCursor
      || canonicalStringify(current.projectedAttempts)
        !== canonicalStringify(expected.projectedAttempts)
      || replacement.recordKey !== current.recordKey
      || replacement.commandId !== current.commandId
      || replacement.sessionAlias !== current.sessionAlias
    ) {
      throw new LearningCommandConflictError(
        "Projected assessment session changed during adoption.",
      );
    }
    store.put(replacement);
    await done;
    notifyLearningCommandQueueChanged(replacement.ownerKey);
    return replacement;
  } catch (error) {
    abortTransaction(transaction);
    await done.catch(() => undefined);
    throw error;
  }
};

/**
 * Persists answer-free authority from a strictly parsed projection. The
 * anchor is local-only and must never be delivered as a synthetic open call.
 * Re-adoption transactionally advances the cursor and an immutable attempt
 * superset; owner generation remains a write fence, not logical identity.
 */
export async function persistProjectedAssessmentSessionAnchor(
  input: PersistProjectedAssessmentSessionAnchorInput,
): Promise<QueuedProjectedAssessmentSessionAnchor> {
  const adoptedAt = normalizedTime(input.adoptedAt);
  if (
    input.installationId.length < 1
    || input.installationId.length > 160
    || input.deviceId.length < 1
    || input.deviceId.length > 160
    || !Number.isSafeInteger(input.resetEpoch)
    || input.resetEpoch < 0
    || !Number.isSafeInteger(input.projectionCursor)
    || input.projectionCursor < 0
    || input.manifestSha256 !== CURRENT_CONTENT_MANIFEST_SHA256
    || input.binding.contentVersion !== CONTENT_VERSION
    || input.binding.resetEpoch !== input.resetEpoch
    || input.binding.status !== "started"
    || input.binding.expectedItemCount !== input.binding.form.items.length
    || input.binding.expectedItemCount < 1
    || input.binding.expectedItemCount > MAX_ASSESSMENT_FORM_ITEMS
    || !isExactAssessmentFormV1(
      input.binding.form,
      input.binding.expectedItemCount,
    )
    || await hashAssessmentForm(input.binding.form) !== input.binding.formHash
    || !projectedAssessmentAttemptsMatchBinding(
      input.projectedAttempts,
      input.binding,
    )
  ) {
    throw new Error(
      "Projected assessment-session authority binding is invalid.",
    );
  }
  const records = await listLearningCommandRecords(input.ownerGeneration);
  const sameServerSession = records.filter(
    (
      record,
    ): record is
      | QueuedProjectedAssessmentSessionAnchor
      | QueuedAssessmentSessionCommand =>
      (
        record.kind === "projected-assessment-session-anchor"
        && record.binding.sessionId === input.binding.sessionId
      )
      || (
        record.kind === "assessment-session-open"
        && record.receipt?.sessionId === input.binding.sessionId
      ),
  );
  if (sameServerSession.length > 1) {
    throw new LearningCommandConflictError(
      "Server assessment session has multiple local authority records.",
    );
  }
  const existing = sameServerSession[0] ?? null;
  if (existing?.kind === "assessment-session-open") {
    throw new LearningCommandConflictError(
      "Server assessment session already has a local open receipt.",
    );
  }
  if (existing) {
    if (
      existing.ownerKey !== input.ownerGeneration.ownerKey
      || existing.resetEpoch !== input.resetEpoch
      || existing.status !== "acknowledged"
      || canonicalStringify(existing.binding)
        !== canonicalStringify(input.binding)
      || input.projectionCursor < existing.command.projectionCursor
      || !projectedAssessmentAttemptSetExtends(
        existing.projectedAttempts,
        input.projectedAttempts,
      )
      || records.some((record) =>
        (
          record.kind === "assessment-session-submit"
          || record.kind === "assessment-session-abandon"
        )
        && record.dependencyRecordKey === existing.recordKey
      )
    ) {
      throw new LearningCommandConflictError(
        "Projected assessment session cannot be refreshed safely.",
      );
    }
    const attemptsUnchanged =
      existing.projectedAttempts.length === input.projectedAttempts.length;
    if (
      input.projectionCursor === existing.command.projectionCursor
      && attemptsUnchanged
    ) return existing;
    if (input.projectionCursor === existing.command.projectionCursor) {
      throw new LearningCommandConflictError(
        "One assessment projection cursor described conflicting attempts.",
      );
    }
    const command: ProjectedAssessmentSessionAnchorCommandV1 = {
      ...existing.command,
      projectionCursor: input.projectionCursor,
    };
    const requestHash = await sha256Hex({
      kind: "projected-assessment-session-anchor",
      sessionAlias: existing.sessionAlias,
      command,
      binding: input.binding,
      projectedAttempts: input.projectedAttempts,
    });
    const replacement: QueuedProjectedAssessmentSessionAnchor = {
      ...existing,
      requestHash,
      command,
      binding: structuredClone(input.binding),
      projectedAttempts: structuredClone(input.projectedAttempts),
    };
    if (!await validAssessmentSessionAuthority(replacement)) {
      throw new Error(
        "Projected assessment-session authority binding is invalid.",
      );
    }
    return replaceProjectedAssessmentSessionAnchor(
      existing,
      replacement,
      input.ownerGeneration,
    );
  }
  const identity = await deriveProjectedAssessmentSessionAnchorIdentity({
    ownerGeneration: input.ownerGeneration,
    resetEpoch: input.resetEpoch,
    sessionId: input.binding.sessionId,
    formHash: input.binding.formHash,
    itemCount: input.binding.form.items.length,
  });
  const deviceSequence = await allocateDeviceSequence();
  const command: ProjectedAssessmentSessionAnchorCommandV1 = {
    schemaVersion: 1,
    adoptionKey: identity.commandSeed,
    installationId: input.installationId,
    deviceId: input.deviceId,
    resetEpoch: input.resetEpoch,
    contentVersion: CONTENT_VERSION,
    manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
    projectionCursor: input.projectionCursor,
  };
  const requestHash = await sha256Hex({
    kind: "projected-assessment-session-anchor",
    sessionAlias: identity.sessionAlias,
    command,
    binding: input.binding,
    projectedAttempts: input.projectedAttempts,
  });
  const record: QueuedProjectedAssessmentSessionAnchor = {
    ...baseRecord(
      input.ownerGeneration.ownerKey,
      identity.commandSeed,
      requestHash,
      deviceSequence,
      input.resetEpoch,
      adoptedAt,
    ),
    kind: "projected-assessment-session-anchor",
    sessionAlias: identity.sessionAlias,
    sessionAliasLookupKey: identity.sessionAlias,
    dependencyRecordKey: null,
    status: "acknowledged",
    acknowledgedAt: adoptedAt,
    command,
    binding: structuredClone(input.binding),
    projectedAttempts: structuredClone(input.projectedAttempts),
    receipt: null,
  };
  if (!await validAssessmentSessionAuthority(record)) {
    throw new Error(
      "Projected assessment-session authority binding is invalid.",
    );
  }
  return enqueueRecord(record, input.ownerGeneration) as
    Promise<QueuedProjectedAssessmentSessionAnchor>;
}

export async function deriveProjectedReaderSessionAnchorIdentity(input: {
  ownerGeneration: OwnerGeneration;
  resetEpoch: number;
  sessionId: string;
  formHash: string;
  itemCount: number;
}): Promise<ProjectedReaderSessionAnchorIdentity> {
  const adoptionDigest = await sha256Hex({
    schemaVersion: 1,
    scope: "projected-reader-session-anchor",
    ownerKey: input.ownerGeneration.ownerKey,
    resetEpoch: input.resetEpoch,
    sessionId: input.sessionId,
    formHash: input.formHash,
  });
  const commandSeed = `projected-reader-anchor:${adoptionDigest}`;
  const ids = await deriveStableNormalizedReaderCommandIds(
    commandSeed,
    input.itemCount,
  );
  return { commandSeed, sessionAlias: ids.sessionAlias };
}

const projectedReaderAttemptSetExtends = (
  previous: readonly ActiveReaderAttemptProjectionV3[],
  next: readonly ActiveReaderAttemptProjectionV3[],
) => {
  if (next.length < previous.length) return false;
  const nextByAttemptId = new Map(
    next.map((attempt) => [attempt.attemptId, attempt]),
  );
  return previous.every((attempt) => {
    const candidate = nextByAttemptId.get(attempt.attemptId);
    return candidate !== undefined
      && canonicalStringify(candidate) === canonicalStringify(attempt);
  });
};

const replaceProjectedReaderSessionAnchor = async (
  expected: QueuedProjectedReaderSessionAnchor,
  replacement: QueuedProjectedReaderSessionAnchor,
  ownerGeneration: OwnerGeneration,
) => {
  const database = await openSyncDatabase();
  const transaction = database.transaction(
    [SYNC_META_STORE, SYNC_DOCUMENT_STORE, LEARNING_COMMAND_OUTBOX_STORE],
    "readwrite",
  );
  const done = transactionDone(transaction);
  try {
    await assertOwnerGeneration(transaction, ownerGeneration);
    await assertOwnerResetEpoch(
      transaction,
      ownerGeneration.ownerKey,
      replacement.resetEpoch,
    );
    const store = transaction.objectStore(LEARNING_COMMAND_OUTBOX_STORE);
    const current = await requestResult(
      store.get(expected.recordKey) as IDBRequest<
        LearningCommandOutboxRecord | undefined
      >,
    );
    if (
      !current
      || current.kind !== "projected-reader-session-anchor"
      || current.requestHash !== expected.requestHash
      || current.command.projectionCursor
        !== expected.command.projectionCursor
      || canonicalStringify(current.projectedAttempts)
        !== canonicalStringify(expected.projectedAttempts)
      || replacement.recordKey !== current.recordKey
      || replacement.commandId !== current.commandId
      || replacement.sessionAlias !== current.sessionAlias
    ) {
      throw new LearningCommandConflictError(
        "Projected Reader session changed during adoption.",
      );
    }
    store.put(replacement);
    await done;
    notifyLearningCommandQueueChanged(replacement.ownerKey);
    return replacement;
  } catch (error) {
    abortTransaction(transaction);
    await done.catch(() => undefined);
    throw error;
  }
};

/**
 * Persists answer-free Reader authority from a strictly parsed projection.
 * Re-adoption may only advance the cursor and append immutable attempts.
 */
export async function persistProjectedReaderSessionAnchor(
  input: PersistProjectedReaderSessionAnchorInput,
): Promise<QueuedProjectedReaderSessionAnchor> {
  const adoptedAt = normalizedTime(input.adoptedAt);
  if (
    input.installationId.length < 1
    || input.installationId.length > 160
    || input.deviceId.length < 1
    || input.deviceId.length > 160
    || !Number.isSafeInteger(input.resetEpoch)
    || input.resetEpoch < 0
    || !Number.isSafeInteger(input.projectionCursor)
    || input.projectionCursor < 0
    || input.manifestSha256 !== CURRENT_CONTENT_MANIFEST_SHA256
    || input.binding.contentVersion !== CONTENT_VERSION
    || input.binding.resetEpoch !== input.resetEpoch
    || input.binding.status !== "started"
    || input.binding.expectedItemCount !== input.binding.form.items.length
    || !isExactReaderSessionFormV1(
      input.binding.form,
      input.binding.expectedItemCount,
    )
    || await hashReaderSessionForm(input.binding.form)
      !== input.binding.formHash
    || !projectedReaderAttemptsMatchBinding(
      input.projectedAttempts,
      input.binding,
    )
  ) {
    throw new Error(
      "Projected Reader-session authority binding is invalid.",
    );
  }
  const records = await listLearningCommandRecords(input.ownerGeneration);
  const sameServerSession = records.filter(
    (
      record,
    ): record is
      | QueuedProjectedReaderSessionAnchor
      | QueuedReaderSessionCommand =>
      (
        record.kind === "projected-reader-session-anchor"
        && record.binding.sessionId === input.binding.sessionId
      )
      || (
        record.kind === "reader-session-open"
        && record.receipt?.sessionId === input.binding.sessionId
      ),
  );
  if (sameServerSession.length > 1) {
    throw new LearningCommandConflictError(
      "Server Reader session has multiple local authority records.",
    );
  }
  const existing = sameServerSession[0] ?? null;
  if (existing?.kind === "reader-session-open") {
    throw new LearningCommandConflictError(
      "Server Reader session already has a local open receipt.",
    );
  }
  if (existing) {
    if (
      existing.ownerKey !== input.ownerGeneration.ownerKey
      || existing.resetEpoch !== input.resetEpoch
      || existing.status !== "acknowledged"
      || canonicalStringify(existing.binding)
        !== canonicalStringify(input.binding)
      || input.projectionCursor < existing.command.projectionCursor
      || !projectedReaderAttemptSetExtends(
        existing.projectedAttempts,
        input.projectedAttempts,
      )
      || records.some((record) =>
        (
          record.kind === "reader-session-submit"
          || record.kind === "reader-session-abandon"
        )
        && record.dependencyRecordKey === existing.recordKey
      )
    ) {
      throw new LearningCommandConflictError(
        "Projected Reader session cannot be refreshed safely.",
      );
    }
    const attemptsUnchanged =
      existing.projectedAttempts.length === input.projectedAttempts.length;
    if (
      input.projectionCursor === existing.command.projectionCursor
      && attemptsUnchanged
    ) return existing;
    if (input.projectionCursor === existing.command.projectionCursor) {
      throw new LearningCommandConflictError(
        "One Reader projection cursor described conflicting attempts.",
      );
    }
    const command: ProjectedReaderSessionAnchorCommandV1 = {
      ...existing.command,
      projectionCursor: input.projectionCursor,
    };
    const requestHash = await sha256Hex({
      kind: "projected-reader-session-anchor",
      sessionAlias: existing.sessionAlias,
      command,
      binding: input.binding,
      projectedAttempts: input.projectedAttempts,
    });
    const replacement: QueuedProjectedReaderSessionAnchor = {
      ...existing,
      requestHash,
      command,
      binding: structuredClone(input.binding),
      projectedAttempts: structuredClone(input.projectedAttempts),
    };
    if (!await validReaderSessionAuthority(replacement)) {
      throw new Error(
        "Projected Reader-session authority binding is invalid.",
      );
    }
    return replaceProjectedReaderSessionAnchor(
      existing,
      replacement,
      input.ownerGeneration,
    );
  }
  const identity = await deriveProjectedReaderSessionAnchorIdentity({
    ownerGeneration: input.ownerGeneration,
    resetEpoch: input.resetEpoch,
    sessionId: input.binding.sessionId,
    formHash: input.binding.formHash,
    itemCount: input.binding.form.items.length,
  });
  const deviceSequence = await allocateDeviceSequence();
  const command: ProjectedReaderSessionAnchorCommandV1 = {
    schemaVersion: 1,
    adoptionKey: identity.commandSeed,
    installationId: input.installationId,
    deviceId: input.deviceId,
    resetEpoch: input.resetEpoch,
    contentVersion: CONTENT_VERSION,
    manifestSha256: CURRENT_CONTENT_MANIFEST_SHA256,
    projectionCursor: input.projectionCursor,
  };
  const requestHash = await sha256Hex({
    kind: "projected-reader-session-anchor",
    sessionAlias: identity.sessionAlias,
    command,
    binding: input.binding,
    projectedAttempts: input.projectedAttempts,
  });
  const record: QueuedProjectedReaderSessionAnchor = {
    ...baseRecord(
      input.ownerGeneration.ownerKey,
      identity.commandSeed,
      requestHash,
      deviceSequence,
      input.resetEpoch,
      adoptedAt,
    ),
    kind: "projected-reader-session-anchor",
    sessionAlias: identity.sessionAlias,
    sessionAliasLookupKey: identity.sessionAlias,
    dependencyRecordKey: null,
    status: "acknowledged",
    acknowledgedAt: adoptedAt,
    command,
    binding: structuredClone(input.binding),
    projectedAttempts: structuredClone(input.projectedAttempts),
    receipt: null,
  };
  if (!await validReaderSessionAuthority(record)) {
    throw new Error(
      "Projected Reader-session authority binding is invalid.",
    );
  }
  return enqueueRecord(record, input.ownerGeneration) as
    Promise<QueuedProjectedReaderSessionAnchor>;
}

export async function findLessonSessionByAlias(
  ownerGeneration: OwnerGeneration,
  sessionAlias: string,
): Promise<QueuedLessonSessionDependency | null> {
  const database = await openSyncDatabase();
  const transaction = database.transaction(
    [SYNC_META_STORE, LEARNING_COMMAND_OUTBOX_STORE],
    "readonly",
  );
  const done = transactionDone(transaction);
  try {
    await assertOwnerGeneration(transaction, ownerGeneration);
    const record = await requestResult(
      transaction
        .objectStore(LEARNING_COMMAND_OUTBOX_STORE)
        .index(LEARNING_COMMAND_SESSION_ALIAS_INDEX)
        .get(IDBKeyRange.only([ownerGeneration.ownerKey, sessionAlias])) as
        IDBRequest<LearningCommandOutboxRecord | undefined>,
    );
    await done;
    return record?.kind === "lesson-session-open"
      || record?.kind === "projected-lesson-session-anchor"
      ? record
      : null;
  } catch (error) {
    abortTransaction(transaction);
    await done.catch(() => undefined);
    throw error;
  }
}

export async function findAssessmentSessionByAlias(
  ownerGeneration: OwnerGeneration,
  sessionAlias: string,
): Promise<QueuedAssessmentSessionDependency | null> {
  const database = await openSyncDatabase();
  const transaction = database.transaction(
    [SYNC_META_STORE, LEARNING_COMMAND_OUTBOX_STORE],
    "readonly",
  );
  const done = transactionDone(transaction);
  try {
    await assertOwnerGeneration(transaction, ownerGeneration);
    const record = await requestResult(
      transaction
        .objectStore(LEARNING_COMMAND_OUTBOX_STORE)
        .index(LEARNING_COMMAND_SESSION_ALIAS_INDEX)
        .get(IDBKeyRange.only([ownerGeneration.ownerKey, sessionAlias])) as
        IDBRequest<LearningCommandOutboxRecord | undefined>,
    );
    await done;
    return record?.kind === "assessment-session-open"
      || record?.kind === "projected-assessment-session-anchor"
      ? record
      : null;
  } catch (error) {
    abortTransaction(transaction);
    await done.catch(() => undefined);
    throw error;
  }
}

export async function findReaderSessionByAlias(
  ownerGeneration: OwnerGeneration,
  sessionAlias: string,
): Promise<QueuedReaderSessionDependency | null> {
  const database = await openSyncDatabase();
  const transaction = database.transaction(
    [SYNC_META_STORE, LEARNING_COMMAND_OUTBOX_STORE],
    "readonly",
  );
  const done = transactionDone(transaction);
  try {
    await assertOwnerGeneration(transaction, ownerGeneration);
    const record = await requestResult(
      transaction
        .objectStore(LEARNING_COMMAND_OUTBOX_STORE)
        .index(LEARNING_COMMAND_SESSION_ALIAS_INDEX)
        .get(IDBKeyRange.only([ownerGeneration.ownerKey, sessionAlias])) as
        IDBRequest<LearningCommandOutboxRecord | undefined>,
    );
    await done;
    return record?.kind === "reader-session-open"
      || record?.kind === "projected-reader-session-anchor"
      ? record
      : null;
  } catch (error) {
    abortTransaction(transaction);
    await done.catch(() => undefined);
    throw error;
  }
}

export async function listLearningCommandRecords(
  ownerGeneration: OwnerGeneration,
): Promise<LearningCommandOutboxRecord[]> {
  const database = await openSyncDatabase();
  const transaction = database.transaction(
    [SYNC_META_STORE, LEARNING_COMMAND_OUTBOX_STORE],
    "readonly",
  );
  const done = transactionDone(transaction);
  try {
    await assertOwnerGeneration(transaction, ownerGeneration);
    const records = await requestResult(
      transaction
        .objectStore(LEARNING_COMMAND_OUTBOX_STORE)
        .index(LEARNING_COMMAND_OWNER_INDEX)
        .getAll(IDBKeyRange.only(ownerGeneration.ownerKey)) as IDBRequest<
        LearningCommandOutboxRecord[]
      >,
    );
    await done;
    return records.sort(
      (left, right) => left.deviceSequence - right.deviceSequence,
    );
  } catch (error) {
    abortTransaction(transaction);
    await done.catch(() => undefined);
    throw error;
  }
}

export const listPendingLearningCommands = async (
  ownerGeneration: OwnerGeneration,
) => (await listLearningCommandRecords(ownerGeneration))
  .filter((record) => record.status === "pending");

export const listQuarantinedLearningCommands = async (
  ownerGeneration: OwnerGeneration,
) => (await listLearningCommandRecords(ownerGeneration))
  .filter((record) => record.status === "quarantined");

/**
 * Returns owner-scoped, answer-free readiness counters for the normalized
 * journal. A pending record remains unsent until it has a durable server
 * acknowledgement, even while leased or waiting for retry backoff.
 */
export const summarizeLearningCommandQueue = async (
  ownerGeneration: OwnerGeneration,
): Promise<LearningCommandQueueSummary> => {
  const records = await listLearningCommandRecords(ownerGeneration);
  return records.reduce<LearningCommandQueueSummary>((summary, record) => {
    if (record.status === "pending") summary.pendingCount += 1;
    if (record.status === "quarantined") summary.quarantinedCount += 1;
    return summary;
  }, { pendingCount: 0, quarantinedCount: 0 });
};

const mutateRecord = async <T>(
  recordKey: string,
  ownerGeneration: OwnerGeneration,
  mutate: (
    record: LearningCommandOutboxRecord | undefined,
    store: IDBObjectStore,
  ) =>
    | { record?: LearningCommandOutboxRecord; result: T }
    | Promise<{ record?: LearningCommandOutboxRecord; result: T }>,
): Promise<T> => {
  const database = await openSyncDatabase();
  const transaction = database.transaction(
    [SYNC_META_STORE, LEARNING_COMMAND_OUTBOX_STORE],
    "readwrite",
  );
  const done = transactionDone(transaction);
  try {
    await assertOwnerGeneration(transaction, ownerGeneration);
    const store = transaction.objectStore(LEARNING_COMMAND_OUTBOX_STORE);
    const existing = await requestResult(
      store.get(recordKey) as IDBRequest<
        LearningCommandOutboxRecord | undefined
      >,
    );
    if (existing && existing.ownerKey !== ownerGeneration.ownerKey) {
      throw new StaleOwnerGenerationError();
    }
    const change = await mutate(existing, store);
    if (change.record) store.put(change.record);
    await done;
    notifyLearningCommandQueueChanged(ownerGeneration.ownerKey);
    return change.result;
  } catch (error) {
    abortTransaction(transaction);
    await done.catch(() => undefined);
    throw error;
  }
};

export async function prepareLearningCommand(
  recordKey: string,
  ownerGeneration: OwnerGeneration,
): Promise<LearningCommandPreparation> {
  const records = await listLearningCommandRecords(ownerGeneration);
  const record = records.find((candidate) => candidate.recordKey === recordKey);
  if (!record || record.status !== "pending") return { state: "gone" };

  if (record.kind === "lesson-session-open") {
    const parsed = parseOpenLessonSessionCommand(record.command);
    return parsed.ok
      ? {
          state: "ready",
          prepared: {
            kind: "lesson-session-open",
            record,
            command: parsed.command,
          },
        }
      : { state: "invalid", reason: parsed.reason };
  }

  if (record.kind === "assessment-session-open") {
    const parsed = parseOpenAssessmentSessionCommand(record.command);
    return parsed.ok
      ? {
          state: "ready",
          prepared: {
            kind: "assessment-session-open",
            record,
            command: parsed.command,
          },
        }
      : { state: "invalid", reason: parsed.reason };
  }

  if (record.kind === "reader-session-open") {
    const parsed = parseOpenReaderSessionCommand(record.command);
    if (!parsed.ok) return { state: "invalid", reason: parsed.reason };
    let supportDowngradeDependencyCommandId: string | null = null;
    if (record.dependencyRecordKey !== null) {
      const terminal = records.find(
        (
          candidate,
        ): candidate is QueuedReaderSessionAbandonmentCommand =>
          candidate.recordKey === record.dependencyRecordKey
          && candidate.kind === "reader-session-abandon",
      );
      if (!terminal || terminal.status === "quarantined") {
        return {
          state: "invalid",
          reason: "Reader support downgrade dependency is unavailable.",
        };
      }
      if (terminal.status !== "acknowledged" || !terminal.receipt) {
        return {
          state: "blocked",
          reason: "Reader support downgrade has not completed yet.",
        };
      }
      if (
        terminal.ownerKey !== record.ownerKey
        || terminal.resetEpoch !== record.resetEpoch
        || terminal.receipt.resetEpoch !== record.resetEpoch
        || terminal.receipt.contentVersion !== record.command.contentVersion
        || terminal.receipt.storyId !== record.command.storyId
        || terminal.receipt.supportMode !== "unassisted"
        || terminal.receipt.reason !== "support-requested"
        || terminal.receipt.status !== "abandoned"
        || record.command.supportMode !== "assisted"
        || terminal.deviceSequence >= record.deviceSequence
      ) {
        return {
          state: "invalid",
          reason: "Reader support downgrade dependency is incompatible.",
        };
      }
      supportDowngradeDependencyCommandId = terminal.commandId;
    }
    const expectedHash = await readerSessionOpenRequestHash(
      record.sessionAlias,
      supportDowngradeDependencyCommandId,
      record.resetEpoch,
      queuedReaderSessionOpenCommand(parsed.command),
    );
    if (
      !validReaderRecordEnvelope(record, parsed.command)
      || record.requestHash !== expectedHash
      || canonicalStringify(record.command)
        !== canonicalStringify(parsed.command)
    ) {
      return {
        state: "invalid",
        reason: "Reader-session open command envelope is invalid.",
      };
    }
    return {
      state: "ready",
      prepared: {
        kind: "reader-session-open",
        record,
        command: parsed.command,
      },
    };
  }

  if (record.kind === "objective-attempt" && record.command.source === "reader") {
    const parsed = parseLearningAttemptCommand(record.command);
    return parsed.ok
      ? {
          state: "ready",
          prepared: {
            kind: "objective-attempt",
            record,
            command: parsed.command,
          },
        }
      : { state: "invalid", reason: parsed.reason };
  }

  if (record.kind === "review-grade") {
    const parsed = parseGradeReviewCommand(record.command);
    if (!parsed.ok) return { state: "invalid", reason: parsed.reason };
    const expectedHash = await reviewGradeRequestHash(
      record.ownerKey,
      record.resetEpoch,
      queuedReviewGradeCommand(parsed.command),
    );
    if (
      record.commandId !== parsed.command.idempotencyKey
      || record.deviceSequence !== parsed.command.deviceSequence
      || record.resetEpoch !== parsed.command.resetEpoch
      || record.sessionAlias !== null
      || record.dependencyRecordKey !== null
      || record.requestHash !== expectedHash
      || canonicalStringify(record.command)
        !== canonicalStringify(parsed.command)
    ) {
      return {
        state: "invalid",
        reason: "Review-grade command envelope is invalid.",
      };
    }
    return {
      state: "ready",
      prepared: {
        kind: "review-grade",
        record,
        command: parsed.command,
      },
    };
  }

  if (
    record.kind === "reader-attempt"
    || record.kind === "reader-session-submit"
    || record.kind === "reader-session-abandon"
  ) {
    const dependency = records.find(
      (candidate): candidate is QueuedReaderSessionDependency =>
        candidate.recordKey === record.dependencyRecordKey
        && (
          candidate.kind === "reader-session-open"
          || candidate.kind === "projected-reader-session-anchor"
        ),
    );
    if (!dependency) {
      return {
        state: "invalid",
        reason: "Reader-session dependency is missing.",
      };
    }
    if (
      dependency.kind === "reader-session-open"
      && dependency.status === "quarantined"
    ) {
      return {
        state: "invalid",
        reason: "Reader-session dependency was quarantined.",
      };
    }
    if (
      dependency.kind === "reader-session-open"
      && (dependency.status !== "acknowledged" || !dependency.receipt)
    ) {
      return {
        state: "blocked",
        reason: "Reader-session receipt has not been mapped yet.",
      };
    }
    const authorityBinding = readerSessionAuthorityBinding(dependency);
    if (
      !authorityBinding
      || !await validReaderSessionAuthority(dependency)
    ) {
      return {
        state: "invalid",
        reason: "Reader-session authority binding is invalid.",
      };
    }
    if (
      dependency.resetEpoch !== record.resetEpoch
      || dependency.command.resetEpoch !== record.resetEpoch
      || authorityBinding.resetEpoch !== record.resetEpoch
    ) {
      return {
        state: "invalid",
        reason: "Reader-session dependency belongs to another reset epoch.",
      };
    }
    if (
      dependency.command.contentVersion !== record.command.contentVersion
      || authorityBinding.contentVersion !== record.command.contentVersion
      || dependency.command.installationId !== record.command.installationId
      || dependency.command.deviceId !== record.command.deviceId
      || dependency.sessionAlias !== record.sessionAlias
      || dependency.deviceSequence >= record.deviceSequence
    ) {
      return {
        state: "invalid",
        reason: "Reader-session dependency belongs to another command scope.",
      };
    }

    if (record.kind === "reader-session-abandon") {
      const parsed = parseAbandonReaderSessionCommand({
        ...record.command,
        sessionId: authorityBinding.sessionId,
        formHash: authorityBinding.formHash,
      });
      if (!parsed.ok) return { state: "invalid", reason: parsed.reason };
      const queuedCommand = queuedReaderSessionAbandonmentCommand(
        parsed.command,
      );
      const expectedHash = await readerSessionAbandonmentRequestHash(
        record.sessionAlias,
        dependency.commandId,
        record.resetEpoch,
        queuedCommand,
      );
      const expectedStoredCommand: QueuedReaderSessionAbandonmentCommandV1 = {
        ...queuedCommand,
        deviceSequence: parsed.command.deviceSequence,
        resetEpoch: parsed.command.resetEpoch,
      };
      if (
        !validReaderRecordEnvelope(record, parsed.command)
        || record.requestHash !== expectedHash
        || canonicalStringify(record.command)
          !== canonicalStringify(expectedStoredCommand)
      ) {
        return {
          state: "invalid",
          reason: "Reader-session abandonment command envelope is invalid.",
        };
      }
      return {
        state: "ready",
        prepared: {
          kind: "reader-session-abandon",
          record,
          command: parsed.command,
          sessionReceipt: authorityBinding,
        },
      };
    }

    if (record.kind === "reader-session-submit") {
      const attempts = record.attemptDependencyRecordKeys.map(
        (dependencyKey) =>
          records.find((candidate) =>
            candidate.recordKey === dependencyKey
          ),
      );
      if (attempts.some((attempt) =>
        !attempt || attempt.kind !== "reader-attempt"
      )) {
        return {
          state: "invalid",
          reason: "A Reader submission attempt dependency is missing.",
        };
      }
      const readerAttempts = attempts as QueuedReaderAttemptCommand[];
      if (readerAttempts.some((attempt) =>
        attempt.status === "quarantined"
      )) {
        return {
          state: "invalid",
          reason: "A Reader attempt dependency was quarantined.",
        };
      }
      if (readerAttempts.some((attempt) =>
        attempt.status !== "acknowledged" || !attempt.receipt
      )) {
        return {
          state: "blocked",
          reason: "Not every Reader form attempt is acknowledged yet.",
        };
      }
      if (
        readerAttempts.some((attempt) =>
          attempt.resetEpoch !== record.resetEpoch
          || attempt.command.resetEpoch !== record.resetEpoch
          || attempt.receipt?.resetEpoch !== record.resetEpoch
          || attempt.receipt.sessionId !== authorityBinding.sessionId
          || attempt.receipt.formHash !== authorityBinding.formHash
          || attempt.sessionAlias !== record.sessionAlias
          || attempt.deviceSequence >= record.deviceSequence
        )
        || !readerAttemptsExactlyMatchForm(
          dependency,
          readerAttempts,
          true,
        )
      ) {
        return {
          state: "invalid",
          reason: "Reader submission dependencies do not match the exact form.",
        };
      }
      const parsed = parseSubmitReaderSessionCommand({
        ...record.command,
        sessionId: authorityBinding.sessionId,
        formHash: authorityBinding.formHash,
      });
      if (!parsed.ok) return { state: "invalid", reason: parsed.reason };
      const attemptCommandIds = readerAttempts.map((attempt) =>
        attempt.commandId
      );
      const dependenciesAreCanonical = readerAttempts.every(
        (attempt, index) =>
          record.attemptDependencyRecordKeys[index]
            === recordKeyFor(record.ownerKey, attempt.commandId),
      );
      const queuedCommand = queuedReaderSessionSubmissionCommand(
        parsed.command,
      );
      const expectedHash = await readerSessionSubmissionRequestHash(
        record.sessionAlias,
        attemptCommandIds,
        record.resetEpoch,
        queuedCommand,
      );
      const expectedStoredCommand: QueuedReaderSessionSubmissionCommandV1 = {
        ...queuedCommand,
        deviceSequence: parsed.command.deviceSequence,
        resetEpoch: parsed.command.resetEpoch,
      };
      if (
        !dependenciesAreCanonical
        || !validReaderRecordEnvelope(record, parsed.command)
        || record.requestHash !== expectedHash
        || canonicalStringify(record.command)
          !== canonicalStringify(expectedStoredCommand)
      ) {
        return {
          state: "invalid",
          reason: "Reader-session submission command envelope is invalid.",
        };
      }
      return {
        state: "ready",
        prepared: {
          kind: "reader-session-submit",
          record,
          command: parsed.command,
          sessionReceipt: authorityBinding,
          attemptReceipts: readerAttempts.map((attempt) =>
            attempt.receipt!
          ),
          projectedAttempts: structuredClone(
            projectedReaderSessionAttempts(dependency),
          ),
        },
      };
    }

    const item = authorityBinding.form.items[record.command.position];
    if (
      !item
      || item.itemId !== record.command.itemId
      || item.itemVersion !== record.command.itemVersion
      || !item.options.includes(record.command.selectedOption)
      || projectedReaderSessionAttempts(dependency).some((attempt) =>
        attempt.position === record.command.position
        || attempt.itemId === record.command.itemId
        || attempt.itemVersion === record.command.itemVersion
      )
    ) {
      return {
        state: "invalid",
        reason: "Attempt is not part of the immutable Reader form.",
      };
    }
    const parsed = parseRecordReaderAttemptCommand({
      ...record.command,
      sessionId: authorityBinding.sessionId,
      formHash: authorityBinding.formHash,
    });
    if (!parsed.ok) return { state: "invalid", reason: parsed.reason };
    const queuedCommand = queuedReaderAttemptCommand(parsed.command);
    const expectedHash = await readerAttemptRequestHash(
      record.sessionAlias,
      record.resetEpoch,
      queuedCommand,
    );
    const expectedStoredCommand: QueuedReaderAttemptCommandV1 = {
      ...queuedCommand,
      deviceSequence: parsed.command.deviceSequence,
      resetEpoch: parsed.command.resetEpoch,
    };
    if (
      !validReaderRecordEnvelope(record, parsed.command)
      || record.requestHash !== expectedHash
      || canonicalStringify(record.command)
        !== canonicalStringify(expectedStoredCommand)
    ) {
      return {
        state: "invalid",
        reason: "Reader-attempt command envelope is invalid.",
      };
    }
    return {
      state: "ready",
      prepared: {
        kind: "reader-attempt",
        record,
        command: parsed.command,
        sessionReceipt: authorityBinding,
      },
    };
  }

  if (
    record.kind === "assessment-attempt"
    || record.kind === "assessment-session-submit"
    || record.kind === "assessment-session-abandon"
  ) {
    const dependency = records.find(
      (candidate): candidate is QueuedAssessmentSessionDependency =>
        candidate.recordKey === record.dependencyRecordKey
        && (
          candidate.kind === "assessment-session-open"
          || candidate.kind === "projected-assessment-session-anchor"
        ),
    );
    if (!dependency) {
      return {
        state: "invalid",
        reason: "Assessment-session dependency is missing.",
      };
    }
    if (
      dependency.kind === "assessment-session-open"
      && dependency.status === "quarantined"
    ) {
      return {
        state: "invalid",
        reason: "Assessment-session dependency was quarantined.",
      };
    }
    if (
      dependency.kind === "assessment-session-open"
      && (dependency.status !== "acknowledged" || !dependency.receipt)
    ) {
      return {
        state: "blocked",
        reason: "Assessment-session receipt has not been mapped yet.",
      };
    }
    const authorityBinding = assessmentSessionAuthorityBinding(dependency);
    if (
      !authorityBinding
      || !await validAssessmentSessionAuthority(dependency)
    ) {
      return {
        state: "invalid",
        reason: "Assessment-session authority binding is invalid.",
      };
    }
    if (
      dependency.resetEpoch !== record.resetEpoch
      || dependency.command.resetEpoch !== record.resetEpoch
      || authorityBinding.resetEpoch !== record.resetEpoch
    ) {
      return {
        state: "invalid",
        reason: "Assessment-session dependency belongs to another reset epoch.",
      };
    }
    if (
      dependency.command.contentVersion !== record.command.contentVersion
      || authorityBinding.contentVersion !== record.command.contentVersion
      || dependency.command.installationId !== record.command.installationId
      || dependency.command.deviceId !== record.command.deviceId
    ) {
      return {
        state: "invalid",
        reason: "Assessment-session dependency belongs to another command scope.",
      };
    }

    if (record.kind === "assessment-session-abandon") {
      const parsed = parseAbandonAssessmentSessionCommand({
        ...record.command,
        sessionId: authorityBinding.sessionId,
        formHash: authorityBinding.formHash,
      });
      return parsed.ok
        ? {
            state: "ready",
            prepared: {
              kind: "assessment-session-abandon",
              record,
              command: parsed.command,
              sessionReceipt: authorityBinding,
            },
          }
        : { state: "invalid", reason: parsed.reason };
    }

    if (record.kind === "assessment-session-submit") {
      const attempts = record.attemptDependencyRecordKeys.map((dependencyKey) =>
        records.find((candidate) => candidate.recordKey === dependencyKey)
      );
      if (attempts.some((attempt) =>
        !attempt || attempt.kind !== "assessment-attempt"
      )) {
        return {
          state: "invalid",
          reason: "An assessment submission attempt dependency is missing.",
        };
      }
      const assessmentAttempts = attempts as QueuedAssessmentAttemptCommand[];
      if (assessmentAttempts.some((attempt) =>
        attempt.status === "quarantined"
      )) {
        return {
          state: "invalid",
          reason: "An assessment attempt dependency was quarantined.",
        };
      }
      if (assessmentAttempts.some((attempt) =>
        attempt.status !== "acknowledged" || !attempt.receipt
      )) {
        return {
          state: "blocked",
          reason: "Not every assessment form attempt is acknowledged yet.",
        };
      }
      if (
        assessmentAttempts.some((attempt) =>
          attempt.resetEpoch !== record.resetEpoch
          || attempt.command.resetEpoch !== record.resetEpoch
          || attempt.receipt?.resetEpoch !== record.resetEpoch
          || attempt.receipt.sessionId !== authorityBinding.sessionId
          || attempt.receipt.formHash !== authorityBinding.formHash
        )
        || !assessmentAttemptsExactlyMatchForm(
          dependency,
          assessmentAttempts,
          true,
        )
      ) {
        return {
          state: "invalid",
          reason: "Assessment submission dependencies do not match the exact form.",
        };
      }
      const parsed = parseSubmitAssessmentSessionCommand({
        ...record.command,
        sessionId: authorityBinding.sessionId,
        formHash: authorityBinding.formHash,
      });
      return parsed.ok
        ? {
            state: "ready",
            prepared: {
              kind: "assessment-session-submit",
              record,
              command: parsed.command,
              sessionReceipt: authorityBinding,
              attemptReceipts: assessmentAttempts.map((attempt) =>
                attempt.receipt!
              ),
              projectedAttempts: structuredClone(
                projectedAssessmentSessionAttempts(dependency),
              ),
            },
          }
        : { state: "invalid", reason: parsed.reason };
    }

    const item = authorityBinding.form.items.find((candidate) =>
      candidate.itemId === record.command.itemId
    );
    if (!item || item.itemVersion !== record.command.itemVersion) {
      return {
        state: "invalid",
        reason: "Attempt is not part of the immutable assessment form.",
      };
    }
    const parsed = parseRecordAssessmentAttemptCommand({
      ...record.command,
      sessionId: authorityBinding.sessionId,
      formHash: authorityBinding.formHash,
    });
    return parsed.ok
      ? {
          state: "ready",
          prepared: {
            kind: "assessment-attempt",
            record,
            command: parsed.command,
            sessionReceipt: authorityBinding,
          },
        }
      : { state: "invalid", reason: parsed.reason };
  }

  const dependency = record.dependencyRecordKey
    ? records.find(
        (candidate) => candidate.recordKey === record.dependencyRecordKey,
      )
    : null;
  if (
    !dependency
    || (
      dependency.kind !== "lesson-session-open"
      && dependency.kind !== "projected-lesson-session-anchor"
    )
  ) {
    return { state: "invalid", reason: "Lesson-session dependency is missing." };
  }
  if (
    dependency.kind === "lesson-session-open"
    && dependency.status === "quarantined"
  ) {
    return {
      state: "invalid",
      reason: "Lesson-session dependency was quarantined.",
    };
  }
  if (
    dependency.kind === "lesson-session-open"
    && (dependency.status !== "acknowledged" || !dependency.receipt)
  ) {
    return {
      state: "blocked",
      reason: "Lesson-session receipt has not been mapped yet.",
    };
  }
  const authorityBinding = sessionAuthorityBinding(dependency);
  if (!authorityBinding) {
    return {
      state: "invalid",
      reason: "Lesson-session authority binding is absent.",
    };
  }
  if (
    dependency.resetEpoch !== record.resetEpoch
    || dependency.command.resetEpoch !== record.resetEpoch
    || authorityBinding.resetEpoch !== record.resetEpoch
  ) {
    return {
      state: "invalid",
      reason: "Lesson-session dependency belongs to another reset epoch.",
    };
  }
  if (
    dependency.command.contentVersion !== record.command.contentVersion
    || authorityBinding.contentVersion !== record.command.contentVersion
    || dependency.command.installationId !== record.command.installationId
    || dependency.command.deviceId !== record.command.deviceId
  ) {
    return {
      state: "invalid",
      reason: "Lesson-session dependency belongs to another command scope.",
    };
  }
  if (
    authorityBinding.expectedEvidenceCount
      !== authorityBinding.form.activities.length
    || await hashLessonSessionForm(authorityBinding.form)
      !== authorityBinding.formHash
    || (
      dependency.kind === "lesson-session-open"
      && (
        dependency.receipt?.protocolVersion !== 1
        || dependency.receipt.idempotencyKey
          !== dependency.command.idempotencyKey
        || dependency.receipt.enrollmentId
          !== dependency.command.enrollmentId
        || dependency.receipt.lessonId !== dependency.command.lessonId
      )
    )
    || (
      dependency.kind === "projected-lesson-session-anchor"
      && (
        dependency.command.manifestSha256
          !== CURRENT_CONTENT_MANIFEST_SHA256
        || !projectedAttemptsMatchBinding(
          dependency.projectedAttempts,
          authorityBinding,
        )
      )
    )
  ) {
    return {
      state: "invalid",
      reason: "Lesson-session authority failed its immutable form fence.",
    };
  }

  if (record.kind === "lesson-session-abandon") {
    const parsed = parseAbandonLessonSessionCommand({
      ...record.command,
      sessionId: authorityBinding.sessionId,
    });
    return parsed.ok
      ? {
          state: "ready",
          prepared: {
            kind: "lesson-session-abandon",
            record,
            command: parsed.command,
            sessionReceipt: authorityBinding,
          },
        }
      : { state: "invalid", reason: parsed.reason };
  }

  if (record.kind === "lesson-session-submit") {
    const attempts = record.attemptDependencyRecordKeys.map((dependencyKey) =>
      records.find((candidate) => candidate.recordKey === dependencyKey)
    );
    if (attempts.some((attempt) =>
      !attempt || attempt.kind !== "objective-attempt"
    )) {
      return {
        state: "invalid",
        reason: "A submission attempt dependency is missing.",
      };
    }
    const objectiveAttempts = attempts as QueuedObjectiveAttemptCommand[];
    if (objectiveAttempts.some((attempt) =>
      attempt.status === "quarantined"
    )) {
      return {
        state: "invalid",
        reason: "A submission attempt dependency was quarantined.",
      };
    }
    if (objectiveAttempts.some((attempt) =>
      attempt.status !== "acknowledged" || !attempt.receipt
    )) {
      return {
        state: "blocked",
        reason: "Not every lesson form attempt is acknowledged yet.",
      };
    }
    if (objectiveAttempts.some((attempt) =>
      attempt.resetEpoch !== record.resetEpoch
      || attempt.command.resetEpoch !== record.resetEpoch
      || attempt.receipt?.resetEpoch !== record.resetEpoch
    )) {
      return {
        state: "invalid",
        reason: "A submission attempt belongs to another reset epoch.",
      };
    }
    if (!attemptsExactlyMatchForm(dependency, objectiveAttempts)) {
      return {
        state: "invalid",
        reason: "Submission dependencies do not match the exact lesson form.",
      };
    }
    const parsed = parseSubmitLessonSessionCommand({
      ...record.command,
      sessionId: authorityBinding.sessionId,
      formHash: authorityBinding.formHash,
    });
    return parsed.ok
      ? {
          state: "ready",
          prepared: {
            kind: "lesson-session-submit",
            record,
            command: parsed.command,
            sessionReceipt: authorityBinding,
          },
        }
      : { state: "invalid", reason: parsed.reason };
  }

  const formActivity = authorityBinding.form.activities.find(
    (activity) => activity.activityId === record.command.activityId,
  );
  if (
    !formActivity
    || formActivity.activityVersion !== record.command.activityVersion
    || formActivity.method !== record.command.method
    || projectedSessionAttempts(dependency).some(
      (attempt) => attempt.activityId === record.command.activityId,
    )
  ) {
    return {
      state: "invalid",
      reason: "Attempt is not part of the immutable lesson-session form.",
    };
  }
  const parsed = parseLearningAttemptCommand({
    ...record.command,
    sessionId: authorityBinding.sessionId,
  });
  return parsed.ok
    ? {
        state: "ready",
        prepared: {
          kind: "objective-attempt",
          record,
          command: parsed.command,
        },
      }
    : { state: "invalid", reason: parsed.reason };
}

export async function claimLearningCommand(
  recordKey: string,
  ownerGeneration: OwnerGeneration,
  now = new Date(),
): Promise<LearningCommandOutboxRecord | null> {
  const nowMs = now.getTime();
  if (Number.isNaN(nowMs)) throw new Error("Claim timestamp is invalid.");
  return mutateRecord(recordKey, ownerGeneration, (record) => {
    if (!record || record.status !== "pending") return { result: null };
    const nextAttemptMs = record.nextAttemptAt
      ? new Date(record.nextAttemptAt).getTime()
      : 0;
    const leaseUntilMs = record.leaseUntil
      ? new Date(record.leaseUntil).getTime()
      : 0;
    if (nextAttemptMs > nowMs || leaseUntilMs > nowMs) {
      return { result: null };
    }
    const claimed: LearningCommandOutboxRecord = {
      ...record,
      attemptCount: record.attemptCount + 1,
      lastAttemptAt: now.toISOString(),
      leaseUntil: new Date(nowMs + LEARNING_COMMAND_LEASE_MS).toISOString(),
    };
    return { record: claimed, result: claimed };
  });
}

export const retryDelayMs = (attemptCount: number) => {
  const exponent = Math.max(0, Math.min(20, attemptCount - 1));
  return Math.min(
    LEARNING_COMMAND_RETRY_MAX_MS,
    LEARNING_COMMAND_RETRY_BASE_MS * (2 ** exponent),
  );
};

export async function scheduleLearningCommandRetry(
  recordKey: string,
  ownerGeneration: OwnerGeneration,
  now = new Date(),
  minimumDelayMs = 0,
) {
  const nowMs = now.getTime();
  if (Number.isNaN(nowMs)) throw new Error("Retry timestamp is invalid.");
  return mutateRecord(recordKey, ownerGeneration, (record) => {
    if (!record || record.status !== "pending") return { result: record ?? null };
    const delay = Math.max(
      Math.max(0, minimumDelayMs),
      retryDelayMs(record.attemptCount),
    );
    const updated: LearningCommandOutboxRecord = {
      ...record,
      leaseUntil: null,
      nextAttemptAt: new Date(nowMs + delay).toISOString(),
    };
    return { record: updated, result: updated };
  });
}

export async function quarantineLearningCommand(
  recordKey: string,
  ownerGeneration: OwnerGeneration,
  reason: string,
  now = new Date(),
) {
  const boundedReason = reason.trim().slice(0, 500)
    || "Permanent client command failure.";
  return mutateRecord(recordKey, ownerGeneration, (record) => {
    if (!record || record.status === "acknowledged") {
      return { result: record ?? null };
    }
    if (record.status === "quarantined") return { result: record };
    const updated: LearningCommandOutboxRecord = {
      ...record,
      status: "quarantined",
      leaseUntil: null,
      nextAttemptAt: null,
      quarantinedAt: now.toISOString(),
      quarantineReason: boundedReason,
    };
    return { record: updated, result: updated };
  });
}

export async function acknowledgeLearningCommand(
  recordKey: string,
  ownerGeneration: OwnerGeneration,
  receipt:
    | OpenLessonSessionReceiptV1
    | LearningAttemptReceiptV1
    | SubmitLessonSessionReceiptV1
    | AbandonLessonSessionReceiptV1
    | OpenAssessmentSessionReceiptV1
    | RecordAssessmentAttemptReceiptV1
    | SubmitAssessmentSessionReceiptV1
    | AbandonAssessmentSessionReceiptV1
    | GradeReviewReceiptV1
    | OpenReaderSessionReceiptV1
    | RecordReaderAttemptReceiptV1
    | SubmitReaderSessionReceiptV1
    | AbandonReaderSessionReceiptV1,
  now = new Date(),
) {
  return mutateRecord(recordKey, ownerGeneration, async (record, store) => {
    if (!record) return { result: null };
    if (record.status === "acknowledged") {
      if (
        canonicalReceiptIdentity(record.receipt)
        !== canonicalReceiptIdentity(receipt)
      ) {
        throw new LearningCommandReceiptConflictError();
      }
      return { result: record };
    }
    if (record.status === "quarantined") return { result: record };
    if (record.kind === "reader-session-open") {
      const readerReceipt = receipt as OpenReaderSessionReceiptV1;
      const ownerRecords = await requestResult(
        store.index(LEARNING_COMMAND_OWNER_INDEX).getAll(
          IDBKeyRange.only(record.ownerKey),
        ) as IDBRequest<LearningCommandOutboxRecord[]>,
      );
      const conflictingAnchor = ownerRecords.some((candidate) =>
        candidate.kind === "projected-reader-session-anchor"
        && candidate.binding.sessionId === readerReceipt.sessionId
      );
      if (conflictingAnchor) {
        const quarantined: LearningCommandOutboxRecord = {
          ...record,
          status: "quarantined",
          receipt: null,
          leaseUntil: null,
          nextAttemptAt: null,
          quarantinedAt: now.toISOString(),
          quarantineReason:
            "Server Reader session is already bound to projected authority.",
        };
        return { record: quarantined, result: quarantined };
      }
    }
    const updated = {
      ...record,
      status: "acknowledged" as const,
      receipt,
      leaseUntil: null,
      nextAttemptAt: null,
      acknowledgedAt: now.toISOString(),
    } as LearningCommandOutboxRecord;
    return { record: updated, result: updated };
  });
}
