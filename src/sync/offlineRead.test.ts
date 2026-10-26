import 'fake-indexeddb/auto';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { offlineRead } from './offlineRead';
import { readOrInitializeOwnerGeneration, resetSyncDatabaseForTests } from './indexedDb';

async function clear() {
  await resetSyncDatabaseForTests();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('hanzi-os-sync-v1');
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
  });
}
beforeEach(async () => { await clear(); await readOrInitializeOwnerGeneration('account:a'); });
afterEach(async () => { vi.restoreAllMocks(); await clear(); });
const url = '/api/content/runtime?projection=learning';
it('keeps an owner-scoped copy across reload, network loss and a server outage, then receives updates', async () => {
  const send = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ version: 'old' }));
  await offlineRead(url, undefined, send);
  await resetSyncDatabaseForTests();
  send.mockRejectedValue(new TypeError('network'));
  expect(await (await offlineRead(url, undefined, send)).json()).toEqual({ version: 'old' });
  send.mockResolvedValue(new Response(null, { status: 503 }));
  expect((await offlineRead(url, undefined, send)).headers.get('x-hanzi-offline')).toBe('1');
  send.mockResolvedValue(Response.json({ version: 'new' }));
  expect(await (await offlineRead(url, undefined, send)).json()).toEqual({ version: 'new' });
  send.mockRejectedValue(new TypeError('network'));
  expect(await (await offlineRead(url, undefined, send)).json()).toEqual({ version: 'new' });
});
it('does not resurrect a denied resource or substitute a different query', async () => {
  const send = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ data: 1 }));
  await offlineRead(url, undefined, send);
  send.mockRejectedValue(new TypeError('network'));
  await expect(offlineRead('/api/content/runtime?projection=vocabulary', undefined, send)).rejects.toThrow('network');
  send.mockResolvedValue(new Response(null, { status: 403 }));
  expect((await offlineRead(url, undefined, send)).status).toBe(403);
  send.mockRejectedValue(new TypeError('network'));
  await expect(offlineRead(url, undefined, send)).rejects.toThrow('network');
});
it('never caches authentication, admin or mutation responses and honors cancellation', async () => {
  const send = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ secret: 1 }));
  for (const path of ['/api/session', '/api/admin/users']) {
    await offlineRead(path, undefined, send);
    send.mockRejectedValueOnce(new TypeError('network'));
    await expect(offlineRead(path, undefined, send)).rejects.toThrow('network');
  }
  await offlineRead(url, { method: 'POST' }, send);
  send.mockRejectedValueOnce(new TypeError('network'));
  await expect(offlineRead(url, undefined, send)).rejects.toThrow('network');
  await offlineRead(url, undefined, send);
  const controller = new AbortController(); controller.abort();
  send.mockRejectedValue(new TypeError('network'));
  await expect(offlineRead(url, { signal: controller.signal }, send)).rejects.toBe(controller.signal.reason);
});
