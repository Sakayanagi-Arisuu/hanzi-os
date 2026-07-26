import type { Page } from "@playwright/test";

export type OwnerScopedCacheRecord<T> = {
  entryKey: string;
  ownerKey: string;
  resetEpoch: number;
  value: T;
};

export type OwnerLocalStateRecord<T> = {
  ownerKey: string;
  state: T;
};

export async function readIndexedDbStore<T>(
  page: Page,
  storeName: string,
): Promise<T[]> {
  return page.evaluate(async (requestedStore) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("hanzi-os-sync-v1");
      request.addEventListener("success", () => resolve(request.result), {
        once: true,
      });
      request.addEventListener("error", () => reject(request.error), {
        once: true,
      });
      request.addEventListener("blocked", () => reject(
        new Error("IndexedDB open was blocked"),
      ), { once: true });
    });

    if (!database.objectStoreNames.contains(requestedStore)) {
      database.close();
      return [];
    }

    return new Promise<unknown[]>((resolve, reject) => {
      const transaction = database.transaction(requestedStore, "readonly");
      const request = transaction.objectStore(requestedStore).getAll();
      let records: unknown[] = [];
      request.addEventListener("success", () => {
        records = request.result;
      }, { once: true });
      request.addEventListener("error", () => reject(request.error), {
        once: true,
      });
      transaction.addEventListener("complete", () => {
        database.close();
        resolve(records);
      }, { once: true });
      transaction.addEventListener("abort", () => {
        database.close();
        reject(transaction.error);
      }, { once: true });
      transaction.addEventListener("error", () => {
        database.close();
        reject(transaction.error);
      }, { once: true });
    });
  }, storeName) as Promise<T[]>;
}

export async function writeCurrentOwnerLocalState<T>(
  page: Page,
  state: T,
) {
  await page.evaluate(async (nextState) => {
    const ownerKey = localStorage.getItem("hanzi-os-learning-owner-v1");
    if (!ownerKey) throw new Error("Current learning owner is unavailable");
    localStorage.setItem(
      "hanzi-os-learning-state-v1",
      JSON.stringify(nextState),
    );

    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("hanzi-os-sync-v1");
      request.addEventListener("success", () => resolve(request.result), {
        once: true,
      });
      request.addEventListener("error", () => reject(request.error), {
        once: true,
      });
      request.addEventListener("blocked", () => reject(
        new Error("IndexedDB open was blocked"),
      ), { once: true });
    });
    if (!database.objectStoreNames.contains("local-states")) {
      database.close();
      throw new Error("Owner-local learning state store is unavailable");
    }

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("local-states", "readwrite");
      transaction.objectStore("local-states").put({
        ownerKey,
        state: nextState,
        updatedAt: new Date().toISOString(),
      });
      transaction.addEventListener("complete", () => {
        database.close();
        resolve();
      }, { once: true });
      transaction.addEventListener("abort", () => {
        database.close();
        reject(transaction.error);
      }, { once: true });
      transaction.addEventListener("error", () => {
        database.close();
        reject(transaction.error);
      }, { once: true });
    });
  }, state);
}
