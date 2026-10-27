import { OWNER_RECOVERY_STORES, SYNC_DATABASE_VERSION } from './ownerRecoverySchema';
export { OWNER_RECOVERY_STORES, SYNC_DATABASE_VERSION } from './ownerRecoverySchema';
import type { LearningState } from "../types";
import { isValidLearningResetEpoch } from "../learning/resetEpoch";
import type { CloudSyncDocumentV1 } from "./types";
import { canonicalStringify } from "./canonicalHash";
import { isLessonHistoryEvent, LESSON_HISTORY_ENTRY_PREFIX, type LessonHistoryEventV1 } from "../learning/lessonHistory";
import { documentActivityHistoryEntries, documentActivityHistoryEvent } from './documentActivityHistory';
import { avatarStorageKey } from '../profile/avatarContract';
import { assertOwnerRecoveryIdle } from './ownerRecoveryFence';
import { WORKSPACE_PAGE_PREFIX } from './workspaceStorageFormat';

export class LessonHistoryStateChangedError extends Error {}

export type GuestLessonHistoryCommit = {
  expectedState: LearningState;
  scope: ActiveOwnerLearningScope;
  event: LessonHistoryEventV1;
};

export type DocumentMutationCommit = { expectedState: LearningState; scope: ActiveOwnerLearningScope };

const DATABASE_NAME = "hanzi-os-sync-v1";

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
  try {
  await assertOwnerRecoveryIdle(store);
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
  } catch (error) {
    abortTransaction(transaction);
    await done.catch(() => undefined);
    throw error;
  }
}

export async function readOwnerGeneration(): Promise<OwnerGeneration | null> {
  const database = await openSyncDatabase();
  const transaction = database.transaction(META_STORE, 'readonly');
  const done = transactionDone(transaction);
  try {
    const store = transaction.objectStore(META_STORE);
    await assertOwnerRecoveryIdle(store);
    const row = await requestResult(store.get(ACTIVE_OWNER_GENERATION_KEY)) as MetaRecord | undefined;
    await done;
    return isOwnerGeneration(row?.value) ? row.value : null;
  } catch (error) { abortTransaction(transaction); await done.catch(() => undefined); throw error; }
}

/**
 * Resolves the active owner fence and that owner's canonical reset epoch from
 * one IndexedDB snapshot. Callers must still pass the returned generation to
 * every later cache transaction so an owner switch between read and write
 * fails closed.
 */
export async function readActiveOwnerLearningScope(options: { allowRecoveryPreview?: boolean } = {}): Promise<
  ActiveOwnerLearningScope | null
