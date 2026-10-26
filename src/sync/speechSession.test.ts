import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readActiveOwnerLearningScope, readOrInitializeOwnerGeneration, resetSyncDatabaseForTests,
  transitionOwnerCheckpoint, writeLessonResume, readLessonResume, type ActiveOwnerLearningScope } from './indexedDb';
import { createInitialSyncDocument } from './document';
import { INITIAL_LEARNING_STATE } from '../store/LearningStore';
import { readWorkspace, syncWorkspace } from './workspaceSync';
import { readLocalActivityHistory } from './activityHistory';
import { completeSpeechSessionItem, openSpeechSession, readSpeechSession } from './speechSession';

let scope: ActiveOwnerLearningScope;
const source = { missionId: 'daily-speech', lessonId: 'boot-1', contentVersion: 'frozen-v1', version: 'display-digest-v1', itemIds: ['one', 'two'] };
const details = { manual: true, acousticReportAvailable: false, wordPlaybackCompleted: false, sentencePlaybackCompleted: false };
const clear = async () => {
  await resetSyncDatabaseForTests();
  await new Promise<void>((resolve, reject) => { const request = indexedDB.deleteDatabase('hanzi-os-sync-v1');
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
};
beforeEach(async () => { await clear(); vi.stubGlobal('window', new EventTarget());
  await readOrInitializeOwnerGeneration('account:speech'); scope = (await readActiveOwnerLearningScope())!; });
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); await clear(); });

it('resumes committed manual practice across crash/reload, stable retry and two tabs, with account pending until acknowledgment', async () => {
  const [first, tab] = await Promise.all([openSpeechSession(scope, source), openSpeechSession(scope, source)]);
  expect(tab.id).toBe(first.id);
  await Promise.all([completeSpeechSessionItem(scope, source, first.id, 'one', 'activity-one', details),
    completeSpeechSessionItem(scope, source, first.id, 'one', 'activity-one', details)]);
  await resetSyncDatabaseForTests();
  expect(await openSpeechSession(scope, source)).toMatchObject({ id: first.id, index: 1, completed: ['one'], manual: ['one'], pending: true });
  const before = await readWorkspace(scope);
  await expect(syncWorkspace(scope, new AbortController().signal, async () => { throw new Error('offline'); })).rejects.toThrow();
  expect(await readWorkspace(scope)).toEqual(before);
  await completeSpeechSessionItem(scope, source, tab.id, 'two', 'activity-two', details);
  expect(await readSpeechSession(scope, source)).toMatchObject({ completed: ['one', 'two'], pending: true });
  await syncWorkspace(scope, new AbortController().signal, async (_url, init) => Response.json({ version: 1, resetEpoch: 0,
    entries: JSON.parse(init!.body as string).entries }));
  expect((await readSpeechSession(scope, source))?.pending).toBe(false);
  const history = await readLocalActivityHistory(scope);
  expect(history).toHaveLength(3);
  expect(history.every(event => event.score === null && !event.masteryEligible && event.business?.category !== 'objective')).toBe(true);
});

it('keeps replay separate and leaves old content-version/manual records intact', async () => {
  const first = await openSpeechSession(scope, source);
  await completeSpeechSessionItem(scope, source, first.id, 'one', 'activity-one', details);
  await expect(completeSpeechSessionItem(scope, source, first.id, 'one', 'activity-one', { ...details, manual: false })).rejects.toThrow('first');
  const replay = await openSpeechSession(scope, source, true);
  expect(replay.id).not.toBe(first.id); expect(replay.completed).toEqual([]);
  await expect(completeSpeechSessionItem(scope, source, first.id, 'two', 'activity-two', details)).rejects.toThrow('changed');
  await completeSpeechSessionItem(scope, source, replay.id, 'one', 'activity-one', details);
  expect((await readLocalActivityHistory(scope)).filter(event => event.business?.category === 'self-review')).toHaveLength(2);
  expect(await readSpeechSession(scope, { ...source, version: 'revised' })).toBeNull();
  expect((await openSpeechSession(scope, { ...source, version: 'revised' })).completed).toEqual([]);
});

it('retains raw session on quota/unknown schema/owner-reset failures', async () => {
  const first = await openSpeechSession(scope, source);
  const before = await readWorkspace(scope);
  const put = IDBObjectStore.prototype.put;
  const failure = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function(this: IDBObjectStore, value, key) {
    if (this.name === 'lesson-resumes') throw new DOMException('quota', 'QuotaExceededError');
    return key === undefined ? put.call(this, value) : put.call(this, value, key);
  });
  await expect(completeSpeechSessionItem(scope, source, first.id, 'one', 'activity-one', details)).rejects.toThrow();
  failure.mockRestore(); expect(await readWorkspace(scope)).toEqual(before);
  await expect(openSpeechSession({ ...scope, resetEpoch: 1 }, source)).rejects.toThrow();
  const cache = { expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: 0, entryKey: 'workspace-sync:v1' };
  await writeLessonResume({ ...cache, value: { version: 99, raw: 'keep' } });
  await expect(openSpeechSession(scope, source)).rejects.toThrow();
  expect((await readLessonResume(cache))?.value).toEqual({ version: 99, raw: 'keep' });
  await transitionOwnerCheckpoint(scope.ownerGeneration, 'account:other', 0,
    createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-10-20T00:00:00Z', 'switch'), INITIAL_LEARNING_STATE);
  await expect(openSpeechSession(scope, source)).rejects.toThrow();
});

it('resumes guest self-review as local practice with no fabricated server receipt', async () => {
  await transitionOwnerCheckpoint(scope.ownerGeneration, 'anonymous:speech', 0,
    createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-10-20T00:00:00Z', 'guest'), INITIAL_LEARNING_STATE);
  const guest = (await readActiveOwnerLearningScope())!;
  const first = await openSpeechSession(guest, source);
  await completeSpeechSessionItem(guest, source, first.id, 'one', 'activity-one', details);
  await resetSyncDatabaseForTests();
  expect(await openSpeechSession(guest, source)).toMatchObject({ id: first.id, completed: ['one'], index: 1, pending: false });
  expect((await readLocalActivityHistory(guest)).every(event => event.authority === 'local-practice'
    && event.receiptRef === null && !event.masteryEligible)).toBe(true);
});
