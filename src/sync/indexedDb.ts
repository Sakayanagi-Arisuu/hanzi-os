import type { LearningState } from "../types";
import { isValidLearningResetEpoch } from "../learning/resetEpoch";
import type { CloudSyncDocumentV1 } from "./types";

const DATABASE_NAME = "hanzi-os-sync-v1";
export const SYNC_DATABASE_VERSION = 3;
export const SYNC_META_STORE = "meta";
export const SYNC_DOCUMENT_STORE = "documents";
const DOCUMENT_STORE = SYNC_DOCUMENT_STORE;
const LOCAL_STATE_STORE = "local-states";
const OUTBOX_STORE = "outbox";
const OWNER_INDEX = "ownerKey";
export const LEARNING_COMMAND_OUTBOX_STORE = "learning-command-outbox";
export const LEARNING_COMMAND_OWNER_INDEX = "ownerKey";
export const LEARNING_COMMAND_SESSION_ALIAS_INDEX = "ownerSessionAlias";
export const LEARNING_PROJECTION_STORE = "learning-projections";
export const LESSON_RESUME_STORE = "lesson-resumes";
export const ASSESSMENT_RESUME_STORE = "assessment-resumes";
export const OWNER_SCOPED_CACHE_OWNER_INDEX = "ownerKey";
export const OWNER_SCOPED_CACHE_OWNER_EPOCH_INDEX = "ownerEpoch";
export const ACTIVE_OWNER_GENERATION_KEY = "activeOwnerGeneration";

const META_STORE = SYNC_META_STORE;

export type OwnerGeneration = {
  ownerKey: string;
  generation: number;
};

export type OwnerGenerationClaim = {
  ownerGeneration: OwnerGeneration;
  existed: boolean;
};

export type ActiveOwnerLearningScope = {
  ownerGeneration: OwnerGeneration;
  resetEpoch: number;
};

export type OwnerScopedCacheScope = {
  expectedOwnerGeneration: OwnerGeneration;
  resetEpoch: number;
  entryKey: string;
};

export type OwnerScopedCacheWrite<T> = OwnerScopedCacheScope & {
  value: T;
  updatedAt?: string;
};

export type OwnerScopedCacheBatchWrite<T> = Omit<
  OwnerScopedCacheScope,
  "entryKey"
> & {
  entries: readonly { entryKey: string; value: T }[];
  updatedAt?: string;
};

export type OwnerScopedCacheRecord<T> = {
  schemaVersion: 1;
  recordKey: string;
  ownerKey: string;
  resetEpoch: number;
  entryKey: string;
  value: T;
  updatedAt: string;
};

export type MonotonicOwnerScopedCacheBatchWriteResult<T> =
  | {
      written: true;
      records: OwnerScopedCacheRecord<T>[];
    }
  | {
      written: false;
      currentCursor: number;
    };

export class StaleOwnerGenerationError extends Error {
  constructor() {
    super("Learning owner or reset epoch changed in another HANZI.OS tab.");
    this.name = "StaleOwnerGenerationError";
  }
}

export type SyncOperationKind = "snapshot" | "local-import" | "reset";

export type PendingSyncOperation = {
  protocolVersion: 1;
  operationId: string;
  idempotencyKey: string;
  ownerKey: string;
  installationId: string;
  deviceId: string;
  deviceSequence: number;
  baseRevision: number;
  kind: SyncOperationKind;
  contentVersion: string;
  occurredAt: string;
  requestHash: string;
  document: CloudSyncDocumentV1;
  attemptCount: number;
  lastAttemptAt: string | null;
  quarantinedAt: string | null;
  quarantineReason: string | null;
};

type NewSyncOperation = Omit<
  PendingSyncOperation,
  "attemptCount" | "lastAttemptAt" | "quarantinedAt" | "quarantineReason"
>;

type MetaRecord = {
  key: string;
  value: unknown;
};

type OwnerDocumentRecord = {
  ownerKey: string;
  revision: number;
  document: CloudSyncDocumentV1;
  updatedAt: string;
};

type OwnerLocalStateRecord = {
  ownerKey: string;
  state: LearningState;
  updatedAt: string;
};

const isOwnerGeneration = (value: unknown): value is OwnerGeneration => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<OwnerGeneration>;
  return typeof candidate.ownerKey === "string"
    && candidate.ownerKey.length > 0
    && Number.isSafeInteger(candidate.generation)
    && Number(candidate.generation) > 0;
};

const ownerGenerationMatches = (
  actual: OwnerGeneration | null,
  expected: OwnerGeneration,
) => actual?.ownerKey === expected.ownerKey
  && actual.generation === expected.generation;

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
      () => reject(transaction.error ?? new Error("IndexedDB transaction aborted")),
      { once: true },
    );
    transaction.addEventListener(
      "error",
      () => reject(transaction.error ?? new Error("IndexedDB transaction failed")),
      { once: true },
    );
  });

let databasePromise: Promise<IDBDatabase> | null = null;

const ensureOwnerScopedCacheStore = (
  database: IDBDatabase,
  transaction: IDBTransaction,
  storeName:
    | typeof LEARNING_PROJECTION_STORE
    | typeof LESSON_RESUME_STORE
    | typeof ASSESSMENT_RESUME_STORE,
) => {
  const store = database.objectStoreNames.contains(storeName)
    ? transaction.objectStore(storeName)
    : database.createObjectStore(storeName, { keyPath: "recordKey" });
  if (!store.indexNames.contains(OWNER_SCOPED_CACHE_OWNER_INDEX)) {
    store.createIndex(
      OWNER_SCOPED_CACHE_OWNER_INDEX,
      "ownerKey",
      { unique: false },
    );
  }
  if (!store.indexNames.contains(OWNER_SCOPED_CACHE_OWNER_EPOCH_INDEX)) {
    store.createIndex(
      OWNER_SCOPED_CACHE_OWNER_EPOCH_INDEX,
      ["ownerKey", "resetEpoch"],
      { unique: false },
    );
  }
};

