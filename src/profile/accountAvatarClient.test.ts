import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { readAccountAvatar, saveAccountAvatar } from './accountAvatarClient';
import { AVATAR_CHANGED, readAvatar, cacheAccountAvatar } from './avatarStorage';
import { avatarStorageKey } from './avatarContract';
import { ACTIVE_OWNER_GENERATION_KEY, deleteOwnerData, readOrInitializeOwnerGeneration, readSyncMeta, resetSyncDatabaseForTests, writeSyncMeta, type OwnerGeneration } from '../sync/indexedDb';

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
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); await clear(); });

it('caches the exact validated private revision for owner-bound offline display', async () => {
  const send = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(snapshot()))
    .mockResolvedValueOnce(new Response(Uint8Array.from(bytes), { headers: { 'content-type': 'image/webp' } }));
  const result = await readAccountAvatar(owner, { send });
  expect(result.record?.blob?.size).toBe(bytes.length);
  expect(send.mock.calls[1][0]).toBe('/api/account/avatar?image=1&revision=1');
  expect(send.mock.calls[1][1]).toMatchObject({ cache: 'no-store', credentials: 'same-origin', headers: { 'x-learning-owner': owner.ownerKey } });
  expect(result.offlineCached).toBe(true);
  const cached = await readAvatar(owner);
  expect(cached?.revision).toBe(1);
  expect([...new Uint8Array(await cached!.blob!.arrayBuffer())]).toEqual([...bytes]);
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

it('does not let a delayed old image revive a confirmed removal', async () => {
  let finish!: (response: Response) => void;
  const pending = new Promise<Response>(resolve => { finish = resolve; });
  const send = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(snapshot(1))).mockReturnValueOnce(pending);
  const old = readAccountAvatar(owner, { send });
  await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2));
  await saveAccountAvatar(owner, 1, null, crypto.randomUUID(), { send: vi.fn<typeof fetch>().mockResolvedValue(Response.json({ committedRevision: 2, snapshot: snapshot(2, false) })) });
  finish(new Response(Uint8Array.from(bytes), { headers: { 'content-type': 'image/webp' } }));
  expect((await old).record).toMatchObject({ revision: 2, blob: null });
  expect(await readAvatar(owner)).toMatchObject({ revision: 2, blob: null });
});

it('returns the newest cached revision when parallel reads complete out of order', async () => {
  let finish!: (response: Response) => void;
  const send = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(snapshot(1)))
    .mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const old = readAccountAvatar(owner, { send });
  await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(2));
  await readAccountAvatar(owner, { send: vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(snapshot(2)))
    .mockResolvedValueOnce(new Response(Uint8Array.from(bytes), { headers: { 'content-type': 'image/webp' } })) });
  finish(new Response(Uint8Array.from(bytes), { headers: { 'content-type': 'image/webp' } }));
  expect((await old).record?.revision).toBe(2);
  expect((await readAvatar(owner))?.revision).toBe(2);
});

it('keeps verified online reads usable on quota failure without changing the previous cache', async () => {
  const record = { version: 1 as const, ownerKey: owner.ownerKey, revision: 1, updatedAt: snapshot().updatedAt!, blob: new Blob([Uint8Array.from(bytes)], { type: 'image/webp' }) };
  await cacheAccountAvatar(owner, record);
  const put = IDBObjectStore.prototype.put;
  vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function(this: IDBObjectStore, value, key) {
    if (value.key === avatarStorageKey(owner.ownerKey)) throw new DOMException('quota', 'QuotaExceededError');
    return key === undefined ? put.call(this, value) : put.call(this, value, key);
  });
  const result = await readAccountAvatar(owner, { send: vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(snapshot(2)))
    .mockResolvedValueOnce(new Response(Uint8Array.from(bytes), { headers: { 'content-type': 'image/webp' } })) });
  expect(result.record?.revision).toBe(2); expect(result.offlineCached).toBe(false);
  expect((await readAvatar(owner))?.revision).toBe(1);
});

it('keeps malformed cached raw data and never adopts guest media or another owner cache', async () => {
  const raw = { version: 99, original: 'retain' }; await writeSyncMeta(avatarStorageKey(owner.ownerKey), raw);
  const result = await readAccountAvatar(owner, { send: vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(snapshot()))
    .mockResolvedValueOnce(new Response(Uint8Array.from(bytes), { headers: { 'content-type': 'image/webp' } })) });
  expect(result.offlineCached).toBe(false); expect(result.record?.revision).toBe(1);
  expect(await readSyncMeta(avatarStorageKey(owner.ownerKey))).toEqual(raw);
  await expect(cacheAccountAvatar({ ...owner, ownerKey: 'anonymous:guest' }, null)).rejects.toThrow('guest');
  await writeSyncMeta(ACTIVE_OWNER_GENERATION_KEY, { ownerKey: 'account:other', generation: owner.generation + 1 });
  await expect(readAvatar(owner)).rejects.toThrow();
  expect(await readAvatar({ ownerKey: 'account:other', generation: owner.generation + 1 })).toBeNull();
});

it('deletes the account media cache with owner data while retaining another owner cache', async () => {
  await readAccountAvatar(owner, { send: vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(snapshot()))
    .mockResolvedValueOnce(new Response(Uint8Array.from(bytes), { headers: { 'content-type': 'image/webp' } })) });
  await writeSyncMeta(avatarStorageKey('account:other'), { version: 99, retained: true });
  await deleteOwnerData(owner.ownerKey);
  expect(await readSyncMeta(avatarStorageKey(owner.ownerKey))).toBeNull();
  expect(await readSyncMeta(avatarStorageKey('account:other'))).toEqual({ version: 99, retained: true });
});
