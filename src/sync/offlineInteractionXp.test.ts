import 'fake-indexeddb/auto';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { queueInteractionXp, pendingInteractionXp, flushInteractionXp } from './offlineInteractionXp';
import { readOrInitializeOwnerGeneration, resetSyncDatabaseForTests } from './indexedDb';
const clear = async () => { await resetSyncDatabaseForTests(); await new Promise<void>(resolve => {
  const request = indexedDB.deleteDatabase('hanzi-os-sync-v1'); request.onsuccess = () => resolve();
}); };
beforeEach(async () => { await clear(); vi.stubGlobal('window', new EventTarget()); await readOrInitializeOwnerGeneration(`siwc_${'a'.repeat(64)}`); });
afterEach(async () => { vi.unstubAllGlobals(); await clear(); });
it('queues offline pronunciation rewards durably, deduplicates retries and clears only validated receipts', async () => {
  const claim = { rewardKey: 'pronunciation:day-one', resetEpoch: 0 };
  const scope = await queueInteractionXp(claim); await queueInteractionXp(claim);
  expect(await pendingInteractionXp(scope)).toEqual([claim]);
  await resetSyncDatabaseForTests();
  await flushInteractionXp(scope, new AbortController().signal, vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
  expect(await pendingInteractionXp(scope)).toHaveLength(1);
  await flushInteractionXp(scope, new AbortController().signal, vi.fn().mockResolvedValue(Response.json({ awarded: true, amount: 10 })));
  expect(await pendingInteractionXp(scope)).toEqual([]);
});
