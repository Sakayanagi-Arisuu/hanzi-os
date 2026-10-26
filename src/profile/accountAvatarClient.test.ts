import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { readAccountAvatar, saveAccountAvatar } from './accountAvatarClient';
import { AVATAR_CHANGED } from './avatarStorage';
import { avatarStorageKey } from './avatarContract';
import { ACTIVE_OWNER_GENERATION_KEY, readOrInitializeOwnerGeneration, readSyncMeta, resetSyncDatabaseForTests, writeSyncMeta, type OwnerGeneration } from '../sync/indexedDb';

let owner: OwnerGeneration, bytes: Uint8Array;
const clear = async () => {
  await resetSyncDatabaseForTests();
  await new Promise<void>((resolve, reject) => { const request = indexedDB.deleteDatabase('hanzi-os-sync-v1'); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
};
const snapshot = (revision = 1, hasImage = true) => ({ version: 1, ownerKey: owner.ownerKey, revision,
  updatedAt: revision ? '2026-10-26T00:00:00Z' : null, hasImage, uploadAvailable: true });
beforeEach(async () => {
  await clear(); vi.stubGlobal('window', new EventTarget()); vi.stubGlobal('BroadcastChannel', undefined);
  owner = (await readOrInitializeOwnerGeneration('account:avatar-test')).ownerGeneration;
  bytes = new Uint8Array(await sharp({ create: { width: 256, height: 256, channels: 3, background: '#76ab98' } }).webp().toBuffer());
});
afterEach(async () => { vi.unstubAllGlobals(); await clear(); });

it('reads the exact private revision without storing account bytes in the learner database', async () => {
  const send = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(snapshot()))
    .mockResolvedValueOnce(new Response(Uint8Array.from(bytes), { headers: { 'content-type': 'image/webp' } }));
  const result = await readAccountAvatar(owner, { send });
  expect(result.record?.blob?.size).toBe(bytes.length);
  expect(send.mock.calls[1][0]).toBe('/api/account/avatar?image=1&revision=1');
  expect(send.mock.calls[1][1]).toMatchObject({ cache: 'no-store', credentials: 'same-origin', headers: { 'x-learning-owner': owner.ownerKey } });
  expect(await readSyncMeta(avatarStorageKey(owner.ownerKey))).toBeNull();
});

it.each(['owner', 'generation'])('rejects delayed binary after a %s switch', async kind => {
  let finish!: (response: Response) => void;
  const binary = new Promise<Response>(resolve => { finish = resolve; });
  const send = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(snapshot())).mockReturnValueOnce(binary);
  const result = readAccountAvatar(owner, { send });
  const rejected = expect(result).rejects.toMatchObject({ code: 'WORKSPACE_CHANGED' });
  await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2));
  await writeSyncMeta(ACTIVE_OWNER_GENERATION_KEY, { ownerKey: kind === 'owner' ? 'account:other' : owner.ownerKey, generation: owner.generation + 1 });
  finish(new Response(Uint8Array.from(bytes), { headers: { 'content-type': 'image/webp' } }));
  await rejected;
  expect(await readSyncMeta(avatarStorageKey(owner.ownerKey))).toBeNull();
});

it('rejects wrong-owner/version metadata and invalid binary without adopting it', async () => {
  for (const invalid of [{ ...snapshot(), ownerKey: 'account:other' }, { ...snapshot(), version: 2 }]) {
    const send = vi.fn<typeof fetch>().mockResolvedValue(Response.json(invalid));
    await expect(readAccountAvatar(owner, { send })).rejects.toThrow(); expect(send).toHaveBeenCalledTimes(1);
  }
  const send = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(snapshot()))
    .mockResolvedValueOnce(new Response('bad bytes', { headers: { 'content-type': 'image/webp' } }));
  await expect(readAccountAvatar(owner, { send })).rejects.toThrow();
});

it('preserves exact mutation bytes, revision and operation on retry; accepts a later current tombstone', async () => {
  const blob = new Blob([Uint8Array.from(bytes)], { type: 'image/webp' }), operationId = crypto.randomUUID();
  const send = vi.fn<typeof fetch>().mockRejectedValueOnce(new TypeError('Network interrupted'))
    .mockResolvedValueOnce(Response.json({ committedRevision: 1, snapshot: snapshot(2, false) }));
  await expect(saveAccountAvatar(owner, 0, blob, operationId, { send })).rejects.toThrow();
  expect(await saveAccountAvatar(owner, 0, blob, operationId, { send })).toMatchObject({ revision: 2, hasImage: false });
  for (const [, init] of send.mock.calls) {
    expect(init).toMatchObject({ method: 'PUT', body: blob, headers: { 'if-match': '"0"', 'x-avatar-operation': operationId, 'x-learning-owner': owner.ownerKey } });
  }
});

it('does not announce malformed receipts or old-owner acknowledgements', async () => {
  const changed = vi.fn(); window.addEventListener(AVATAR_CHANGED, changed);
  await expect(saveAccountAvatar(owner, 0, null, crypto.randomUUID(), { send: vi.fn<typeof fetch>().mockResolvedValue(Response.json({ committedRevision: 2, snapshot: snapshot(2, false) })) }))
    .rejects.toMatchObject({ code: 'AVATAR_RECEIPT_INVALID' });
  const send = vi.fn<typeof fetch>().mockImplementation(async () => {
    await writeSyncMeta(ACTIVE_OWNER_GENERATION_KEY, { ...owner, generation: owner.generation + 1 });
    return Response.json({ committedRevision: 1, snapshot: snapshot(1, false) });
  });
  await expect(saveAccountAvatar(owner, 0, null, crypto.randomUUID(), { send })).rejects.toMatchObject({ code: 'WORKSPACE_CHANGED' });
  expect(changed).not.toHaveBeenCalled();
});

it('keeps an accepted save successful when cross-tab delivery is unavailable', async () => {
  vi.stubGlobal('BroadcastChannel', class { constructor() { throw new Error('disabled'); } });
  const send = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ committedRevision: 1, snapshot: snapshot(1, false) }));
  expect(await saveAccountAvatar(owner, 0, null, crypto.randomUUID(), { send })).toMatchObject({ revision: 1 });
});
