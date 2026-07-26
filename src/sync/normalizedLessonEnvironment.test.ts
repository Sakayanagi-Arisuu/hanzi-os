import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  SYNC_DEVICE_STORAGE_KEY,
  SYNC_INSTALLATION_STORAGE_KEY,
} from "../lib/storageKeys";
import {
  readOrInitializeOwnerGeneration,
  resetSyncDatabaseForTests,
} from "./indexedDb";
import { readExactNormalizedLessonEnvironment } from "./normalizedLessonEnvironment";

const ownerKey = "account:test";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: new MemoryStorage(),
});

const deleteDatabase = () => new Promise<void>((resolve, reject) => {
  const request = indexedDB.deleteDatabase("hanzi-os-sync-v1");
  request.addEventListener("success", () => resolve(), { once: true });
  request.addEventListener("error", () => reject(request.error), { once: true });
});

describe("readExactNormalizedLessonEnvironment", () => {
  beforeEach(async () => {
    await resetSyncDatabaseForTests();
    await deleteDatabase();
    localStorage.clear();
  });

  afterEach(async () => {
    await resetSyncDatabaseForTests();
  });

  it("returns identifiers only for the exact active owner generation and reset", async () => {
    const claim = await readOrInitializeOwnerGeneration(ownerKey);
    localStorage.setItem(SYNC_INSTALLATION_STORAGE_KEY, "installation_test");
    localStorage.setItem(SYNC_DEVICE_STORAGE_KEY, "device_test");

    await expect(readExactNormalizedLessonEnvironment({
      accountKey: ownerKey,
      expectedOwnerGeneration: claim.ownerGeneration,
      expectedResetEpoch: 0,
    })).resolves.toEqual({
      ownerGeneration: claim.ownerGeneration,
      resetEpoch: 0,
      installationId: "installation_test",
      deviceId: "device_test",
    });
  });

  it("fails closed for owner, generation, reset, or identifier drift", async () => {
    const claim = await readOrInitializeOwnerGeneration(ownerKey);
    localStorage.setItem(SYNC_INSTALLATION_STORAGE_KEY, "installation_test");
    localStorage.setItem(SYNC_DEVICE_STORAGE_KEY, "device_test");

    await expect(readExactNormalizedLessonEnvironment({
      accountKey: "account:other",
      expectedOwnerGeneration: claim.ownerGeneration,
      expectedResetEpoch: 0,
    })).resolves.toBeNull();
    await expect(readExactNormalizedLessonEnvironment({
      accountKey: ownerKey,
      expectedOwnerGeneration: {
        ...claim.ownerGeneration,
        generation: claim.ownerGeneration.generation + 1,
      },
      expectedResetEpoch: 0,
    })).resolves.toBeNull();
    await expect(readExactNormalizedLessonEnvironment({
      accountKey: ownerKey,
      expectedOwnerGeneration: claim.ownerGeneration,
      expectedResetEpoch: 1,
    })).resolves.toBeNull();

    localStorage.removeItem(SYNC_DEVICE_STORAGE_KEY);
    await expect(readExactNormalizedLessonEnvironment({
      accountKey: ownerKey,
      expectedOwnerGeneration: claim.ownerGeneration,
      expectedResetEpoch: 0,
    })).resolves.toBeNull();
  });
});