export function openSyncDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;

  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, SYNC_DATABASE_VERSION);
    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      const upgradeTransaction = request.transaction;
      if (!upgradeTransaction) {
        throw new Error("IndexedDB upgrade transaction is unavailable.");
      }
      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE, { keyPath: "key" });
      }
      if (!database.objectStoreNames.contains(DOCUMENT_STORE)) {
        database.createObjectStore(DOCUMENT_STORE, { keyPath: "ownerKey" });
      }
      if (!database.objectStoreNames.contains(LOCAL_STATE_STORE)) {
        database.createObjectStore(LOCAL_STATE_STORE, { keyPath: "ownerKey" });
      }
      if (!database.objectStoreNames.contains(OUTBOX_STORE)) {
        const outbox = database.createObjectStore(OUTBOX_STORE, {
          keyPath: "operationId",
        });
        outbox.createIndex(OWNER_INDEX, "ownerKey", { unique: false });
      }
      if (!database.objectStoreNames.contains(LEARNING_COMMAND_OUTBOX_STORE)) {
        const commandOutbox = database.createObjectStore(
          LEARNING_COMMAND_OUTBOX_STORE,
          { keyPath: "recordKey" },
        );
        commandOutbox.createIndex(
          LEARNING_COMMAND_OWNER_INDEX,
          "ownerKey",
          { unique: false },
        );
        commandOutbox.createIndex(
          LEARNING_COMMAND_SESSION_ALIAS_INDEX,
          ["ownerKey", "sessionAliasLookupKey"],
          { unique: true },
        );
      }
      ensureOwnerScopedCacheStore(
        database,
        upgradeTransaction,
        LEARNING_PROJECTION_STORE,
      );
      ensureOwnerScopedCacheStore(
        database,
        upgradeTransaction,
        LESSON_RESUME_STORE,
      );
      ensureOwnerScopedCacheStore(
        database,
        upgradeTransaction,
        ASSESSMENT_RESUME_STORE,
      );
    });
    request.addEventListener("success", () => {
      const database = request.result;
      database.addEventListener("versionchange", () => database.close());
      resolve(database);
    });
    request.addEventListener("error", () => {
      databasePromise = null;
      reject(request.error);
    });
    request.addEventListener("blocked", () => {
      databasePromise = null;
      reject(new Error("IndexedDB upgrade is blocked by another HANZI.OS tab"));
    });
  });

  return databasePromise;
}

export async function readSyncMeta<T>(key: string): Promise<T | null> {
  const database = await openSyncDatabase();
  const transaction = database.transaction(META_STORE, "readonly");
  const record = await requestResult(
    transaction.objectStore(META_STORE).get(key) as IDBRequest<
      MetaRecord | undefined
    >,
  );
  await transactionDone(transaction);
  return (record?.value as T | undefined) ?? null;
}

export async function writeSyncMeta(key: string, value: unknown) {
  const database = await openSyncDatabase();
  const transaction = database.transaction(META_STORE, "readwrite");
  transaction.objectStore(META_STORE).put({ key, value } satisfies MetaRecord);
  await transactionDone(transaction);
}

export async function readOrInitializeOwnerGeneration(
  ownerKey: string,
): Promise<OwnerGenerationClaim> {
  const database = await openSyncDatabase();
  const transaction = database.transaction(META_STORE, "readwrite");
  const done = transactionDone(transaction);
  const store = transaction.objectStore(META_STORE);
  const record = await requestResult(
    store.get(ACTIVE_OWNER_GENERATION_KEY) as IDBRequest<MetaRecord | undefined>,
  );
  if (isOwnerGeneration(record?.value)) {
    await done;
    return { ownerGeneration: record.value, existed: true };
  }
  const ownerGeneration = { ownerKey, generation: 1 } satisfies OwnerGeneration;
  store.put({
    key: ACTIVE_OWNER_GENERATION_KEY,
    value: ownerGeneration,
  } satisfies MetaRecord);
  await done;
  return { ownerGeneration, existed: false };
}

export async function readOwnerGeneration(): Promise<OwnerGeneration | null> {
  return readSyncMeta<OwnerGeneration>(ACTIVE_OWNER_GENERATION_KEY)
    .then((value) => isOwnerGeneration(value) ? value : null);
}

/**
 * Resolves the active owner fence and that owner's canonical reset epoch from
 * one IndexedDB snapshot. Callers must still pass the returned generation to
 * every later cache transaction so an owner switch between read and write
 * fails closed.
 */
export async function readActiveOwnerLearningScope(): Promise<
  ActiveOwnerLearningScope | null
> {
  const database = await openSyncDatabase();
  const transaction = database.transaction(
    [META_STORE, DOCUMENT_STORE],
    "readonly",
  );
  const done = transactionDone(transaction);
  try {
    const generationRecord = await requestResult(
      transaction.objectStore(META_STORE).get(ACTIVE_OWNER_GENERATION_KEY) as
        IDBRequest<MetaRecord | undefined>,
    );
    const ownerGeneration = isOwnerGeneration(generationRecord?.value)
      ? generationRecord.value
      : null;
    if (!ownerGeneration) {
      await done;
      return null;
    }
    const documentRecord = await requestResult(
      transaction.objectStore(DOCUMENT_STORE).get(ownerGeneration.ownerKey) as
        IDBRequest<OwnerDocumentRecord | undefined>,
    );
    const resetEpoch = documentRecord?.document.reset.epoch ?? 0;
    if (!isValidLearningResetEpoch(resetEpoch)) {
      throw new Error("Active owner learning reset epoch is invalid.");
    }
    await done;
    return { ownerGeneration, resetEpoch };
  } catch (error) {
    abortTransaction(transaction);
    await done.catch(() => undefined);
    throw error;
  }
}

