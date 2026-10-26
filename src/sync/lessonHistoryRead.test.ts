import "fake-indexeddb/auto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { INITIAL_LEARNING_STATE } from "../store/LearningStore";
import { createInitialSyncDocument } from "./document";
import { readAccountLessonHistoryPage, readLocalLessonHistory } from "./lessonHistory";
import {
  readActiveOwnerLearningScope, readOrInitializeOwnerGeneration, resetSyncDatabaseForTests,
  transitionOwnerCheckpoint, writeOwnerCheckpoint, StaleOwnerGenerationError,
} from "./indexedDb";

beforeEach(async () => {
  await resetSyncDatabaseForTests();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase("hanzi-os-sync-v1");
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
  });
});
afterEach(async () => { await resetSyncDatabaseForTests(); vi.unstubAllGlobals(); });

const setup = async () => {
  const { ownerGeneration } = await readOrInitializeOwnerGeneration("account:history");
  await writeOwnerCheckpoint(ownerGeneration.ownerKey, 0,
    createInitialSyncDocument(INITIAL_LEARNING_STATE, "2026-10-18T03:00:00.000Z", "history-read"),
    INITIAL_LEARNING_STATE, ownerGeneration);
  return (await readActiveOwnerLearningScope())!;
};

it("reads an existing database without inventing legacy activities or changing stored business data", async () => {
  const scope = await setup();
  expect(await readLocalLessonHistory(scope)).toEqual([]);
  const send = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ schemaVersion: 1,
    ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: 0, events: [], nextCursor: null }));
  const page = await readAccountLessonHistoryPage(scope, { send });
  expect(page.events).toEqual([]);
  expect(send.mock.calls[0][0]).toContain("resetEpoch=0");
  expect(send.mock.calls[0][1]).toMatchObject({ cache: "no-store", headers: { "x-learning-owner": scope.ownerGeneration.ownerKey } });
});

it("rejects outage and unknown projection schema without replacing local history", async () => {
  const scope = await setup();
  await expect(readAccountLessonHistoryPage(scope, { send: async () => new Response(null, { status: 503 }) })).rejects.toThrow("retained");
  await expect(readAccountLessonHistoryPage(scope, { send: async () => Response.json({ schemaVersion: 99 }) })).rejects.toThrow("retained");
  expect(await readLocalLessonHistory(scope)).toEqual([]);
});

it("fences a late history response when owner generation changes during the request", async () => {
  const scope = await setup();
  await expect(readAccountLessonHistoryPage(scope, { send: async () => {
    await transitionOwnerCheckpoint(scope.ownerGeneration, "account:other", 0,
      createInitialSyncDocument(INITIAL_LEARNING_STATE, "2026-10-18T03:00:00.000Z", "history-other"), INITIAL_LEARNING_STATE);
    return Response.json({ schemaVersion: 1, ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: 0, events: [], nextCursor: null });
  } })).rejects.toBeInstanceOf(StaleOwnerGenerationError);
});
