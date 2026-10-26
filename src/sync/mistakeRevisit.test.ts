import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { RemediationObservatoryItem } from '../mistakes/remediationObservatory';
import { readActiveOwnerLearningScope, readOrInitializeOwnerGeneration, resetSyncDatabaseForTests,
  transitionOwnerCheckpoint, writeLessonResume, readLessonResume, type ActiveOwnerLearningScope } from './indexedDb';
import { createInitialSyncDocument } from './document';
import { INITIAL_LEARNING_STATE } from '../store/LearningStore';
import { readWorkspace, syncWorkspace } from './workspaceSync';
import { readLocalActivityHistory } from './activityHistory';
import { saveMistakeRevisit } from './mistakeRevisit';

let scope: ActiveOwnerLearningScope;
const item: RemediationObservatoryItem = { id: 'old-item', referenceLessonId: 'daily-001',
  contentVersion: 'archived-content', activityVersion: 'archived-item', skill: 'reading', skillLabel: 'Đọc',
  kindLabel: 'Tự trả lời', originSource: 'lesson', originLabel: 'Thiên Lộ', originDetail: 'Bài cũ',
  instruction: 'Trả lời', prompt: 'private question', options: [], hint: 'private answer',
  previousAnswer: 'private response', occurrenceCount: 1, correctedStreak: 0, resolved: false, lastAttemptAt: 1 };
const clear = async () => {
  await resetSyncDatabaseForTests();
  await new Promise<void>((resolve, reject) => { const request = indexedDB.deleteDatabase('hanzi-os-sync-v1');
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
};
beforeEach(async () => { await clear(); vi.stubGlobal('window', new EventTarget());
  await readOrInitializeOwnerGeneration('account:revisit'); scope = (await readActiveOwnerLearningScope())!; });
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); await clear(); });

it('keeps retry/two tabs/reload and offline acknowledgment as one support activity, never an objective answer', async () => {
  await Promise.all([saveMistakeRevisit(scope, item, 'open-one'), saveMistakeRevisit(scope, item, 'open-one')]);
  const before = await readWorkspace(scope);
  expect(JSON.stringify(before)).not.toMatch(/private/);
  expect(await readLocalActivityHistory(scope)).toMatchObject([{ module: 'mistakes', outcome: 'unknown', score: null,
    masteryEligible: false, confirmationState: 'provisional', activityVersion: 'archived-item', contentVersion: 'archived-content',
    sourceLessonIds: ['daily-001'], business: { category: 'support', details: { navigation: 'requested' } } }]);
  await expect(syncWorkspace(scope, new AbortController().signal, async () => { throw new Error('offline'); })).rejects.toThrow();
  await resetSyncDatabaseForTests();
  expect(await readWorkspace(scope)).toEqual(before);
  await syncWorkspace(scope, new AbortController().signal, async (_url, init) => Response.json({ version: 1, resetEpoch: 0,
    entries: JSON.parse(init!.body as string).entries }));
  expect(await readLocalActivityHistory(scope)).toMatchObject([{ confirmationState: 'confirmed', outcome: 'unknown', masteryEligible: false }]);
  await saveMistakeRevisit(scope, item, 'open-two');
  expect(await readLocalActivityHistory(scope)).toHaveLength(2);
});

it('retains unknown legacy versions without inventing source evidence', async () => {
  await saveMistakeRevisit(scope, { ...item, contentVersion: undefined, activityVersion: undefined }, 'legacy');
  expect(await readLocalActivityHistory(scope)).toMatchObject([{ contentVersion: 'unknown', activityVersion: 'unknown',
    firstResponseRef: null, outcome: 'unknown', assistance: { hint: null, reveal: null } }]);
  await expect(saveMistakeRevisit(scope, { ...item, referenceLessonId: undefined }, 'missing')).rejects.toThrow();
  expect(await readLocalActivityHistory(scope)).toHaveLength(1);
});

it('preserves journal on quota/read/schema errors and fences stale reset/owner', async () => {
  await saveMistakeRevisit(scope, item, 'existing');
  const before = await readWorkspace(scope);
  const put = IDBObjectStore.prototype.put;
  const failure = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function(this: IDBObjectStore, value, key) {
    if (this.name === 'lesson-resumes') throw new DOMException('quota', 'QuotaExceededError');
    return key === undefined ? put.call(this, value) : put.call(this, value, key);
  });
  await expect(saveMistakeRevisit(scope, item, 'failed')).rejects.toThrow();
  failure.mockRestore(); expect(await readWorkspace(scope)).toEqual(before);
  await expect(saveMistakeRevisit({ ...scope, resetEpoch: 1 }, item, 'stale')).rejects.toThrow();
  const cache = { expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: 0, entryKey: 'workspace-sync:v1' };
  await writeLessonResume({ ...cache, value: { version: 99, raw: 'keep' } });
  await expect(saveMistakeRevisit(scope, item, 'schema')).rejects.toThrow();
  expect((await readLessonResume(cache))?.value).toEqual({ version: 99, raw: 'keep' });
  await transitionOwnerCheckpoint(scope.ownerGeneration, 'account:other', 0,
    createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-10-20T00:00:00Z', 'switch'), INITIAL_LEARNING_STATE);
  await expect(saveMistakeRevisit(scope, item, 'owner')).rejects.toThrow();
});

it('commits guest support without a server receipt or changes to correction sources', async () => {
  const current = await readActiveOwnerLearningScope();
  await transitionOwnerCheckpoint(current!.ownerGeneration, 'anonymous:revisit', 0,
    createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-10-20T00:00:00Z', 'guest'), INITIAL_LEARNING_STATE);
  const guest = (await readActiveOwnerLearningScope())!;
  await saveMistakeRevisit(guest, item, 'guest-open');
  expect(await readLocalActivityHistory(guest)).toMatchObject([{ authority: 'local-practice', outcome: 'unknown', masteryEligible: false }]);
  expect((await readWorkspace(guest)).entries.every(entry => !entry.key.startsWith('practice.correction:'))).toBe(true);
});