const assertOwnerGeneration = async (
  transaction: IDBTransaction,
  expected: OwnerGeneration,
) => {
  const record = await requestResult(
    transaction.objectStore(META_STORE).get(ACTIVE_OWNER_GENERATION_KEY) as
      IDBRequest<MetaRecord | undefined>,
  );
  const actual = isOwnerGeneration(record?.value) ? record.value : null;
  if (!ownerGenerationMatches(actual, expected)) {
    throw new StaleOwnerGenerationError();
  }
};

const assertOwnerLearningScope = async (
  transaction: IDBTransaction,
  scope: OwnerScopedCacheScope,
) => {
  await assertOwnerGeneration(transaction, scope.expectedOwnerGeneration);
  const documentRecord = await requestResult(
    transaction.objectStore(DOCUMENT_STORE).get(
      scope.expectedOwnerGeneration.ownerKey,
    ) as IDBRequest<OwnerDocumentRecord | undefined>,
  );
  const activeResetEpoch = documentRecord?.document.reset.epoch ?? 0;
  if (
    !isValidLearningResetEpoch(activeResetEpoch)
    || activeResetEpoch !== scope.resetEpoch
  ) {
    throw new StaleOwnerGenerationError();
  }
};

const abortTransaction = (transaction: IDBTransaction) => {
  try {
    transaction.abort();
  } catch {
    // The transaction may already have completed after an IndexedDB error.
  }
};

type OwnerScopedCacheStoreName =
  | typeof LEARNING_PROJECTION_STORE
  | typeof LESSON_RESUME_STORE
  | typeof ASSESSMENT_RESUME_STORE;

const OWNER_SCOPED_CACHE_STORES: readonly OwnerScopedCacheStoreName[] = [
  LEARNING_PROJECTION_STORE,
  LESSON_RESUME_STORE,
  ASSESSMENT_RESUME_STORE,
];

const assertOwnerScopedCacheScope = (scope: OwnerScopedCacheScope) => {
  if (
    !scope.expectedOwnerGeneration.ownerKey
    || !Number.isSafeInteger(scope.expectedOwnerGeneration.generation)
    || scope.expectedOwnerGeneration.generation < 1
  ) {
    throw new StaleOwnerGenerationError();
  }
  if (!isValidLearningResetEpoch(scope.resetEpoch)) {
    throw new Error("Owner-scoped cache reset epoch is invalid.");
  }
  if (scope.entryKey.length < 1 || scope.entryKey.length > 240) {
    throw new Error("Owner-scoped cache entry key is invalid.");
  }
};

const ownerScopedCacheRecordKey = (
  ownerKey: string,
  resetEpoch: number,
  entryKey: string,
) => JSON.stringify([ownerKey, resetEpoch, entryKey]);

const normalizedCacheUpdatedAt = (value: string | undefined) => {
  const parsed = value === undefined ? new Date() : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Owner-scoped cache timestamp is invalid.");
  }
  return parsed.toISOString();
};

const readOwnerScopedCache = async <T>(
  storeName: OwnerScopedCacheStoreName,
  scope: OwnerScopedCacheScope,
): Promise<OwnerScopedCacheRecord<T> | null> => {
  assertOwnerScopedCacheScope(scope);
  const database = await openSyncDatabase();
  const transaction = database.transaction(
    [META_STORE, DOCUMENT_STORE, storeName],
    "readonly",
  );
  const done = transactionDone(transaction);
  try {
    await assertOwnerLearningScope(transaction, scope);
    const record = await requestResult(
      transaction.objectStore(storeName).get(ownerScopedCacheRecordKey(
        scope.expectedOwnerGeneration.ownerKey,
        scope.resetEpoch,
        scope.entryKey,
      )) as IDBRequest<OwnerScopedCacheRecord<T> | undefined>,
    );
    await done;
    return record ?? null;
  } catch (error) {
    abortTransaction(transaction);
    await done.catch(() => undefined);
    throw error;
  }
};

const writeOwnerScopedCache = async <T>(
  storeName: OwnerScopedCacheStoreName,
  input: OwnerScopedCacheWrite<T>,
): Promise<OwnerScopedCacheRecord<T>> => {
  assertOwnerScopedCacheScope(input);
  const database = await openSyncDatabase();
  const transaction = database.transaction(
    [META_STORE, DOCUMENT_STORE, storeName],
    "readwrite",
  );
  const done = transactionDone(transaction);
  try {
    await assertOwnerLearningScope(transaction, input);
    const record = {
      schemaVersion: 1,
      recordKey: ownerScopedCacheRecordKey(
        input.expectedOwnerGeneration.ownerKey,
        input.resetEpoch,
        input.entryKey,
      ),
      ownerKey: input.expectedOwnerGeneration.ownerKey,
      resetEpoch: input.resetEpoch,
      entryKey: input.entryKey,
      value: input.value,
      updatedAt: normalizedCacheUpdatedAt(input.updatedAt),
    } satisfies OwnerScopedCacheRecord<T>;
    transaction.objectStore(storeName).put(record);
    await done;
    return record;
  } catch (error) {
    abortTransaction(transaction);
    await done.catch(() => undefined);
    throw error;
  }
};

