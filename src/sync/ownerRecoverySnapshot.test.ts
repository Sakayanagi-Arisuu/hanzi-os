import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { captureOwnerRecoverySnapshot, OWNER_RECOVERY_STORES, readActiveOwnerLearningScope, readOrInitializeOwnerGeneration,
  resetSyncDatabaseForTests, writeLessonResume, writeSyncMeta, transitionOwnerCheckpoint, type ActiveOwnerLearningScope } from './indexedDb';
import { INITIAL_LEARNING_STATE } from '../store/LearningStore';
import { createInitialSyncDocument } from './document';
import { saveGuestAvatar } from '../profile/avatarStorage';
import { avatarStorageKey } from '../profile/avatarContract';
import { saveMistakeRevisit } from './mistakeRevisit';
import { readWorkspace } from './workspaceSync';

let scope: ActiveOwnerLearningScope;
const clear = async () => {
  await resetSyncDatabaseForTests();
  await new Promise<void>((resolve, reject) => { const request = indexedDB.deleteDatabase('hanzi-os-sync-v1');
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
};
beforeEach(async () => { await clear(); vi.stubGlobal('window', new EventTarget());
  await readOrInitializeOwnerGeneration('anonymous:recovery'); scope = (await readActiveOwnerLearningScope())!; });
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); await clear(); });

it('captures all owner IDB stores, pending primary/history and binary avatar without exporting unrelated metadata', async () => {
  const blob = new Blob(['test-encoded-webp'], { type: 'image/webp' });
  await saveGuestAvatar(scope.ownerGeneration, 0, blob);
  await writeSyncMeta('secret-provider-token', 'never-export');
  await writeSyncMeta(avatarStorageKey('anonymous:other'), { private: 'other-avatar' });
  await writeLessonResume({ expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: 0,
    entryKey: 'future-schema', value: { version: 99, raw: 'preserve' } });
  await saveMistakeRevisit(scope, { id: 'mistake', referenceLessonId: 'boot-1', originSource: 'lesson' } as Parameters<typeof saveMistakeRevisit>[1], 'pending');
  const before = await readWorkspace(scope);
  const snapshot = await captureOwnerRecoverySnapshot(scope);
  expect(snapshot.coverage).toBe('indexeddb-owner-only');
  expect(Object.keys(snapshot.stores).sort()).toEqual([...OWNER_RECOVERY_STORES].sort());
  expect(snapshot.stores['lesson-resumes']).toEqual(expect.arrayContaining([
    expect.objectContaining({ entryKey: 'future-schema', value: { version: 99, raw: 'preserve' } }),
    expect.objectContaining({ entryKey: 'workspace-sync:v1', value: before }),
  ]));
  const media = snapshot.avatar as { value: { blob: Blob; revision: number } };
  expect(await media.value.blob.text()).toBe(await blob.text());
  expect(media.value.revision).toBe(1);
  expect(JSON.stringify(snapshot)).not.toMatch(/never-export|other-avatar|secret-provider-token/);
  expect(snapshot.excluded).toContain('localStorage');
  expect(await readWorkspace(scope)).toEqual(before);
});

it('rejects stale owner/reset and read failures without rewriting unknown raw sources', async () => {
  await writeLessonResume({ expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: 0,
    entryKey: 'workspace-sync:v1', value: { version: 99, raw: 'keep' } });
  const before = await captureOwnerRecoverySnapshot(scope);
  await expect(captureOwnerRecoverySnapshot({ ...scope, resetEpoch: 1 })).rejects.toThrow();
  const failure = vi.spyOn(IDBIndex.prototype, 'getAll').mockImplementation(() => { throw new Error('read failure'); });
  await expect(captureOwnerRecoverySnapshot(scope)).rejects.toThrow('read failure');
  failure.mockRestore();
  expect((await captureOwnerRecoverySnapshot(scope)).stores).toEqual(before.stores);
  await transitionOwnerCheckpoint(scope.ownerGeneration, 'anonymous:other', 0,
    createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-10-20T00:00:00Z', 'switch'), INITIAL_LEARNING_STATE);
  await expect(captureOwnerRecoverySnapshot(scope)).rejects.toThrow();
  const other = await captureOwnerRecoverySnapshot((await readActiveOwnerLearningScope())!);
  expect(other.stores['lesson-resumes']).toHaveLength(0);
  expect(other.avatar).toBeNull();
});
