import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { LearningState } from "../types";
import { createInitialSyncDocument } from "./document";
import {
  acknowledgeSyncOperation,
  allocateDeviceSequence,
  countPendingOperations,
  deleteOwnerData,
  enqueueOwnerAdoptionOperation,
  enqueueSyncOperation,
  listPendingOperations,
  listQuarantinedOperations,
  quarantineSyncOperation,
  readOrInitializeOwnerGeneration,
  readOwnerDocument,
  readOwnerLocalState,
  reassignPendingOperations,
  resetSyncDatabaseForTests,
} from "./indexedDb";

const state = (): LearningState => ({
  schemaVersion: 2,
  contentVersion: "2026.07-alpha",
  profile: {
    name: "Offline learner",
    goal: "conversation",
    dailyMinutes: 20,
    script: "simplified",
    startingLevel: "zero",
    onboarded: false,
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

const deleteDatabase = () => new Promise<void>((resolve, reject) => {
  const request = indexedDB.deleteDatabase("hanzi-os-sync-v1");
  request.addEventListener("success", () => resolve(), { once: true });
  request.addEventListener("error", () => reject(request.error), { once: true });
});

beforeEach(async () => {
  await resetSyncDatabaseForTests();
  await deleteDatabase();
});

afterEach(async () => {
  await resetSyncDatabaseForTests();
});

describe("IndexedDB sync journal", () => {
  it("settles consecutive device sequence writes without losing transaction completion", async () => {
    const sequenceWrites = Array.from({ length: 24 }, async () =>
      allocateDeviceSequence()
    );
    const sequences = await Promise.race([
      Promise.all(sequenceWrites),
      new Promise<never>((_resolve, reject) => {
        setTimeout(() => reject(new Error("Device sequence allocation stalled.")), 1_000);
      }),
    ]);

    expect([...sequences].sort((left, right) => left - right)).toEqual(
      Array.from({ length: 24 }, (_entry, index) => index + 1),
    );
  });

  it("commits the local checkpoint and outbox operation together", async () => {
    const localState = state();
    const document = createInitialSyncDocument(
      localState,
      "2026-07-20T00:00:00.000Z",
      "bootstrap",
    );
    const deviceSequence = await allocateDeviceSequence();
    await enqueueSyncOperation({
      protocolVersion: 1,
      operationId: "sync:one",
      idempotencyKey: "sync:one",
      ownerKey: "owner:a",
      installationId: "installation:a",
      deviceId: "device:a",
      deviceSequence,
      baseRevision: 0,
      kind: "snapshot",
      contentVersion: localState.contentVersion,
      occurredAt: "2026-07-20T00:00:00.000Z",
      requestHash: "hash",
      document,
    }, localState);

    expect(await countPendingOperations("owner:a")).toBe(1);
    expect((await readOwnerDocument("owner:a"))?.document).toEqual(document);
    expect(await readOwnerLocalState("owner:a")).toEqual(localState);
  });

  it("keeps account queues isolated and only adopts the anonymous owner explicitly", async () => {
    const localState = state();
    const document = createInitialSyncDocument(
      localState,
      "2026-07-20T00:00:00.000Z",
      "bootstrap",
    );
    for (const [operationId, ownerKey] of [
      ["sync:anonymous", "anonymous:device"],
      ["sync:account-b", "account:b"],
    ] as const) {
      await enqueueSyncOperation({
        protocolVersion: 1,
        operationId,
        idempotencyKey: operationId,
        ownerKey,
        installationId: "installation",
        deviceId: "device",
        deviceSequence: await allocateDeviceSequence(),
        baseRevision: 0,
        kind: "snapshot",
        contentVersion: localState.contentVersion,
        occurredAt: "2026-07-20T00:00:00.000Z",
        requestHash: "hash",
        document,
      }, localState);
    }

    expect(await countPendingOperations("account:a")).toBe(0);
    expect(await countPendingOperations("account:b")).toBe(1);
    await reassignPendingOperations("anonymous:device", "account:a");
    expect((await listPendingOperations("account:a")).map((item) => item.operationId))
      .toEqual(["sync:anonymous"]);
    expect(await countPendingOperations("account:b")).toBe(1);
  });

  it("deletes pending owner data only after an acknowledged account deletion", async () => {
    const localState = state();
    const document = createInitialSyncDocument(
      localState,
      "2026-07-20T00:00:00.000Z",
      "bootstrap",
    );
    await enqueueSyncOperation({
      protocolVersion: 1,
      operationId: "sync:delete",
      idempotencyKey: "sync:delete",
      ownerKey: "account:a",
      installationId: "installation",
      deviceId: "device",
      deviceSequence: await allocateDeviceSequence(),
      baseRevision: 0,
      kind: "reset",
      contentVersion: localState.contentVersion,
      occurredAt: "2026-07-20T00:00:00.000Z",
      requestHash: "hash",
      document,
    }, localState);
    await deleteOwnerData("account:a");
    expect(await countPendingOperations("account:a")).toBe(0);
    expect(await readOwnerDocument("account:a")).toBeNull();
    expect(await readOwnerLocalState("account:a")).toBeNull();
  });

  it("acknowledges one operation without dropping later offline work", async () => {
    const localState = state();
    const document = createInitialSyncDocument(
      localState,
      "2026-07-20T00:00:00.000Z",
      "bootstrap",
    );
    for (const operationId of ["sync:first", "sync:second"]) {
      await enqueueSyncOperation({
        protocolVersion: 1,
        operationId,
        idempotencyKey: operationId,
        ownerKey: "account:a",
        installationId: "installation",
        deviceId: "device",
        deviceSequence: await allocateDeviceSequence(),
        baseRevision: 0,
        kind: "snapshot",
        contentVersion: localState.contentVersion,
        occurredAt: "2026-07-20T00:00:00.000Z",
        requestHash: "hash",
        document,
      }, localState);
    }
    await acknowledgeSyncOperation(
      "sync:first",
      "account:a",
      1,
      document,
      localState,
    );
    expect((await listPendingOperations("account:a")).map((item) => item.operationId))
      .toEqual(["sync:second"]);
  });

  it("never truncates immutable offline operations before server acknowledgement", async () => {
    const localState = state();
    const document = createInitialSyncDocument(
      localState,
      "2026-07-20T00:00:00.000Z",
      "bootstrap",
    );
    for (let index = 0; index < 12; index += 1) {
      const operationId = `sync:offline-${index}`;
      await enqueueSyncOperation({
        protocolVersion: 1,
        operationId,
        idempotencyKey: operationId,
        ownerKey: "account:a",
        installationId: "installation",
        deviceId: "device",
        deviceSequence: await allocateDeviceSequence(),
        baseRevision: 0,
        kind: "snapshot",
        contentVersion: localState.contentVersion,
        occurredAt: "2026-07-20T00:00:00.000Z",
        requestHash: "hash",
        document,
      }, localState);
    }
    expect(await countPendingOperations("account:a")).toBe(12);
  });

  it("atomically replaces older owner operations with an explicit reset", async () => {
    const localState = state();
    const document = createInitialSyncDocument(
      localState,
      "2026-07-20T00:00:00.000Z",
      "bootstrap",
    );
    for (const [operationId, ownerKey] of [
      ["sync:older-active", "account:a"],
      ["sync:older-quarantined", "account:a"],
      ["sync:other-owner", "account:b"],
    ] as const) {
      await enqueueSyncOperation({
        protocolVersion: 1,
        operationId,
        idempotencyKey: operationId,
        ownerKey,
        installationId: "installation",
        deviceId: "device",
        deviceSequence: await allocateDeviceSequence(),
        baseRevision: 0,
        kind: "snapshot",
        contentVersion: localState.contentVersion,
        occurredAt: "2026-07-20T00:00:00.000Z",
        requestHash: "hash",
        document,
      }, localState);
    }
    await quarantineSyncOperation("sync:older-quarantined", "invalid payload");

    const resetSequence = await allocateDeviceSequence();
    await enqueueSyncOperation({
      protocolVersion: 1,
      operationId: "sync:reset",
      idempotencyKey: "sync:reset",
      ownerKey: "account:a",
      installationId: "installation",
      deviceId: "device",
      deviceSequence: resetSequence,
      baseRevision: 0,
      kind: "reset",
      contentVersion: localState.contentVersion,
      occurredAt: "2026-07-20T00:01:00.000Z",
      requestHash: "reset-hash",
      document,
    }, localState);

    expect((await listPendingOperations("account:a")).map((item) => item.operationId))
      .toEqual(["sync:reset"]);
    expect(await listQuarantinedOperations("account:a")).toEqual([]);
    expect((await listPendingOperations("account:b")).map((item) => item.operationId))
      .toEqual(["sync:other-owner"]);
  });

  it("quarantines poison operations without deleting their diagnostic payload", async () => {
    const localState = state();
    const document = createInitialSyncDocument(
      localState,
      "2026-07-20T00:00:00.000Z",
      "bootstrap",
    );
    await enqueueSyncOperation({
      protocolVersion: 1,
      operationId: "sync:poison",
      idempotencyKey: "sync:poison",
      ownerKey: "anonymous:device",
      installationId: "installation",
      deviceId: "device",
      deviceSequence: await allocateDeviceSequence(),
      baseRevision: 0,
      kind: "snapshot",
      contentVersion: localState.contentVersion,
      occurredAt: "2026-07-20T00:00:00.000Z",
      requestHash: "original-hash",
      document,
    }, localState);

    await quarantineSyncOperation("sync:poison", "INVALID_SYNC_OPERATION: bad payload");
    expect(await countPendingOperations("anonymous:device")).toBe(0);
    const quarantined = await listQuarantinedOperations("anonymous:device");
    expect(quarantined).toHaveLength(1);
    expect(quarantined[0]).toMatchObject({
      operationId: "sync:poison",
      requestHash: "original-hash",
      quarantineReason: "INVALID_SYNC_OPERATION: bad payload",
    });
    expect(quarantined[0].quarantinedAt).not.toBeNull();

    await reassignPendingOperations("anonymous:device", "account:a");
    expect(await listQuarantinedOperations("anonymous:device")).toEqual([]);
    expect((await listQuarantinedOperations("account:a"))[0]?.operationId)
      .toBe("sync:poison");
  });

  it("atomically replaces an anonymous checkpoint and outbox with one account import", async () => {
    const localState = state();
    const document = createInitialSyncDocument(
      localState,
      "2026-07-20T00:00:00.000Z",
      "bootstrap",
    );
    await enqueueSyncOperation({
      protocolVersion: 1,
      operationId: "sync:anonymous-old",
      idempotencyKey: "sync:anonymous-old",
      ownerKey: "anonymous:device",
      installationId: "installation",
      deviceId: "device",
      deviceSequence: await allocateDeviceSequence(),
      baseRevision: 0,
      kind: "reset",
      contentVersion: localState.contentVersion,
      occurredAt: "2026-07-20T00:00:00.000Z",
      requestHash: "old-hash",
      document,
    }, localState);

    const { ownerGeneration } = await readOrInitializeOwnerGeneration(
      "anonymous:device",
    );
    await enqueueOwnerAdoptionOperation("anonymous:device", {
      protocolVersion: 1,
      operationId: "sync:account-import",
      idempotencyKey: "sync:account-import",
      ownerKey: "account:a",
      installationId: "installation",
      deviceId: "device",
      deviceSequence: await allocateDeviceSequence(),
      baseRevision: 4,
      kind: "local-import",
      contentVersion: localState.contentVersion,
      occurredAt: "2026-07-20T00:01:00.000Z",
      requestHash: "import-hash",
      document,
    }, localState, ownerGeneration);

    expect(await readOwnerDocument("anonymous:device")).toBeNull();
    expect(await readOwnerLocalState("anonymous:device")).toBeNull();
    expect(await listPendingOperations("anonymous:device")).toEqual([]);
    expect((await listPendingOperations("account:a")).map((item) => item.operationId))
      .toEqual(["sync:account-import"]);
  });
});