const writeOwnerScopedCacheBatch = async <T>(
  storeName: OwnerScopedCacheStoreName,
  input: OwnerScopedCacheBatchWrite<T>,
): Promise<OwnerScopedCacheRecord<T>[]> => {
  if (input.entries.length < 1 || input.entries.length > 10) {
    throw new Error("Owner-scoped cache batch size is invalid.");
  }
  const entryKeys = new Set<string>();
  for (const entry of input.entries) {
    assertOwnerScopedCacheScope({
      expectedOwnerGeneration: input.expectedOwnerGeneration,
      resetEpoch: input.resetEpoch,
      entryKey: entry.entryKey,
    });
    if (entryKeys.has(entry.entryKey)) {
      throw new Error("Owner-scoped cache batch contains a duplicate key.");
    }
    entryKeys.add(entry.entryKey);
  }

  const database = await openSyncDatabase();
  const transaction = database.transaction(
    [META_STORE, DOCUMENT_STORE, storeName],
    "readwrite",
  );
  const done = transactionDone(transaction);
  try {
    await assertOwnerLearningScope(transaction, {
      expectedOwnerGeneration: input.expectedOwnerGeneration,
      resetEpoch: input.resetEpoch,
      entryKey: input.entries[0]!.entryKey,
    });
    const updatedAt = normalizedCacheUpdatedAt(input.updatedAt);
    const store = transaction.objectStore(storeName);
    const records = input.entries.map((entry) => ({
      schemaVersion: 1 as const,
      recordKey: ownerScopedCacheRecordKey(
        input.expectedOwnerGeneration.ownerKey,
        input.resetEpoch,
        entry.entryKey,
      ),
      ownerKey: input.expectedOwnerGeneration.ownerKey,
      resetEpoch: input.resetEpoch,
      entryKey: entry.entryKey,
      value: entry.value,
      updatedAt,
    }));
    records.forEach((record) => store.put(record));
    await done;
    return records;
  } catch (error) {
    abortTransaction(transaction);
    await done.catch(() => undefined);
    throw error;
  }
};

const writeOwnerScopedCacheBatchWithMonotonicCursor = async <
  T extends { cursor: number },
>(
  storeName: OwnerScopedCacheStoreName,
  input: OwnerScopedCacheBatchWrite<T>,
  existingCursor: (entryKey: string, value: unknown) => number | null =
    (_entryKey, value) => {
      if (
        typeof value !== "object"
        || value === null
        || !("cursor" in value)
      ) return null;
      const cursor = (value as { cursor?: unknown }).cursor;
      return typeof cursor === "number"
        && Number.isSafeInteger(cursor)
        && cursor >= 0
        ? cursor
        : null;
    },
): Promise<MonotonicOwnerScopedCacheBatchWriteResult<T>> => {
  if (input.entries.length < 1 || input.entries.length > 10) {
    throw new Error("Owner-scoped cache batch size is invalid.");
  }
  const entryKeys = new Set<string>();
  const candidateCursor = input.entries[0]?.value.cursor;
  if (
    typeof candidateCursor !== "number"
    || !Number.isSafeInteger(candidateCursor)
    || candidateCursor < 0
  ) {
    throw new Error("Owner-scoped cache cursor is invalid.");
  }
  for (const entry of input.entries) {
    assertOwnerScopedCacheScope({
      expectedOwnerGeneration: input.expectedOwnerGeneration,
      resetEpoch: input.resetEpoch,
      entryKey: entry.entryKey,
    });
    if (
      entryKeys.has(entry.entryKey)
      || entry.value.cursor !== candidateCursor
    ) {
      throw new Error(
        "Owner-scoped cache batch keys or cursors are inconsistent.",
      );
    }
    entryKeys.add(entry.entryKey);
  }

  const database = await openSyncDatabase();
  const transaction = database.transaction(
    [META_STORE, DOCUMENT_STORE, storeName],
    "readwrite",
  );
  const done = transactionDone(transaction);
  try {
    await assertOwnerLearningScope(transaction, {
      expectedOwnerGeneration: input.expectedOwnerGeneration,
      resetEpoch: input.resetEpoch,
      entryKey: input.entries[0]!.entryKey,
    });
    const store = transaction.objectStore(storeName);
    let currentCursor = -1;
    for (const entry of input.entries) {
      const existing = await requestResult(
        store.get(ownerScopedCacheRecordKey(
          input.expectedOwnerGeneration.ownerKey,
          input.resetEpoch,
          entry.entryKey,
        )) as IDBRequest<OwnerScopedCacheRecord<unknown> | undefined>,
      );
      const cursor = existing
        ? existingCursor(entry.entryKey, existing.value)
        : null;
      if (
        typeof cursor === "number"
        && Number.isSafeInteger(cursor)
        && cursor >= 0
      ) {
        currentCursor = Math.max(currentCursor, cursor);
      }
    }
    if (currentCursor > candidateCursor) {
      await done;
      return { written: false, currentCursor };
    }

    const updatedAt = normalizedCacheUpdatedAt(input.updatedAt);
    const records = input.entries.map((entry) => ({
      schemaVersion: 1 as const,
      recordKey: ownerScopedCacheRecordKey(
        input.expectedOwnerGeneration.ownerKey,
        input.resetEpoch,
        entry.entryKey,
      ),
      ownerKey: input.expectedOwnerGeneration.ownerKey,
      resetEpoch: input.resetEpoch,
      entryKey: entry.entryKey,
      value: entry.value,
      updatedAt,
    }));
    records.forEach((record) => store.put(record));
    await done;
    return { written: true, records };
  } catch (error) {
    abortTransaction(transaction);
    await done.catch(() => undefined);
    throw error;
  }
};

const deleteOwnerScopedCache = async (
  storeName: OwnerScopedCacheStoreName,
  scope: OwnerScopedCacheScope,
) => {
  assertOwnerScopedCacheScope(scope);
  const database = await openSyncDatabase();
  const transaction = database.transaction(
    [META_STORE, DOCUMENT_STORE, storeName],
    "readwrite",
  );
  const done = transactionDone(transaction);
  try {
    await assertOwnerLearningScope(transaction, scope);
    transaction.objectStore(storeName).delete(ownerScopedCacheRecordKey(
      scope.expectedOwnerGeneration.ownerKey,
      scope.resetEpoch,
      scope.entryKey,
    ));
    await done;
  } catch (error) {
    abortTransaction(transaction);
    await done.catch(() => undefined);
    throw error;
  }
};

