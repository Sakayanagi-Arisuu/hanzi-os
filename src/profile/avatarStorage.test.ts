import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { saveGuestAvatar, readAvatar } from './avatarStorage';
import { avatarStorageKey } from './avatarContract';
import { readActiveOwnerLearningScope, readOrInitializeOwnerGeneration, resetSyncDatabaseForTests,
  readSyncMeta, writeSyncMeta, transitionOwnerCheckpoint, deleteOwnerData, type OwnerGeneration } from '../sync/indexedDb';
import { createInitialSyncDocument } from '../sync/document';
import { INITIAL_LEARNING_STATE } from '../store/LearningStore';

let owner: OwnerGeneration;
const blob = () => new Blob(['fixture-webp-output'], { type: 'image/webp' });
const clear = async () => {
  await resetSyncDatabaseForTests();
  await new Promise<void>((resolve, reject) => { const request = indexedDB.deleteDatabase('hanzi-os-sync-v1'); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
};
beforeEach(async () => { await clear(); vi.stubGlobal('window', new EventTarget()); vi.stubGlobal('BroadcastChannel', undefined);
  owner = (await readOrInitializeOwnerGeneration('anonymous:avatar-one')).ownerGeneration; });
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); await clear(); });

it('persists binary outside learning state, reloads, rejects stale revisions and does not resurrect a removed image', async () => {
  expect(await readAvatar(owner)).toBeNull();
  const first = await saveGuestAvatar(owner, 0, blob());
  await resetSyncDatabaseForTests();
  expect((await readAvatar(owner))?.revision).toBe(1);
  expect(await (await readAvatar(owner))!.blob!.text()).toBe('fixture-webp-output');
  await expect(saveGuestAvatar(owner, 0, blob())).rejects.toThrow('cửa sổ khác');
  const removed = await saveGuestAvatar(owner, 1, null);
  expect(removed).toMatchObject({ revision: 2, blob: null });
  await expect(saveGuestAvatar(owner, first.revision, blob())).rejects.toThrow();
  expect(await readAvatar(owner)).toEqual(removed);
});

it('keeps the previous blob on quota/unknown-schema/type errors', async () => {
  await saveGuestAvatar(owner, 0, blob());
  const before = await readAvatar(owner);
  const put = IDBObjectStore.prototype.put;
  const failure = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function(this: IDBObjectStore, value, key) {
    if (value.key?.startsWith('learner-avatar:')) throw new DOMException('quota', 'QuotaExceededError');
    return key === undefined ? put.call(this, value) : put.call(this, value, key);
  });
  await expect(saveGuestAvatar(owner, 1, blob())).rejects.toThrow();
  failure.mockRestore();
  expect((await readAvatar(owner))?.revision).toBe(before?.revision);
  await expect(saveGuestAvatar(owner, 1, new Blob(['svg'], { type: 'image/svg+xml' }))).rejects.toThrow();
  const raw = { version: 99, raw: 'preserve', blob: blob() };
  await writeSyncMeta(avatarStorageKey(owner.ownerKey), raw);
  await expect(readAvatar(owner)).rejects.toThrow();
  await expect(saveGuestAvatar(owner, 1, null)).rejects.toThrow();
  expect(await readSyncMeta(avatarStorageKey(owner.ownerKey))).toMatchObject({ version: 99, raw: 'preserve' });
});

it('fences owner switches, preserves avatar through a learning reset and deletes only the intended owner media', async () => {
  await saveGuestAvatar(owner, 0, blob());
  const document = createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-10-19T00:00:00Z', 'avatar-reset');
  document.reset.epoch = 7;
  const afterReset = await transitionOwnerCheckpoint(owner, owner.ownerKey, 0, document, INITIAL_LEARNING_STATE);
  expect((await readAvatar(afterReset))?.revision).toBe(1);
  await expect(saveGuestAvatar(owner, 1, blob())).rejects.toThrow();
  const other = await transitionOwnerCheckpoint(afterReset, 'anonymous:avatar-two', 0, document, INITIAL_LEARNING_STATE);
  await saveGuestAvatar(other, 0, blob());
  await expect(saveGuestAvatar(afterReset, 1, blob())).rejects.toThrow();
  await deleteOwnerData(owner.ownerKey);
  expect(await readSyncMeta(avatarStorageKey(owner.ownerKey))).toBeNull();
  expect((await readAvatar(other))?.blob).not.toBeNull();
  expect((await readActiveOwnerLearningScope())?.resetEpoch).toBe(7);
  await expect(saveGuestAvatar({ ...other, ownerKey: 'account:one' }, 0, blob())).rejects.toThrow('adapter');
});