> {
  const database = await openSyncDatabase();
  const transaction = database.transaction(
    [META_STORE, DOCUMENT_STORE],
    "readonly",
  );
  const done = transactionDone(transaction);
  try {
    await assertOwnerRecoveryIdle(transaction.objectStore(META_STORE), options.allowRecoveryPreview === true);
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



export type OwnerRecoverySnapshot = {
  version: 1;
  databaseVersion: number;
  coverage: 'indexeddb-owner-only';
  scope: ActiveOwnerLearningScope;
  capturedAt: string;
  stores: Record<typeof OWNER_RECOVERY_STORES[number], unknown[]>;
  avatar: unknown;
  excluded: readonly ['localStorage', 'CacheStorage', 'authentication', 'global-device-metadata'];
};

export async function captureOwnerRecoverySnapshot(scope: ActiveOwnerLearningScope): Promise<OwnerRecoverySnapshot> {
  const database = await openSyncDatabase();
  const knownStores: string[] = [META_STORE, ...OWNER_RECOVERY_STORES];
  if (database.version !== SYNC_DATABASE_VERSION || [...database.objectStoreNames].some(name => !knownStores.includes(name))) {
    throw new Error('Unsupported recovery database; retain all original data.');
  }
  const transaction = database.transaction(knownStores, 'readonly');
  const done = transactionDone(transaction);
  try {
    await assertOwnerLearningScope(transaction, { expectedOwnerGeneration: scope.ownerGeneration,
      resetEpoch: scope.resetEpoch, entryKey: 'recovery-snapshot' }, true);
    const rows = await Promise.all(OWNER_RECOVERY_STORES.map(async name => {
      const store = transaction.objectStore(name);
      if (name === DOCUMENT_STORE || name === LOCAL_STATE_STORE) {
        const value = await requestResult(store.get(scope.ownerGeneration.ownerKey));
        return [name, value === undefined ? [] : [value]] as const;
      }
      return [name, await requestResult(store.index(OWNER_INDEX).getAll(scope.ownerGeneration.ownerKey))] as const;
    }));
    const avatar = await requestResult(transaction.objectStore(META_STORE).get(avatarStorageKey(scope.ownerGeneration.ownerKey)));
    await done;
    return { version: 1, databaseVersion: database.version, coverage: 'indexeddb-owner-only',
      scope: structuredClone(scope), capturedAt: new Date().toISOString(),
      stores: Object.fromEntries(rows) as OwnerRecoverySnapshot['stores'], avatar: avatar ?? null,
      excluded: ['localStorage', 'CacheStorage', 'authentication', 'global-device-metadata'] };
  } catch (error) {
    abortTransaction(transaction);
    await done.catch(() => undefined);
    throw error;
  }
}

const assertOwnerGeneration = async (
  transaction: IDBTransaction,
  expected: OwnerGeneration,
  allowPreviewRead = false,
) => {
  await assertOwnerRecoveryIdle(transaction.objectStore(META_STORE), allowPreviewRead);
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
  allowPreviewRead = false,
) => {
  await assertOwnerGeneration(transaction, scope.expectedOwnerGeneration, allowPreviewRead);
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
  preserveHistory = true,
) => {
  const store = transaction.objectStore(storeName);
  const recordKeys = await requestResult(
    store.index(OWNER_SCOPED_CACHE_OWNER_INDEX).getAllKeys(
      IDBKeyRange.only(ownerKey),
    ),
  );
  for (const recordKey of recordKeys) {
    if (preserveHistory && storeName === LESSON_RESUME_STORE) {
      const record = await requestResult(store.get(recordKey) as IDBRequest<OwnerScopedCacheRecord<unknown> | undefined>);
      if (record?.entryKey.startsWith(LESSON_HISTORY_ENTRY_PREFIX)
        || record?.entryKey.startsWith('lesson-page-history:v1:') || record?.entryKey==='page-attempt-outbox:v1') continue;
    }
    store.delete(recordKey);
  }
};

const deleteOwnerRecordsFromAllCaches = async (
  transaction: IDBTransaction,
  ownerKey: string,
  preserveHistory = true,
) => {
  for (const storeName of OWNER_SCOPED_CACHE_STORES) {
    await deleteOwnerRecordsFromCacheStore(transaction, storeName, ownerKey, preserveHistory);
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

/** Await only requests on this store: network, timers and workers would outlive
 * the active IndexedDB transaction. Ownership and recovery fences apply first. */
export async function withLessonResumeTransaction<T>(scope: OwnerScopedCacheScope, mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => Promise<T>): Promise<T> {
  assertOwnerScopedCacheScope(scope);
  const database = await openSyncDatabase();
  const transaction = database.transaction([META_STORE, DOCUMENT_STORE, LESSON_RESUME_STORE], mode);
  const done = transactionDone(transaction);
  try {
    await assertOwnerLearningScope(transaction, scope);
    const value = await run(transaction.objectStore(LESSON_RESUME_STORE));
    await done;
    return value;
  } catch (error) {
    abortTransaction(transaction); await done.catch(() => undefined); throw error;
  }
}

/** Read only the active owner's current reset epoch, including archived lesson
 * revisions. No other account's drafts enter the caller's analytics input.
 */
export async function listLessonResumes(scope: ActiveOwnerLearningScope, excludeEntryKey?: string): Promise<OwnerScopedCacheRecord<unknown>[]> {
  const cacheScope={expectedOwnerGeneration:scope.ownerGeneration,resetEpoch:scope.resetEpoch,entryKey:'lesson-reading-list'};
  assertOwnerScopedCacheScope(cacheScope);
  const database=await openSyncDatabase();
  const transaction=database.transaction([META_STORE,DOCUMENT_STORE,LESSON_RESUME_STORE],'readonly');
  const done=transactionDone(transaction);
  try{
    await assertOwnerLearningScope(transaction,cacheScope);
    const store = transaction.objectStore(LESSON_RESUME_STORE);
    const index = store.index(OWNER_SCOPED_CACHE_OWNER_EPOCH_INDEX);
    const range = IDBKeyRange.only([scope.ownerGeneration.ownerKey, scope.resetEpoch]);
    let records: OwnerScopedCacheRecord<unknown>[];
    {
      // A key cursor avoids cloning the large journal that the caller reads
      // separately. Match the actual primary key, never a row's entryKey field.
      const excluded = excludeEntryKey === undefined ? null
        : ownerScopedCacheRecordKey(scope.ownerGeneration.ownerKey, scope.resetEpoch, excludeEntryKey);
      const pagePrefix = ownerScopedCacheRecordKey(scope.ownerGeneration.ownerKey, scope.resetEpoch, WORKSPACE_PAGE_PREFIX).slice(0, -2);
      const pageEnd = pagePrefix.slice(0, -1) + ';';
      records = await new Promise<OwnerScopedCacheRecord<unknown>[]>((resolve, reject) => {
        const rows: OwnerScopedCacheRecord<unknown>[] = [];
        let pending = 0, exhausted = false, count = 0;
        const finish = () => { if (exhausted && pending === 0) resolve(rows); };
        const cursor = index.openKeyCursor(range);
        cursor.onerror = () => reject(cursor.error);
        cursor.onsuccess = () => {
          const current = cursor.result;
          if (!current) { exhausted = true; finish(); return; }
          if (typeof current.primaryKey === 'string' && current.primaryKey.startsWith(pagePrefix)
            && typeof current.continuePrimaryKey === 'function') {
            current.continuePrimaryKey(current.key, pageEnd);
            return;
          }
          if (current.primaryKey !== excluded && !(typeof current.primaryKey === 'string' && current.primaryKey.startsWith(pagePrefix))) {
            const position = count++;
            pending++;
            const read = store.get(current.primaryKey) as IDBRequest<OwnerScopedCacheRecord<unknown>>;
            read.onerror = () => reject(read.error);
            read.onsuccess = () => { rows[position] = read.result; pending--; finish(); };
          }
          current.continue();
        };
      });
    }
    await done;return records;
  }catch(error){abortTransaction(transaction);await done.catch(()=>undefined);throw error;}
}

export const writeLessonResume = <T>(input: OwnerScopedCacheWrite<T>) =>
  writeOwnerScopedCache(LESSON_RESUME_STORE, input);

/** Atomic read/modify/write for durable reading state shared across tabs.
 * The synchronous callback cannot outlive the IndexedDB transaction.
 */
export async function updateLessonResume<T>(scope: OwnerScopedCacheScope, update: (previous: unknown) => T,
  companion?:{entryKey:string;update:(previous:unknown,value:T)=>unknown}): Promise<T> {
  assertOwnerScopedCacheScope(scope);
  const database = await openSyncDatabase();
  const transaction = database.transaction([META_STORE, DOCUMENT_STORE, LESSON_RESUME_STORE], 'readwrite');
  const done = transactionDone(transaction);
  try {
    await assertOwnerLearningScope(transaction, scope);
    const store = transaction.objectStore(LESSON_RESUME_STORE);
    const recordKey = ownerScopedCacheRecordKey(scope.expectedOwnerGeneration.ownerKey, scope.resetEpoch, scope.entryKey);
    const previous = await requestResult(store.get(recordKey) as IDBRequest<OwnerScopedCacheRecord<unknown> | undefined>);
    const value = update(previous?.value);
    if(companion){
      if(!companion.entryKey||companion.entryKey===scope.entryKey)throw new Error('Invalid reading companion key');
      const companionKey=ownerScopedCacheRecordKey(scope.expectedOwnerGeneration.ownerKey,scope.resetEpoch,companion.entryKey);
      const saved=await requestResult(store.get(companionKey) as IDBRequest<OwnerScopedCacheRecord<unknown>|undefined>);
      const journal=companion.update(saved?.value,value);
      store.put({schemaVersion:1,recordKey:companionKey,ownerKey:scope.expectedOwnerGeneration.ownerKey,
        resetEpoch:scope.resetEpoch,entryKey:companion.entryKey,value:journal,updatedAt:new Date().toISOString()});
    }
    store.put({schemaVersion: 1, recordKey, ownerKey: scope.expectedOwnerGeneration.ownerKey, resetEpoch: scope.resetEpoch, entryKey: scope.entryKey, value, updatedAt: new Date().toISOString()} satisfies OwnerScopedCacheRecord<T>);
    await done;
    return value;
  } catch (error) {
    abortTransaction(transaction);
    await done.catch(() => undefined);
    throw error;
  }
}

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
    await assertOwnerRecoveryIdle(transaction.objectStore(META_STORE));
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
  lessonHistory?: GuestLessonHistoryCommit,
  documentMutation?: DocumentMutationCommit,
): Promise<{
  queued: PendingSyncOperation;
  ownerGeneration: OwnerGeneration | null;
}> {
  const documentEvents = (await documentActivityHistoryEntries(operation.document, operation.operationId, operation.kind))
    .map(entry => documentActivityHistoryEvent(operation.ownerKey, operation.document.reset.epoch, entry));
  const database = await openSyncDatabase();
  const transactionStores = [META_STORE, DOCUMENT_STORE, LOCAL_STATE_STORE, OUTBOX_STORE];
  if (lessonHistory || documentMutation || documentEvents.length) transactionStores.push(LESSON_RESUME_STORE);
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
    } else {
      await assertOwnerRecoveryIdle(transaction.objectStore(META_STORE));
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
  if (documentMutation) {
    await assertOwnerLearningScope(transaction, { expectedOwnerGeneration: documentMutation.scope.ownerGeneration,
      resetEpoch: documentMutation.scope.resetEpoch, entryKey: 'document-mutation' });
    if (operation.ownerKey !== documentMutation.scope.ownerGeneration.ownerKey
      || operation.document.reset.epoch !== documentMutation.scope.resetEpoch) throw new StaleOwnerGenerationError();
    const current = await requestResult(localStates.get(operation.ownerKey) as IDBRequest<OwnerLocalStateRecord | undefined>);
    if (current && canonicalStringify(current.state) !== canonicalStringify(documentMutation.expectedState)) throw new LessonHistoryStateChangedError();
  }
  if (lessonHistory) {
    const { event, scope } = lessonHistory;
    await assertOwnerLearningScope(transaction, {
      expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: scope.resetEpoch, entryKey: event.eventId,
    });
    if (!isLessonHistoryEvent(event) || event.ownerKey !== operation.ownerKey
      || event.resetEpoch !== operation.document.reset.epoch
      || event.resetEpoch !== scope.resetEpoch || event.lineage !== "guest-business-commit"
      || scope.ownerGeneration.ownerKey !== operation.ownerKey)
      throw new StaleOwnerGenerationError();
    const current = await requestResult(localStates.get(operation.ownerKey) as IDBRequest<OwnerLocalStateRecord | undefined>);
    if (current && canonicalStringify(current.state) !== canonicalStringify(lessonHistory.expectedState))
      throw new LessonHistoryStateChangedError();
    const history = transaction.objectStore(LESSON_RESUME_STORE);
    const recordKey = ownerScopedCacheRecordKey(event.ownerKey, event.resetEpoch, event.eventId);
    const existing = await requestResult(history.get(recordKey) as IDBRequest<OwnerScopedCacheRecord<unknown> | undefined>);
    if (existing && (!isLessonHistoryEvent(existing.value)
      || canonicalStringify(existing.value) !== canonicalStringify(event)))
      throw new Error("Lượt trả lời đã có khác với bản đang lưu. Dữ liệu cũ vẫn được giữ; hãy mở lại bài.");
    if (!existing) history.put({ schemaVersion: 1, recordKey, ownerKey: event.ownerKey,
      resetEpoch: event.resetEpoch, entryKey: event.eventId, value: event, updatedAt,
    } satisfies OwnerScopedCacheRecord<LessonHistoryEventV1>);
  }
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
  for (const event of documentEvents) {
    if (!isLessonHistoryEvent(event)) throw new Error('Unsupported document history; retain source.');
    const history = transaction.objectStore(LESSON_RESUME_STORE);
    const recordKey = ownerScopedCacheRecordKey(event.ownerKey, event.resetEpoch, event.eventId);
    const previous = await requestResult(history.get(recordKey) as IDBRequest<OwnerScopedCacheRecord<unknown> | undefined>);
    if (previous && canonicalStringify(previous.value) !== canonicalStringify(event)) throw new Error('Conflicting document history; retain source.');
    if (!previous) history.put({ schemaVersion: 1, recordKey, ownerKey: event.ownerKey, resetEpoch: event.resetEpoch,
      entryKey: event.eventId, value: event, updatedAt } satisfies OwnerScopedCacheRecord<LessonHistoryEventV1>);
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
  lessonHistory?: GuestLessonHistoryCommit,
  documentMutation?: DocumentMutationCommit,
) {
  return persistSyncOperation(
    operation,
    localState,
    undefined,
    expectedOwnerGeneration,
    lessonHistory,
    documentMutation,
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
  // Subscribe before the first request. A very fast IndexedDB implementation
  // may commit between the final put() and a late listener registration,
  // leaving the caller waiting forever even though the sequence was written.
  const done = transactionDone(transaction);
  const store = transaction.objectStore(META_STORE);
  try {
    const record = await requestResult(
      store.get("deviceSequence") as IDBRequest<MetaRecord | undefined>,
    );
    const next = typeof record?.value === "number" ? record.value + 1 : 1;
    store.put({ key: "deviceSequence", value: next } satisfies MetaRecord);
    await done;
    return next;
  } catch (error) {
    abortTransaction(transaction);
    await done.catch(() => undefined);
    throw error;
  }
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
  const transaction = database.transaction([META_STORE, OUTBOX_STORE], "readwrite");
  const done = transactionDone(transaction);
  try {
  await assertOwnerRecoveryIdle(transaction.objectStore(META_STORE));
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
  await done;
  } catch (error) { abortTransaction(transaction); await done.catch(() => undefined); throw error; }
}

export async function quarantineSyncOperation(
  operationId: string,
  reason: string,
) {
  const database = await openSyncDatabase();
  const transaction = database.transaction([META_STORE, OUTBOX_STORE], "readwrite");
  const done = transactionDone(transaction);
  try {
  await assertOwnerRecoveryIdle(transaction.objectStore(META_STORE));
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
  await done;
  } catch (error) { abortTransaction(transaction); await done.catch(() => undefined); throw error; }
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
          META_STORE,
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
    await assertOwnerRecoveryIdle(transaction.objectStore(META_STORE));
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
  const transaction = database.transaction([META_STORE, OUTBOX_STORE], "readwrite");
  const store = transaction.objectStore(OUTBOX_STORE);
  const done = transactionDone(transaction);
  try {
  await assertOwnerRecoveryIdle(transaction.objectStore(META_STORE));
  const operations = await requestResult(
    store.index(OWNER_INDEX).getAll(IDBKeyRange.only(fromOwnerKey)) as
      IDBRequest<PendingSyncOperation[]>,
  );
  operations.forEach((operation) => {
    store.put({ ...operation, ownerKey: toOwnerKey });
  });
  await done;
  } catch (error) { abortTransaction(transaction); await done.catch(() => undefined); throw error; }
}

export async function deleteOwnerData(ownerKey: string) {
  const database = await openSyncDatabase();
  const transaction = database.transaction(
    [
      META_STORE,
      DOCUMENT_STORE,
      LOCAL_STATE_STORE,
      OUTBOX_STORE,
      LEARNING_COMMAND_OUTBOX_STORE,
      ...OWNER_SCOPED_CACHE_STORES,
    ],
    "readwrite",
  );
  const done = transactionDone(transaction);
  try {
  await assertOwnerRecoveryIdle(transaction.objectStore(META_STORE));
  const metadata = await requestResult(transaction.objectStore(META_STORE).getAll()) as MetaRecord[];
  for (const row of metadata) {
    if (row.key.startsWith('owner-recovery-job:v1:')
      && (row.value as { scope?: ActiveOwnerLearningScope } | null)?.scope?.ownerGeneration.ownerKey === ownerKey) {
      transaction.objectStore(META_STORE).delete(row.key);
    }
  }
  transaction.objectStore(DOCUMENT_STORE).delete(ownerKey);
  transaction.objectStore(META_STORE).delete(avatarStorageKey(ownerKey));
  transaction.objectStore(LOCAL_STATE_STORE).delete(ownerKey);
  const outbox = transaction.objectStore(OUTBOX_STORE);
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
  await deleteOwnerRecordsFromAllCaches(transaction, ownerKey, false);
  await done;
  } catch (error) { abortTransaction(transaction); await done.catch(() => undefined); throw error; }
}

export async function resetSyncDatabaseForTests() {
  const database = databasePromise ? await databasePromise.catch(() => null) : null;
  database?.close();
  databasePromise = null;
}