const deleteOwnerRecordsFromCacheStore = async (
  transaction: IDBTransaction,
  storeName: OwnerScopedCacheStoreName,
  ownerKey: string,
) => {
  const store = transaction.objectStore(storeName);
  const recordKeys = await requestResult(
    store.index(OWNER_SCOPED_CACHE_OWNER_INDEX).getAllKeys(
      IDBKeyRange.only(ownerKey),
    ),
  );
  recordKeys.forEach((recordKey) => store.delete(recordKey));
};

const deleteOwnerRecordsFromAllCaches = async (
  transaction: IDBTransaction,
  ownerKey: string,
) => {
  for (const storeName of OWNER_SCOPED_CACHE_STORES) {
    await deleteOwnerRecordsFromCacheStore(transaction, storeName, ownerKey);
  }
};

const deleteOwnerNormalizedLearningState = async (
  transaction: IDBTransaction,
  ownerKey: string,
) => {
  const learningCommands = transaction.objectStore(
    LEARNING_COMMAND_OUTBOX_STORE,
  );
  const commandKeys = await requestResult(
    learningCommands
      .index(LEARNING_COMMAND_OWNER_INDEX)
      .getAllKeys(IDBKeyRange.only(ownerKey)),
  );
  commandKeys.forEach((recordKey) => learningCommands.delete(recordKey));
  await deleteOwnerRecordsFromAllCaches(transaction, ownerKey);
};

export const readLearningProjection = <T>(scope: OwnerScopedCacheScope) =>
  readOwnerScopedCache<T>(LEARNING_PROJECTION_STORE, scope);

export const writeLearningProjection = <T>(input: OwnerScopedCacheWrite<T>) =>
  writeOwnerScopedCache(LEARNING_PROJECTION_STORE, input);

export const writeLearningProjectionBatch = <T>(
  input: OwnerScopedCacheBatchWrite<T>,
) => writeOwnerScopedCacheBatch(LEARNING_PROJECTION_STORE, input);

export const writeLearningProjectionBatchWithMonotonicCursor = <
  T extends { cursor: number },
>(
  input: OwnerScopedCacheBatchWrite<T>,
  existingCursor?: (entryKey: string, value: unknown) => number | null,
) => writeOwnerScopedCacheBatchWithMonotonicCursor(
  LEARNING_PROJECTION_STORE,
  input,
  existingCursor,
);

export const deleteLearningProjection = (scope: OwnerScopedCacheScope) =>
  deleteOwnerScopedCache(LEARNING_PROJECTION_STORE, scope);

export const readLessonResume = <T>(scope: OwnerScopedCacheScope) =>
  readOwnerScopedCache<T>(LESSON_RESUME_STORE, scope);

export const writeLessonResume = <T>(input: OwnerScopedCacheWrite<T>) =>
  writeOwnerScopedCache(LESSON_RESUME_STORE, input);

export const deleteLessonResume = (scope: OwnerScopedCacheScope) =>
  deleteOwnerScopedCache(LESSON_RESUME_STORE, scope);

export const readAssessmentResume = <T>(scope: OwnerScopedCacheScope) =>
  readOwnerScopedCache<T>(ASSESSMENT_RESUME_STORE, scope);

export const writeAssessmentResume = <T>(input: OwnerScopedCacheWrite<T>) =>
  writeOwnerScopedCache(ASSESSMENT_RESUME_STORE, input);

export const deleteAssessmentResume = (scope: OwnerScopedCacheScope) =>
  deleteOwnerScopedCache(ASSESSMENT_RESUME_STORE, scope);

export async function clearOwnerScopedLearningCaches(
  expectedOwnerGeneration: OwnerGeneration,
) {
  const database = await openSyncDatabase();
  const transaction = database.transaction(
    [META_STORE, ...OWNER_SCOPED_CACHE_STORES],
    "readwrite",
  );
  const done = transactionDone(transaction);
  try {
    await assertOwnerGeneration(transaction, expectedOwnerGeneration);
    await deleteOwnerRecordsFromAllCaches(
      transaction,
      expectedOwnerGeneration.ownerKey,
    );
    await done;
  } catch (error) {
    abortTransaction(transaction);
    await done.catch(() => undefined);
    throw error;
  }
}

export async function readOwnerDocument(
  ownerKey: string,
): Promise<OwnerDocumentRecord | null> {
  const database = await openSyncDatabase();
  const transaction = database.transaction(DOCUMENT_STORE, "readonly");
  const record = await requestResult(
    transaction.objectStore(DOCUMENT_STORE).get(ownerKey) as IDBRequest<
      OwnerDocumentRecord | undefined
    >,
  );
  await transactionDone(transaction);
  return record ?? null;
}

export async function readOwnerLocalState(
  ownerKey: string,
): Promise<LearningState | null> {
  const database = await openSyncDatabase();
  const transaction = database.transaction(LOCAL_STATE_STORE, "readonly");
  const record = await requestResult(
    transaction.objectStore(LOCAL_STATE_STORE).get(ownerKey) as IDBRequest<
      OwnerLocalStateRecord | undefined
    >,
  );
  await transactionDone(transaction);
  return record?.state ?? null;
}

