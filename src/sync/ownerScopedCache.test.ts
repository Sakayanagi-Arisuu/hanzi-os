import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CONTENT_VERSION } from "../data/curriculum";
import type { LearningState } from "../types";
import { createInitialSyncDocument, evolveSyncDocument } from "./document";
import {
  ACTIVE_OWNER_GENERATION_KEY,
  ASSESSMENT_RESUME_STORE,
  allocateDeviceSequence,
  clearOwnerScopedLearningCaches,
  deleteLearningProjection,
  deleteLessonResume,
  deleteOwnerData,
  enqueueOwnerAdoptionOperation,
  enqueueSyncOperation,
  LEARNING_PROJECTION_STORE,
  LESSON_RESUME_STORE,
  openSyncDatabase,
  OWNER_SCOPED_CACHE_OWNER_EPOCH_INDEX,
  OWNER_SCOPED_CACHE_OWNER_INDEX,
  readActiveOwnerLearningScope,
  readAssessmentResume,
  readLearningProjection,
  readLessonResume,
  readOrInitializeOwnerGeneration,
  resetSyncDatabaseForTests,
  StaleOwnerGenerationError,
  SYNC_DATABASE_VERSION,
  writeAssessmentResume,
  writeLearningProjection,
  writeLearningProjectionBatch,
  writeLearningProjectionBatchWithMonotonicCursor,
  writeLessonResume,
  writeOwnerCheckpoint,
  writeSyncMeta,
  type OwnerGeneration,
  type OwnerScopedCacheScope,
} from "./indexedDb";

const DATABASE_NAME = "hanzi-os-sync-v1";

const state = (): LearningState => ({
  schemaVersion: 2,
  contentVersion: CONTENT_VERSION,
  profile: {
    name: "Cache learner",
    goal: "conversation",
    dailyMinutes: 20,
    script: "simplified",
    startingLevel: "zero",
    onboarded: true,
  },
  xp: 0,
  dailyXp: 0,
  streak: 0,
  lastStudyDate: null,
  completedLessons: {},
  savedWords: [],
  fsrsCards: {},
  reviewCount: 0,
  skillMastery: {
    pronunciation: 0,
    listening: 0,
    speaking: 0,
    reading: 0,
    writing: 0,
    vocabulary: 0,
    grammar: 0,
  },
  knowledge: {},
  mistakes: [],
  activityLog: [],
  diagnostic: {
    completed: false,
    score: 0,
    recommendedLessonId: "boot-1",
    completedAt: null,
  },
  evidence: [],
});

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

const deleteDatabase = () => new Promise<void>((resolve, reject) => {
  const request = indexedDB.deleteDatabase(DATABASE_NAME);
  request.addEventListener("success", () => resolve(), { once: true });
  request.addEventListener("error", () => reject(request.error), { once: true });
});

const openVersionTwoDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DATABASE_NAME, 2);
  request.addEventListener("upgradeneeded", () => {
    const database = request.result;
    database.createObjectStore("meta", { keyPath: "key" });
    database.createObjectStore("documents", { keyPath: "ownerKey" });
    database.createObjectStore("local-states", { keyPath: "ownerKey" });
    const outbox = database.createObjectStore("outbox", {
      keyPath: "operationId",
    });
    outbox.createIndex("ownerKey", "ownerKey", { unique: false });
    const commands = database.createObjectStore("learning-command-outbox", {
      keyPath: "recordKey",
    });
    commands.createIndex("ownerKey", "ownerKey", { unique: false });
    commands.createIndex(
      "ownerSessionAlias",
      ["ownerKey", "sessionAliasLookupKey"],
      { unique: true },
    );
  });
  request.addEventListener("success", () => resolve(request.result), {
    once: true,
  });
  request.addEventListener("error", () => reject(request.error), { once: true });
});

const activate = async (ownerKey: string, generation: number) => {
  const ownerGeneration = { ownerKey, generation } satisfies OwnerGeneration;
  await writeSyncMeta(ACTIVE_OWNER_GENERATION_KEY, ownerGeneration);
  return ownerGeneration;
};

const scope = (
  expectedOwnerGeneration: OwnerGeneration,
  resetEpoch: number,
  entryKey: string,
): OwnerScopedCacheScope => ({
  expectedOwnerGeneration,
  resetEpoch,
  entryKey,
});

beforeEach(async () => {
  await resetSyncDatabaseForTests();
  await deleteDatabase();
});

afterEach(async () => {
  await resetSyncDatabaseForTests();
});

