import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readPlacementContext } from "./usePlacementContext";
import { readOrInitializeOwnerGeneration, resetSyncDatabaseForTests, writeLessonResume } from "../sync/indexedDb";

beforeEach(async () => {
  await resetSyncDatabaseForTests();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase("hanzi-os-sync-v1");
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
  });
});
afterEach(async () => { await resetSyncDatabaseForTests(); });

describe("placement context against real owner-scoped IndexedDB", () => {
  it.each(["anonymous:placement", "account:placement"])("observes page progress and rejects another owner for %s", async (ownerKey) => {
    const { ownerGeneration } = await readOrInitializeOwnerGeneration(ownerKey);
    const empty = await readPlacementContext(ownerKey);
    expect(empty.hasProgress).toBe(false);
    const scope = { expectedOwnerGeneration: ownerGeneration, resetEpoch: 0, entryKey: 'lesson-reading:v1:"boot-1"' };
    await writeLessonResume({ ...scope, value: { index: 0, blockIndex: 0, drafts: {} } });
    const opened = await readPlacementContext(ownerKey);
    expect(opened.hasProgress).toBe(true);
    expect(opened.snapshot).not.toBe(empty.snapshot);
    await writeLessonResume({ ...scope, value: { index: 0, blockIndex: 1, drafts: { item: { text: "你好" } } } });
    expect((await readPlacementContext(ownerKey)).snapshot).not.toBe(opened.snapshot);
    await expect(readPlacementContext("account:other")).rejects.toThrow();
    await expect(writeLessonResume({ ...scope, resetEpoch: 1, value: {} })).rejects.toThrow();
  });
});