export async function writeOwnerCheckpoint(
  ownerKey: string,
  revision: number,
  document: CloudSyncDocumentV1,
  localState: LearningState,
  expectedOwnerGeneration?: OwnerGeneration,
) {
  const database = await openSyncDatabase();
  const transaction = database.transaction(
    expectedOwnerGeneration
      ? [
          META_STORE,
          DOCUMENT_STORE,
          LOCAL_STATE_STORE,
          LEARNING_COMMAND_OUTBOX_STORE,
          ...OWNER_SCOPED_CACHE_STORES,
        ]
      : [
          DOCUMENT_STORE,
          LOCAL_STATE_STORE,
          LEARNING_COMMAND_OUTBOX_STORE,
          ...OWNER_SCOPED_CACHE_STORES,
        ],
    "readwrite",
  );
  const done = transactionDone(transaction);
  try {
    if (expectedOwnerGeneration) {
      await assertOwnerGeneration(transaction, expectedOwnerGeneration);
      if (ownerKey !== expectedOwnerGeneration.ownerKey) {
        throw new StaleOwnerGenerationError();
      }
    }
  const documents = transaction.objectStore(DOCUMENT_STORE);
  const previous = await requestResult(
    documents.get(ownerKey) as IDBRequest<OwnerDocumentRecord | undefined>,
  );
  const resetEpochChanged = (previous?.document.reset.epoch ?? 0)
    !== document.reset.epoch;
  if (resetEpochChanged) {
    await deleteOwnerNormalizedLearningState(transaction, ownerKey);
  } else if (!previous) {
    await deleteOwnerRecordsFromAllCaches(transaction, ownerKey);
  }
  const updatedAt = new Date().toISOString();
  documents.put({
    ownerKey,
    revision,
    document,
    updatedAt,
  } satisfies OwnerDocumentRecord);
  transaction.objectStore(LOCAL_STATE_STORE).put({
    ownerKey,
    state: localState,
    updatedAt,
  } satisfies OwnerLocalStateRecord);
    await done;
  } catch (error) {
    abortTransaction(transaction);
    await done.catch(() => undefined);
    throw error;
  }
}

async function persistSyncOperation(
  operation: NewSyncOperation,
  localState: LearningState,
  sourceOwnerToDelete?: string,
  expectedOwnerGeneration?: OwnerGeneration,
): Promise<{
  queued: PendingSyncOperation;
  ownerGeneration: OwnerGeneration | null;
}> {
  const database = await openSyncDatabase();
  const transactionStores = expectedOwnerGeneration
    ? [META_STORE, DOCUMENT_STORE, LOCAL_STATE_STORE, OUTBOX_STORE]
    : [DOCUMENT_STORE, LOCAL_STATE_STORE, OUTBOX_STORE];
  if (sourceOwnerToDelete || operation.kind === "reset") {
    transactionStores.push(
      LEARNING_COMMAND_OUTBOX_STORE,
      ...OWNER_SCOPED_CACHE_STORES,
    );
  }
  const transaction = database.transaction(
    [...new Set(transactionStores)],
    "readwrite",
  );
  const done = transactionDone(transaction);
  try {
    if (expectedOwnerGeneration) {
      await assertOwnerGeneration(transaction, expectedOwnerGeneration);
    }
    if (
      sourceOwnerToDelete
      && sourceOwnerToDelete !== expectedOwnerGeneration?.ownerKey
    ) {
      throw new StaleOwnerGenerationError();
    }
    if (
      !sourceOwnerToDelete
      && expectedOwnerGeneration
      && operation.ownerKey !== expectedOwnerGeneration.ownerKey
    ) {
      throw new StaleOwnerGenerationError();
    }
  const queued: PendingSyncOperation = {
    ...operation,
    attemptCount: 0,
    lastAttemptAt: null,
    quarantinedAt: null,
    quarantineReason: null,
  };
  const updatedAt = new Date().toISOString();
  const documents = transaction.objectStore(DOCUMENT_STORE);
  const localStates = transaction.objectStore(LOCAL_STATE_STORE);
  documents.put({
    ownerKey: operation.ownerKey,
    revision: operation.baseRevision,
    document: operation.document,
    updatedAt,
  } satisfies OwnerDocumentRecord);
  localStates.put({
    ownerKey: operation.ownerKey,
    state: localState,
    updatedAt,
  } satisfies OwnerLocalStateRecord);
  const outbox = transaction.objectStore(OUTBOX_STORE);
  if (sourceOwnerToDelete && sourceOwnerToDelete !== operation.ownerKey) {
    documents.delete(sourceOwnerToDelete);
    localStates.delete(sourceOwnerToDelete);
    const sourceOperationKeys = await requestResult(
      outbox.index(OWNER_INDEX).getAllKeys(IDBKeyRange.only(sourceOwnerToDelete)),
    );
    sourceOperationKeys.forEach((operationKey) => outbox.delete(operationKey));
    const learningCommands = transaction.objectStore(
      LEARNING_COMMAND_OUTBOX_STORE,
    );
    const sourceCommandKeys = await requestResult(
      learningCommands
        .index(LEARNING_COMMAND_OWNER_INDEX)
        .getAllKeys(IDBKeyRange.only(sourceOwnerToDelete)),
    );
    sourceCommandKeys.forEach((recordKey) => learningCommands.delete(recordKey));
    await deleteOwnerRecordsFromAllCaches(transaction, sourceOwnerToDelete);
    // The target checkpoint is replaced by the adopted canonical document.
    // Derived state from an earlier visit to that owner must be rebuilt, never
    // combined with or reassigned from the anonymous source owner.
    await deleteOwnerRecordsFromAllCaches(transaction, operation.ownerKey);
  }
  if (operation.kind === "reset") {
    const existing = await requestResult(
      outbox.index(OWNER_INDEX).getAll(IDBKeyRange.only(operation.ownerKey)) as
        IDBRequest<PendingSyncOperation[]>,
    );
    existing.forEach((pending) => {
      if (pending.deviceSequence <= operation.deviceSequence) {
        outbox.delete(pending.operationId);
      }
    });
    const learningCommands = transaction.objectStore(
      LEARNING_COMMAND_OUTBOX_STORE,
    );
    const commandKeys = await requestResult(
      learningCommands
        .index(LEARNING_COMMAND_OWNER_INDEX)
        .getAllKeys(IDBKeyRange.only(operation.ownerKey)),
    );
    commandKeys.forEach((recordKey) => learningCommands.delete(recordKey));
    await deleteOwnerRecordsFromAllCaches(transaction, operation.ownerKey);
  }
  outbox.put(queued);
    const nextOwnerGeneration = sourceOwnerToDelete && expectedOwnerGeneration
      ? {
          ownerKey: operation.ownerKey,
          generation: expectedOwnerGeneration.generation + 1,
        } satisfies OwnerGeneration
      : expectedOwnerGeneration ?? null;
    if (sourceOwnerToDelete && nextOwnerGeneration) {
      transaction.objectStore(META_STORE).put({
        key: ACTIVE_OWNER_GENERATION_KEY,
        value: nextOwnerGeneration,
      } satisfies MetaRecord);
    }
  await done;
    return { queued, ownerGeneration: nextOwnerGeneration };
  } catch (error) {
    abortTransaction(transaction);
    await done.catch(() => undefined);
    throw error;
  }
}

