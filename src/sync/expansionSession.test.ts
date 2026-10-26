import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readActiveOwnerLearningScope, readOrInitializeOwnerGeneration, resetSyncDatabaseForTests,
  transitionOwnerCheckpoint, writeLessonResume, readLessonResume, type ActiveOwnerLearningScope } from './indexedDb';
import { readWorkspace, syncWorkspace } from './workspaceSync';
import { advanceExpansionSession, openExpansionSession, readExpansionSession } from './expansionSession';
import { readLocalActivityHistory } from './activityHistory';
import { createInitialSyncDocument } from './document';
import { INITIAL_LEARNING_STATE } from '../store/LearningStore';

let scope: ActiveOwnerLearningScope;
const source = { missionId: 'expansion-one', contentVersion: 'frozen-v1', itemIds: ['word-one', 'word-two'] };
const clear = async () => {
  await resetSyncDatabaseForTests();
  await new Promise<void>((resolve, reject) => { const request = indexedDB.deleteDatabase('hanzi-os-sync-v1');
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
};
beforeEach(async () => { await clear(); vi.stubGlobal('window', new EventTarget());
  await readOrInitializeOwnerGeneration('account:expansion'); scope = (await readActiveOwnerLearningScope())!; });
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); await clear(); });

it('opens one session across tabs, keeps reveal/advance across reload and never treats self-review as objective success', async () => {
  const [first, other] = await Promise.all([openExpansionSession(scope, source), openExpansionSession(scope, source)]);
  expect(other.id).toBe(first.id);
  const revealed = await advanceExpansionSession(scope, source, first, 'reveal');
  expect(revealed).toMatchObject({ index: 0, revealed: true, pending: true });
  await resetSyncDatabaseForTests(); expect(await readExpansionSession(scope, source)).toEqual(revealed);
  const [next, retry] = await Promise.all([advanceExpansionSession(scope, source, revealed, 'review'), advanceExpansionSession(scope, source, revealed, 'review')]);
  expect(next.index).toBe(1); expect(retry.index).toBe(1);
  const history = await readLocalActivityHistory(scope);
  expect(history).toHaveLength(3);
  expect(history.every(event => event.score === null && !event.masteryEligible && event.business?.category !== 'objective')).toBe(true);
  await expect(advanceExpansionSession(scope, source, first, 'review')).rejects.toThrow('another tab');
  await syncWorkspace(scope, new AbortController().signal, async (_url, init) => Response.json({ version: 1, resetEpoch: 0, entries: JSON.parse(init!.body as string).entries }));
  expect((await readExpansionSession(scope, source))?.pending).toBe(false);
});

it('keeps a new review of the same word separate and preserves old-version sources without attaching old answers to new content', async () => {
  const first = await openExpansionSession(scope, source);
  await advanceExpansionSession(scope, source, first, 'reveal');
  const original = await readWorkspace(scope);
  const restarted = await openExpansionSession(scope, source, true);
  expect(restarted.id).not.toBe(first.id); expect(restarted.revealed).toBe(false);
  await advanceExpansionSession(scope, source, restarted, 'reveal');
  const changed = { ...source, contentVersion: 'revised-v2' };
  expect(await readExpansionSession(scope, changed)).toBeNull();
  expect((await openExpansionSession(scope, changed)).revealed).toBe(false);
  expect((await readWorkspace(scope)).entries).toEqual(expect.arrayContaining(original.entries));
  expect((await readLocalActivityHistory(scope)).filter(event => event.business?.category === 'support')).toHaveLength(2);
});

it('keeps source/history unchanged on quota, unknown schema, reset and changed owner', async () => {
  const first = await openExpansionSession(scope, source);
  const previous = await readWorkspace(scope);
  const put = IDBObjectStore.prototype.put;
  const failure = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function(this: IDBObjectStore, value, key) {
    if (this.name === 'lesson-resumes') throw new DOMException('quota', 'QuotaExceededError');
    return key === undefined ? put.call(this, value) : put.call(this, value, key);
  });
  await expect(advanceExpansionSession(scope, source, first, 'reveal')).rejects.toThrow();
  failure.mockRestore(); expect(await readWorkspace(scope)).toEqual(previous);
  await expect(openExpansionSession({ ...scope, resetEpoch: 1 }, source)).rejects.toThrow();
  const cache = { expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: 0, entryKey: 'workspace-sync:v1' };
  await writeLessonResume({ ...cache, value: { version: 99, raw: 'preserve' } });
  await expect(openExpansionSession(scope, source)).rejects.toThrow();
  expect((await readLessonResume(cache))?.value).toEqual({ version: 99, raw: 'preserve' });
  await transitionOwnerCheckpoint(scope.ownerGeneration, 'account:other', 0,
    createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-10-19T00:00:00Z', 'switch'), INITIAL_LEARNING_STATE);
  await expect(openExpansionSession(scope, source)).rejects.toThrow();
});
