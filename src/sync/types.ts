import type {
  DiagnosticResult,
  LearningState,
  Profile,
} from "../types";

/**
 * A Lamport clock. `observedAt` is audit metadata only; ordering is based on
 * counter, operation id, then the timestamp as a final deterministic tie-break.
 */
export type SyncClock = {
  counter: number;
  operationId: string;
  observedAt: string;
};

export type SyncResetMarker = {
  epoch: number;
  clock: SyncClock;
};

export type ClockedSyncValue<T> = {
  value: T;
  clock: SyncClock;
};

/**
 * A false value is an intentional tombstone and must not be compacted until
 * every replica has advanced beyond its clock/reset epoch.
 */
export type SavedWordSyncEntry = {
  present: boolean;
  clock: SyncClock;
};

export type SyncConflictCollection =
  | "evidence"
  | "activity"
  | "profile"
  | "diagnostic"
  | "saved-word";

export type SyncConflict = {
  collection: SyncConflictCollection;
  key: string;
  reason: "same-key-different-payload" | "same-clock-different-value";
  selectedFingerprint: string;
  variantFingerprints: [string, string];
};

/**
 * Version-one cloud envelope. `state` is a cloud-safe materialized projection,
 * while the surrounding clocks/tombstones contain the information needed to
 * merge mutable fields without trusting aggregate counters from either client.
 */
export type CloudSyncDocumentV1 = {
  schemaVersion: 1;
  clock: SyncClock;
  reset: SyncResetMarker;
  profile: ClockedSyncValue<Profile>;
  diagnostic: ClockedSyncValue<DiagnosticResult>;
  savedWords: Record<string, SavedWordSyncEntry>;
  legacyXpBaseline: ClockedSyncValue<number>;
  state: LearningState;
};

export type MergeSyncDocumentsResult = {
  document: CloudSyncDocumentV1;
  conflicts: SyncConflict[];
};