export function enqueueSyncOperation(
  operation: NewSyncOperation,
  localState: LearningState,
  expectedOwnerGeneration?: OwnerGeneration,
) {
  return persistSyncOperation(
    operation,
    localState,
    undefined,
    expectedOwnerGeneration,
  ).then(({ queued }) => queued);
}

export function enqueueOwnerAdoptionOperation(
  sourceOwnerKey: string,
  operation: NewSyncOperation,
  localState: LearningState,
  expectedOwnerGeneration: OwnerGeneration,
) {
  if (sourceOwnerKey === operation.ownerKey) {
    throw new Error("Owner adoption requires distinct source and target owners.");
  }
  return persistSyncOperation(
    operation,
    localState,
    sourceOwnerKey,
    expectedOwnerGeneration,
  ).then(({ ownerGeneration }) => {
    if (!ownerGeneration) throw new StaleOwnerGenerationError();
    return ownerGeneration;
  });
}

export async function transitionOwnerCheckpoint(
  expectedOwnerGeneration: OwnerGeneration,
  nextOwnerKey: string,
  revision: number,
  document: CloudSyncDocumentV1,
  localState: LearningState,
): Promise<OwnerGeneration> {
  const database = await openSyncDatabase();
  const transaction = database.transaction(
    [
      META_STORE,
      DOCUMENT_STORE,
      LOCAL_STATE_STORE,
      LEARNING_COMMAND_OUTBOX_STORE,
      ...OWNER_SCOPED_CACHE_STORES,
    ],
    "readwrite",
  );
  const done = transactionDone(transaction);
  try {
    await assertOwnerGeneration(transaction, expectedOwnerGeneration);
    const ownerGeneration = {
      ownerKey: nextOwnerKey,
      generation: expectedOwnerGeneration.generation + 1,
    } satisfies OwnerGeneration;
    const documents = transaction.objectStore(DOCUMENT_STORE);
    const previous = await requestResult(
      documents.get(nextOwnerKey) as IDBRequest<OwnerDocumentRecord | undefined>,
    );
    const resetEpochChanged = (previous?.document.reset.epoch ?? 0)
      !== document.reset.epoch;
    if (resetEpochChanged) {
      await deleteOwnerNormalizedLearningState(transaction, nextOwnerKey);
    } else if (!previous) {
      await deleteOwnerRecordsFromAllCaches(transaction, nextOwnerKey);
    }
    const updatedAt = new Date().toISOString();
    documents.put({
      ownerKey: nextOwnerKey,
      revision,
      document,
      updatedAt,
    } satisfies OwnerDocumentRecord);
    transaction.objectStore(LOCAL_STATE_STORE).put({
      ownerKey: nextOwnerKey,
      state: localState,
      updatedAt,
    } satisfies OwnerLocalStateRecord);
    transaction.objectStore(META_STORE).put({
      key: ACTIVE_OWNER_GENERATION_KEY,
      value: ownerGeneration,
    } satisfies MetaRecord);
    await done;
    return ownerGeneration;
  } catch (error) {
    abortTransaction(transaction);
    await done.catch(() => undefined);
    throw error;
  }
}

export async function allocateDeviceSequence(): Promise<number> {
  const database = await openSyncDatabase();
  const transaction = database.transaction(META_STORE, "readwrite");
  const store = transaction.objectStore(META_STORE);
  const record = await requestResult(
    store.get("deviceSequence") as IDBRequest<MetaRecord | undefined>,
  );
  const next = typeof record?.value === "number" ? record.value + 1 : 1;
  store.put({ key: "deviceSequence", value: next } satisfies MetaRecord);
  await transactionDone(transaction);
  return next;
}

export async function listPendingOperations(
  ownerKey: string,
): Promise<PendingSyncOperation[]> {
  const database = await openSyncDatabase();
  const transaction = database.transaction(OUTBOX_STORE, "readonly");
  const index = transaction.objectStore(OUTBOX_STORE).index(OWNER_INDEX);
  const records = await requestResult(
    index.getAll(IDBKeyRange.only(ownerKey)) as IDBRequest<PendingSyncOperation[]>,
  );
  await transactionDone(transaction);
  return records
    .filter((operation) => operation.quarantinedAt == null)
    .sort((left, right) => left.deviceSequence - right.deviceSequence);
}

export async function countPendingOperations(ownerKey: string) {
  return (await listPendingOperations(ownerKey)).length;
}

export async function listQuarantinedOperations(
  ownerKey: string,
): Promise<PendingSyncOperation[]> {
  const database = await openSyncDatabase();
  const transaction = database.transaction(OUTBOX_STORE, "readonly");
  const records = await requestResult(
    transaction
      .objectStore(OUTBOX_STORE)
      .index(OWNER_INDEX)
      .getAll(IDBKeyRange.only(ownerKey)) as IDBRequest<PendingSyncOperation[]>,
  );
  await transactionDone(transaction);
  return records
    .filter((operation) => operation.quarantinedAt != null)
    .sort((left, right) => left.deviceSequence - right.deviceSequence);
}

