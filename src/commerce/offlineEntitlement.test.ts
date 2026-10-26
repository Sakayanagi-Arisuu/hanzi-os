import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readCommerceWithOfflineFallback } from './offlineEntitlement';
import { readOrInitializeOwnerGeneration, resetSyncDatabaseForTests } from '../sync/indexedDb';

async function clear() {
  await resetSyncDatabaseForTests();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('hanzi-os-sync-v1');
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
  });
}
beforeEach(async () => { await clear(); await readOrInitializeOwnerGeneration('account:a'); });
afterEach(async () => { vi.restoreAllMocks(); await clear(); });
it('keeps downloaded access through an outage, never extends expiry, and invalidates a denial', async () => {
  const now = Date.now();
  const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
  const send = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ active: true, authenticated: true,
    sandbox: true, serverNow: 1000, expiresAt: 3000, orders: [{ private: 'order' }] }));
  const signal = new AbortController().signal;
  await readCommerceWithOfflineFallback('account:a', signal, send);
  send.mockRejectedValue(new TypeError('network'));
  clock.mockReturnValue(now + 1000);
  expect(await readCommerceWithOfflineFallback('account:a', signal, send)).toMatchObject({ active: true, serverNow: 2000, orders: [] });
  clock.mockReturnValue(now + 2000);
  expect(await readCommerceWithOfflineFallback('account:a', signal, send)).toMatchObject({ active: false });
  await expect(readCommerceWithOfflineFallback('account:b', signal, send)).rejects.toThrow('network');
  send.mockResolvedValue(new Response(null, { status: 403 }));
  await expect(readCommerceWithOfflineFallback('account:a', signal, send)).rejects.toThrow();
  send.mockRejectedValue(new TypeError('network'));
  await expect(readCommerceWithOfflineFallback('account:a', signal, send)).rejects.toThrow('network');
});