describe("owner-scoped learning projection and resume caches", () => {
  it("resolves the active generation and exact canonical reset epoch together", async () => {
    const owner = await activate("account:scope", 4);
    const currentState = state();
    const document = createInitialSyncDocument(
      currentState,
      "2026-07-22T00:00:00.000Z",
      "scope-initial",
    );
    document.reset.epoch = 7;
    await writeOwnerCheckpoint(
      owner.ownerKey,
      1,
      document,
      currentState,
      owner,
    );

    await expect(readActiveOwnerLearningScope()).resolves.toEqual({
      ownerGeneration: owner,
      resetEpoch: 7,
    });
  });

  it("upgrades version two without changing existing journal data", async () => {
    const legacy = await openVersionTwoDatabase();
    const write = legacy.transaction("outbox", "readwrite");
    write.objectStore("outbox").put({
      operationId: "snapshot:preserved",
      ownerKey: "account:a",
      deviceSequence: 7,
    });
    await transactionDone(write);
    legacy.close();

    const upgraded = await openSyncDatabase();
    expect(upgraded.version).toBe(SYNC_DATABASE_VERSION);
    expect([...upgraded.objectStoreNames]).toEqual(expect.arrayContaining([
      LEARNING_PROJECTION_STORE,
      LESSON_RESUME_STORE,
      ASSESSMENT_RESUME_STORE,
    ]));
    for (const storeName of [
      LEARNING_PROJECTION_STORE,
      LESSON_RESUME_STORE,
      ASSESSMENT_RESUME_STORE,
    ]) {
      const transaction = upgraded.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      expect([...store.indexNames]).toEqual(expect.arrayContaining([
        OWNER_SCOPED_CACHE_OWNER_INDEX,
        OWNER_SCOPED_CACHE_OWNER_EPOCH_INDEX,
      ]));
      await transactionDone(transaction);
    }
    const read = upgraded.transaction("outbox", "readonly");
    await expect(requestResult(
      read.objectStore("outbox").get("snapshot:preserved"),
    )).resolves.toMatchObject({
      operationId: "snapshot:preserved",
      ownerKey: "account:a",
      deviceSequence: 7,
    });
    await transactionDone(read);
  });

  it("isolates entry keys by owner and rejects noncanonical reset epochs", async () => {
    const ownerA = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    const a0 = await writeLearningProjection({
      ...scope(ownerA, 0, "home"),
      value: { cursor: 10 },
      updatedAt: "2026-07-22T01:00:00.000Z",
    });
    await expect(writeLearningProjection({
      ...scope(ownerA, 1, "home"),
      value: { cursor: 20 },
    })).rejects.toBeInstanceOf(StaleOwnerGenerationError);
    expect(a0.recordKey).toBe(JSON.stringify(["account:a", 0, "home"]));

    const ownerB = await activate("account:b", 2);
    await writeLearningProjection({
      ...scope(ownerB, 0, "home"),
      value: { cursor: 30 },
    });
    await expect(readLearningProjection<{ cursor: number }>(
      scope(ownerB, 0, "home"),
    )).resolves.toMatchObject({ value: { cursor: 30 } });

    const ownerAReturned = await activate("account:a", 3);
    await expect(readLearningProjection<{ cursor: number }>(
      scope(ownerAReturned, 0, "home"),
    )).resolves.toMatchObject({ value: { cursor: 10 } });
    await expect(readLearningProjection(
      scope(ownerAReturned, 1, "home"),
    )).rejects.toBeInstanceOf(StaleOwnerGenerationError);
    await expect(deleteLearningProjection(
      scope(ownerAReturned, 2, "home"),
    )).rejects.toBeInstanceOf(StaleOwnerGenerationError);
  });

  it("atomically rejects stale-generation reads, writes, deletes, and clears", async () => {
    const ownerA = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    await writeLessonResume({
      ...scope(ownerA, 0, "boot-1"),
      value: { activityIndex: 2 },
    });
    await activate("account:b", 2);

    await expect(readLessonResume(scope(ownerA, 0, "boot-1")))
      .rejects.toBeInstanceOf(StaleOwnerGenerationError);
    await expect(writeLessonResume({
      ...scope(ownerA, 0, "boot-1"),
      value: { activityIndex: 9 },
    })).rejects.toBeInstanceOf(StaleOwnerGenerationError);
    await expect(deleteLessonResume(scope(ownerA, 0, "boot-1")))
      .rejects.toBeInstanceOf(StaleOwnerGenerationError);
    await expect(clearOwnerScopedLearningCaches(ownerA))
      .rejects.toBeInstanceOf(StaleOwnerGenerationError);

    const ownerAReturned = await activate("account:a", 3);
    await expect(readLessonResume<{ activityIndex: number }>(
      scope(ownerAReturned, 0, "boot-1"),
    )).resolves.toMatchObject({ value: { activityIndex: 2 } });
  });

  it("writes projection versions atomically and leaves no mixed cache on failure", async () => {
    const owner = (await readOrInitializeOwnerGeneration("account:atomic"))
      .ownerGeneration;
    await expect(writeLearningProjectionBatch<unknown>({
      expectedOwnerGeneration: owner,
      resetEpoch: 0,
      entries: [{ entryKey: "projection-v1", value: { cursor: 4 } }, {
        entryKey: "projection-v2",
        value: () => "not-structured-cloneable",
      }],
    })).rejects.toBeDefined();
    await expect(readLearningProjection(
      scope(owner, 0, "projection-v1"),
    )).resolves.toBeNull();
    await expect(readLearningProjection(
      scope(owner, 0, "projection-v2"),
    )).resolves.toBeNull();

    await activate("account:other", 2);
    await expect(writeLearningProjectionBatch({
      expectedOwnerGeneration: owner,
      resetEpoch: 0,
      entries: [{ entryKey: "projection-v1", value: { cursor: 5 } }, {
        entryKey: "projection-v2",
        value: { cursor: 5 },
      }],
    })).rejects.toBeInstanceOf(StaleOwnerGenerationError);
  });

  it("never lets an older projection response overwrite a newer cursor", async () => {
    const owner = (await readOrInitializeOwnerGeneration("account:monotonic"))
      .ownerGeneration;
    await expect(writeLearningProjectionBatchWithMonotonicCursor({
      expectedOwnerGeneration: owner,
      resetEpoch: 0,
      entries: [{
        entryKey: "projection-v1",
        value: { cursor: 9, protocolVersion: 1 },
      }],
    })).resolves.toMatchObject({ written: true });

    await expect(writeLearningProjectionBatchWithMonotonicCursor({
      expectedOwnerGeneration: owner,
      resetEpoch: 0,
      entries: [{
        entryKey: "projection-v1",
        value: { cursor: 7, protocolVersion: 1 },
      }, {
        entryKey: "projection-v2",
        value: { cursor: 7, protocolVersion: 2 },
      }],
    })).resolves.toEqual({ written: false, currentCursor: 9 });
    await expect(readLearningProjection<{ cursor: number }>(
      scope(owner, 0, "projection-v1"),
    )).resolves.toMatchObject({ value: { cursor: 9 } });
    await expect(readLearningProjection(
      scope(owner, 0, "projection-v2"),
    )).resolves.toBeNull();

    await expect(writeLearningProjectionBatchWithMonotonicCursor({
      expectedOwnerGeneration: owner,
      resetEpoch: 0,
      entries: [{
        entryKey: "projection-v1",
        value: { cursor: 10, protocolVersion: 1 },
      }, {
        entryKey: "projection-v2",
        value: { cursor: 10, protocolVersion: 2 },
      }],
    })).resolves.toMatchObject({ written: true });
    await expect(readLearningProjection<{ cursor: number }>(
      scope(owner, 0, "projection-v2"),
    )).resolves.toMatchObject({ value: { cursor: 10 } });
  });

  it("purges only the reset owner across every derived cache and epoch", async () => {
    const ownerAInitial = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    await writeLearningProjection({
      ...scope(ownerAInitial, 0, "home"),
      value: { cursor: 1 },
    });
    await writeLessonResume({
      ...scope(ownerAInitial, 0, "boot-1"),
      value: { activityIndex: 1 },
    });
    await writeAssessmentResume({
      ...scope(ownerAInitial, 0, "foundation"),
      value: { questionIndex: 1 },
    });

    const ownerB = await activate("account:b", 2);
    await writeLessonResume({
      ...scope(ownerB, 0, "boot-1"),
      value: { activityIndex: 7 },
    });
    const ownerA = await activate("account:a", 3);
    const localState = state();
    const initial = createInitialSyncDocument(
      localState,
      "2026-07-22T01:00:00.000Z",
      "initial",
    );
    const reset = evolveSyncDocument(
      initial,
      localState,
      localState,
      "2026-07-22T01:01:00.000Z",
      "reset",
      "reset",
    );
    await enqueueSyncOperation({
      protocolVersion: 1,
      operationId: "sync:reset",
      idempotencyKey: "sync:reset",
      ownerKey: ownerA.ownerKey,
      installationId: "installation:a",
      deviceId: "device:a",
      deviceSequence: await allocateDeviceSequence(),
      baseRevision: 0,
      kind: "reset",
      contentVersion: CONTENT_VERSION,
      occurredAt: "2026-07-22T01:01:00.000Z",
      requestHash: "reset-hash",
      document: reset,
    }, localState, ownerA);

    await expect(readLearningProjection(scope(ownerA, 1, "home")))
      .resolves.toBeNull();
    await expect(readLessonResume(scope(ownerA, 1, "boot-1")))
      .resolves.toBeNull();
    await expect(readAssessmentResume(scope(ownerA, 1, "foundation")))
      .resolves.toBeNull();

    const ownerBReturned = await activate("account:b", 4);
    await expect(readLessonResume<{ activityIndex: number }>(
      scope(ownerBReturned, 0, "boot-1"),
    )).resolves.toMatchObject({ value: { activityIndex: 7 } });
  });

  it("purges derived caches when a pulled checkpoint advances the reset epoch", async () => {
    const owner = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    const localState = state();
    const initial = createInitialSyncDocument(
      localState,
      "2026-07-22T01:00:00.000Z",
      "initial",
    );
    await writeOwnerCheckpoint(
      owner.ownerKey,
      1,
      initial,
      localState,
      owner,
    );
    await writeLearningProjection({
      ...scope(owner, 0, "home"),
      value: { cursor: 10 },
    });
    await writeLessonResume({
      ...scope(owner, 0, "boot-1"),
      value: { activityIndex: 4 },
    });
    const reset = evolveSyncDocument(
      initial,
      localState,
      localState,
      "2026-07-22T01:01:00.000Z",
      "remote-reset",
      "reset",
    );

    await writeOwnerCheckpoint(
      owner.ownerKey,
      2,
      reset,
      localState,
      owner,
    );
    await expect(readLearningProjection(scope(owner, 0, "home")))
      .rejects.toBeInstanceOf(StaleOwnerGenerationError);
    await expect(readLessonResume(scope(owner, 0, "boot-1")))
      .rejects.toBeInstanceOf(StaleOwnerGenerationError);
    await expect(readLearningProjection(scope(owner, 1, "home")))
      .resolves.toBeNull();
    await expect(readLessonResume(scope(owner, 1, "boot-1")))
      .resolves.toBeNull();
  });

  it("drops source and target derived caches during owner adoption without reassignment", async () => {
    const anonymousInitial = (
      await readOrInitializeOwnerGeneration("anonymous:device")
    ).ownerGeneration;
    await writeLessonResume({
      ...scope(anonymousInitial, 0, "boot-1"),
      value: { activityIndex: 3, source: "anonymous" },
    });
    const target = await activate("account:a", 2);
    await writeAssessmentResume({
      ...scope(target, 0, "foundation"),
      value: { questionIndex: 4, source: "old-account-cache" },
    });
    const anonymous = await activate("anonymous:device", 3);
    const localState = state();
    const document = createInitialSyncDocument(
      localState,
      "2026-07-22T01:00:00.000Z",
      "adoption",
    );
    const adopted = await enqueueOwnerAdoptionOperation(
      anonymous.ownerKey,
      {
        protocolVersion: 1,
        operationId: "local-import:account-a",
        idempotencyKey: "local-import:account-a",
        ownerKey: "account:a",
        installationId: "installation:a",
        deviceId: "device:a",
        deviceSequence: await allocateDeviceSequence(),
        baseRevision: 0,
        kind: "local-import",
        contentVersion: CONTENT_VERSION,
        occurredAt: "2026-07-22T01:00:00.000Z",
        requestHash: "adoption-hash",
        document,
      },
      localState,
      anonymous,
    );

    await expect(readAssessmentResume(scope(adopted, 0, "foundation")))
      .resolves.toBeNull();
    await expect(readLessonResume(scope(adopted, 0, "boot-1")))
      .resolves.toBeNull();
    const anonymousReturned = await activate("anonymous:device", 5);
    await expect(readLessonResume(
      scope(anonymousReturned, 0, "boot-1"),
    )).resolves.toBeNull();
  });

  it("deletes one owner from every cache store without touching another owner", async () => {
    const ownerA = (await readOrInitializeOwnerGeneration("account:a"))
      .ownerGeneration;
    await writeLearningProjection({
      ...scope(ownerA, 0, "home"),
      value: { cursor: 1 },
    });
    await writeLessonResume({
      ...scope(ownerA, 0, "boot-1"),
      value: { activityIndex: 1 },
    });
    await writeAssessmentResume({
      ...scope(ownerA, 0, "foundation"),
      value: { questionIndex: 1 },
    });
    const ownerB = await activate("account:b", 2);
    await writeLessonResume({
      ...scope(ownerB, 0, "boot-1"),
      value: { activityIndex: 8 },
    });

    await deleteOwnerData(ownerA.ownerKey);
    await expect(readLessonResume<{ activityIndex: number }>(
      scope(ownerB, 0, "boot-1"),
    )).resolves.toMatchObject({ value: { activityIndex: 8 } });
    const ownerAReturned = await activate("account:a", 3);
    await expect(readLearningProjection(scope(ownerAReturned, 0, "home")))
      .resolves.toBeNull();
    await expect(readLessonResume(scope(ownerAReturned, 0, "boot-1")))
      .resolves.toBeNull();
    await expect(readAssessmentResume(
      scope(ownerAReturned, 0, "foundation"),
    )).resolves.toBeNull();
  });
});