export async function markSyncAttempt(operationId: string) {
  const database = await openSyncDatabase();
  const transaction = database.transaction(OUTBOX_STORE, "readwrite");
  const store = transaction.objectStore(OUTBOX_STORE);
  const operation = await requestResult(
    store.get(operationId) as IDBRequest<PendingSyncOperation | undefined>,
  );
  if (operation) {
    store.put({
      ...operation,
      attemptCount: operation.attemptCount + 1,
      lastAttemptAt: new Date().toISOString(),
    } satisfies PendingSyncOperation);
  }
  await transactionDone(transaction);
}

export async function quarantineSyncOperation(
  operationId: string,
  reason: string,
) {
  const database = await openSyncDatabase();
  const transaction = database.transaction(OUTBOX_STORE, "readwrite");
  const store = transaction.objectStore(OUTBOX_STORE);
  const operation = await requestResult(
    store.get(operationId) as IDBRequest<PendingSyncOperation | undefined>,
  );
  if (operation) {
    store.put({
      ...operation,
      quarantinedAt: new Date().toISOString(),
      quarantineReason: reason,
    } satisfies PendingSyncOperation);
  }
  await transactionDone(transaction);
}

export async function acknowledgeSyncOperation(
  operationId: string,
  ownerKey: string,
  revision: number,
  document: CloudSyncDocumentV1,
  localState: LearningState,
  expectedOwnerGeneration?: OwnerGeneration,
) {
  const database = await openSyncDatabase();
  const transaction = database.transaction(
    expectedOwnerGeneration
      ? [
          META_STORE,
          OUTBOX_STORE,
          DOCUMENT_STORE,
          LOCAL_STATE_STORE,
          LEARNING_COMMAND_OUTBOX_STORE,
          ...OWNER_SCOPED_CACHE_STORES,
        ]
      : [
          OUTBOX_STORE,
          DOCUMENT_STORE,
          LOCAL_STATE_STORE,
          LEARNING_COMMAND_OUTBOX_STORE,
          ...OWNER_SCOPED_CACHE_STORES,
        ],
    "readwrite",
  );
  const done = transactionDone(transaction);
  try {
    if (expectedOwnerGeneration) {
      await assertOwnerGeneration(transaction, expectedOwnerGeneration);
      if (ownerKey !== expectedOwnerGeneration.ownerKey) {
        throw new StaleOwnerGenerationError();
      }
    }
  const documents = transaction.objectStore(DOCUMENT_STORE);
  const previous = await requestResult(
    documents.get(ownerKey) as IDBRequest<OwnerDocumentRecord | undefined>,
  );
  const resetEpochChanged = (previous?.document.reset.epoch ?? 0)
    !== document.reset.epoch;
  if (resetEpochChanged) {
    await deleteOwnerNormalizedLearningState(transaction, ownerKey);
  } else if (!previous) {
    await deleteOwnerRecordsFromAllCaches(transaction, ownerKey);
  }
  const updatedAt = new Date().toISOString();
  transaction.objectStore(OUTBOX_STORE).delete(operationId);
  documents.put({
    ownerKey,
    revision,
    document,
    updatedAt,
  } satisfies OwnerDocumentRecord);
  transaction.objectStore(LOCAL_STATE_STORE).put({
    ownerKey,
    state: localState,
    updatedAt,
  } satisfies OwnerLocalStateRecord);
    await done;
  } catch (error) {
    abortTransaction(transaction);
    await done.catch(() => undefined);
    throw error;
  }
}

/**
 * Compatibility snapshot helper only. Normalized learning commands are bound
 * to their original owner/session authority and must never be reassigned.
 */
export async function reassignPendingOperations(
  fromOwnerKey: string,
  toOwnerKey: string,
) {
  if (fromOwnerKey === toOwnerKey) return;
  const database = await openSyncDatabase();
  const transaction = database.transaction(OUTBOX_STORE, "readwrite");
  const store = transaction.objectStore(OUTBOX_STORE);
  const done = transactionDone(transaction);
  const operations = await requestResult(
    store.index(OWNER_INDEX).getAll(IDBKeyRange.only(fromOwnerKey)) as
      IDBRequest<PendingSyncOperation[]>,
  );
  operations.forEach((operation) => {
    store.put({ ...operation, ownerKey: toOwnerKey });
  });
  await done;
}

export async function deleteOwnerData(ownerKey: string) {
  const database = await openSyncDatabase();
  const transaction = database.transaction(
    [
      DOCUMENT_STORE,
      LOCAL_STATE_STORE,
      OUTBOX_STORE,
      LEARNING_COMMAND_OUTBOX_STORE,
      ...OWNER_SCOPED_CACHE_STORES,
    ],
    "readwrite",
  );
  transaction.objectStore(DOCUMENT_STORE).delete(ownerKey);
  transaction.objectStore(LOCAL_STATE_STORE).delete(ownerKey);
  const outbox = transaction.objectStore(OUTBOX_STORE);
  const done = transactionDone(transaction);
  const operationKeys = await requestResult(
    outbox.index(OWNER_INDEX).getAllKeys(IDBKeyRange.only(ownerKey)),
  );
  operationKeys.forEach((operationKey) => outbox.delete(operationKey));
  const learningCommands = transaction.objectStore(
    LEARNING_COMMAND_OUTBOX_STORE,
  );
  const commandKeys = await requestResult(
    learningCommands
      .index(LEARNING_COMMAND_OWNER_INDEX)
      .getAllKeys(IDBKeyRange.only(ownerKey)),
  );
  commandKeys.forEach((recordKey) => learningCommands.delete(recordKey));
  await deleteOwnerRecordsFromAllCaches(transaction, ownerKey);
  await done;
}

export async function resetSyncDatabaseForTests() {
  const database = databasePromise ? await databasePromise.catch(() => null) : null;
  database?.close();
  databasePromise = null;
}
