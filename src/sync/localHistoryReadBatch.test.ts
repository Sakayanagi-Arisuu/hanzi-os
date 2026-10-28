import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as database from './indexedDb';
import * as commandOutbox from './learningCommandOutbox';
import { LocalHistoryReadBatch } from './localHistoryReadBatch';
import { readLocalLearningHistory, readLocalReviewHistory } from './reviewHistory';
import { readLocalLessonHistory } from './lessonHistory';
import { readLocalActivityHistory } from './activityHistory';
import { saveDescriptiveActivity } from './activityObservations';
import { INITIAL_LEARNING_STATE } from '../store/LearningStore';
import { createInitialSyncDocument } from './document';
import { LESSON_HISTORY_ENTRY_PREFIX, projectLessonHistory } from '../learning/lessonHistory';
import * as workspace from './workspaceSync';
import * as workspaceProjection from './workspaceHistoryProjection';

let scope: database.ActiveOwnerLearningScope;
async function clear() {
  await database.resetSyncDatabaseForTests();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('hanzi-os-sync-v1');
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
  });
}
beforeEach(async () => {
  await clear(); vi.stubGlobal('window', new EventTarget());
  const { ownerGeneration } = await database.readOrInitializeOwnerGeneration('anonymous:history-read-batch');
  await database.writeOwnerCheckpoint(ownerGeneration.ownerKey, 0,
    createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-10-24T00:00:00Z', 'history-batch'), INITIAL_LEARNING_STATE, ownerGeneration);
  scope = (await database.readActiveOwnerLearningScope())!;
});
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); await clear(); });
const save = (operationId: string) => saveDescriptiveActivity(scope, { operationId, module: 'speech', category: 'self-review',
  sourceId: 'phrase', itemId: 'phrase', contentVersion: 'old-content', activityVersion: 'old-version', modality: 'speech', details: { manual: true } });

it('matches independent source projections while loading each shared store once per combined history read', async () => {
  await save('first'); await save('second');
  const snapshots = vi.spyOn(database, 'listLessonResumes');
  const commands = vi.spyOn(commandOutbox, 'listLearningCommandRecords');
  const state = vi.spyOn(database, 'readOwnerLocalState');
  const canonical = vi.spyOn(workspace, 'readWorkspaceCooperatively');
  const projection = vi.spyOn(workspaceProjection, 'readWorkspaceHistoryProjection');
  const independent = projectLessonHistory({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: scope.resetEpoch }, [
    ...await readLocalLessonHistory(scope), ...await readLocalReviewHistory(scope), ...await readLocalActivityHistory(scope),
  ]);
  expect(snapshots).toHaveBeenCalledTimes(3); expect(commands).toHaveBeenCalledTimes(3); expect(state).toHaveBeenCalledTimes(2);
  vi.clearAllMocks();
  const combined = await readLocalLearningHistory(scope);
  expect(combined).toEqual(independent);
  expect(combined).toHaveLength(2);
  expect(combined.every(event => !event.masteryEligible && event.score === null)).toBe(true);
  expect(snapshots).toHaveBeenCalledTimes(1); expect(commands).toHaveBeenCalledTimes(1); expect(state).toHaveBeenCalledTimes(1);
  expect(canonical).not.toHaveBeenCalled();
  expect(projection).toHaveBeenCalledTimes(1);
  expect(snapshots).toHaveBeenCalledWith(scope, 'workspace-sync:v1');
});

it('creates fresh reads on refresh so a later durable activity is visible', async () => {
  await save('first');
  const first = await readLocalLearningHistory(scope);
  expect(first).toHaveLength(1);
  await save('second');
  const refreshed = await readLocalLearningHistory(scope);
  expect(refreshed).toHaveLength(2);
  expect(refreshed.map(event => event.eventId)).toContain(first[0].eventId);
  expect(new Set(refreshed.map(event => event.eventId)).size).toBe(2);
});

it('never reuses a batch across owner, generation, reset or mutation of the original scope object', () => {
  const input = structuredClone(scope), batch = new LocalHistoryReadBatch(input);
  const changed = [
    { ...scope, resetEpoch: 1 },
    { ...scope, ownerGeneration: { ...scope.ownerGeneration, generation: scope.ownerGeneration.generation + 1 } },
    { ...scope, ownerGeneration: { ...scope.ownerGeneration, ownerKey: 'anonymous:another' } },
  ];
  input.ownerGeneration.ownerKey = 'anonymous:mutated';
  for (const current of [...changed, input]) {
    expect(() => batch.resumes(current)).toThrow(database.StaleOwnerGenerationError);
    expect(() => batch.commands(current)).toThrow(database.StaleOwnerGenerationError);
    expect(() => batch.state(current)).toThrow(database.StaleOwnerGenerationError);
    expect(() => batch.workspace(current)).toThrow(database.StaleOwnerGenerationError);
    expect(() => batch.workspaceHistory(current)).toThrow(database.StaleOwnerGenerationError);
  }
});

it('excludes only the canonical primary key without cloning its value a second time', async () => {
  await save('first');
  const storedScope = { expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: scope.resetEpoch };
  await database.writeLessonResume({ ...storedScope, entryKey: 'another-row', value: { retained: true } });
  const db = await database.openSyncDatabase();
  const get = vi.spyOn(IDBObjectStore.prototype, 'get');
  const all = vi.spyOn(IDBIndex.prototype, 'getAll');
  const keys = vi.spyOn(IDBIndex.prototype, 'openKeyCursor');
  const records = await database.listLessonResumes(scope, 'workspace-sync:v1');
  expect(records.map(record => record.entryKey)).toEqual(['another-row']);
  expect(keys).toHaveBeenCalledTimes(1);
  expect(all).not.toHaveBeenCalled();
  expect(get.mock.calls.some(([key]) => key === JSON.stringify([scope.ownerGeneration.ownerKey, 0, 'workspace-sync:v1']))).toBe(false);
  expect((await database.listLessonResumes(scope)).map(record => record.entryKey)).toContain('workspace-sync:v1');
  // A forged wrapper on another primary key must not be skipped by its label.
  const tx = db.transaction(database.LESSON_RESUME_STORE, 'readwrite');
  tx.objectStore(database.LESSON_RESUME_STORE).put({ ...records[0], entryKey: 'workspace-sync:v1' });
  await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  expect(await database.listLessonResumes(scope, 'workspace-sync:v1')).toHaveLength(1);
});

it.each([
  { version: 99, entries: [], pending: [] },
  { version: 1, entries: [], pending: [{ malformed: true }] },
])('does not hide an unreadable canonical journal in the aggregate path: %j', async value => {
  const storedScope = { expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: scope.resetEpoch, entryKey: 'workspace-sync:v1' };
  await database.writeLessonResume({ ...storedScope, value });
  await expect(readLocalLearningHistory(scope)).rejects.toThrow('giữ dữ liệu');
  expect((await database.readLessonResume(storedScope))?.value).toEqual(value);
});

it.each([{ schemaVersion: 2 }, { ownerKey: 'anonymous:forged' }, { resetEpoch: 1 }, { entryKey: 'forged' }])(
  'rejects a malformed canonical wrapper and retains its bytes: %j', async patch => {
    await save('first');
    const storedScope = { expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: scope.resetEpoch, entryKey: 'workspace-sync:v1' };
    const original = (await database.readLessonResume(storedScope))!;
    const db = await database.openSyncDatabase();
    const tx = db.transaction(database.LESSON_RESUME_STORE, 'readwrite');
    tx.objectStore(database.LESSON_RESUME_STORE).put({ ...original, ...patch });
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
    await expect(readLocalLearningHistory(scope)).rejects.toThrow('giữ dữ liệu');
    expect(await database.readLessonResume(storedScope)).toEqual({ ...original, ...patch });
  });

it('propagates canonical read failure, retries fresh, and leaves workspace pending and recovery data unchanged', async () => {
  await save('first');
  const before = await database.captureOwnerRecoverySnapshot(scope);
  vi.spyOn(workspaceProjection, 'readWorkspaceHistoryProjection').mockRejectedValueOnce(Error('canonical unavailable'));
  await expect(readLocalLearningHistory(scope)).rejects.toThrow('canonical unavailable');
  expect(await readLocalLearningHistory(scope)).toHaveLength(1);
  expect((await database.captureOwnerRecoverySnapshot(scope)).stores).toEqual(before.stores);
});

it('keeps the default batch compatible and does not admit another owner or reset through the key cursor', async () => {
  await save('first');
  const original = (await database.listLessonResumes(scope))[0];
  const db = await database.openSyncDatabase();
  const tx = db.transaction(database.LESSON_RESUME_STORE, 'readwrite');
  for (const [ownerKey, resetEpoch] of [[scope.ownerGeneration.ownerKey, 1], ['anonymous:other', 0]] as const) {
    tx.objectStore(database.LESSON_RESUME_STORE).put({ ...original, ownerKey, resetEpoch, entryKey: 'foreign',
      recordKey: JSON.stringify([ownerKey, resetEpoch, 'foreign']) });
  }
  await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  expect(await new LocalHistoryReadBatch(scope).resumes(scope)).toEqual([original]);
  expect(await new LocalHistoryReadBatch(scope, true).resumes(scope)).toEqual([]);
  expect(await database.listLessonResumes(scope, 'workspace-sync:v1')).toEqual([]);
});

it('rejects cursor failures without writing or hiding the error, and a new load retries', async () => {
  await save('first');
  const before = await database.captureOwnerRecoverySnapshot(scope);
  vi.spyOn(IDBIndex.prototype, 'openKeyCursor').mockImplementationOnce(() => { throw Error('cursor unavailable'); });
  await expect(readLocalLearningHistory(scope)).rejects.toThrow('cursor unavailable');
  expect(await readLocalLearningHistory(scope)).toHaveLength(1);
  expect((await database.captureOwnerRecoverySnapshot(scope)).stores).toEqual(before.stores);
});

it('preserves unreadable source records and rejects the complete read instead of hiding an unknown schema', async () => {
  const entryKey = LESSON_HISTORY_ENTRY_PREFIX + 'unknown';
  await database.writeLessonResume({ expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: scope.resetEpoch,
    entryKey, value: { version: 99, raw: 'retain' } });
  await expect(readLocalLearningHistory(scope)).rejects.toThrow('unreadable');
  expect((await database.readLessonResume({ expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: scope.resetEpoch, entryKey }))?.value)
    .toEqual({ version: 99, raw: 'retain' });
});

it('does not retain a failed read across retries or write history, progress or rewards while loading', async () => {
  await save('first');
  const before = await database.captureOwnerRecoverySnapshot(scope);
  vi.spyOn(database, 'listLessonResumes').mockRejectedValueOnce(Error('storage unavailable'));
  await expect(readLocalLearningHistory(scope)).rejects.toThrow('storage unavailable');
  expect(await readLocalLearningHistory(scope)).toHaveLength(1);
  const after = await database.captureOwnerRecoverySnapshot(scope);
  expect(after.stores).toEqual(before.stores); expect(after.avatar).toEqual(before.avatar);
});

it('continues to fence a prior batch when the actual active owner changes', async () => {
  const batch = new LocalHistoryReadBatch(scope);
  await batch.resumes(scope);
  await database.transitionOwnerCheckpoint(scope.ownerGeneration, 'anonymous:other', 0,
    createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-10-24T01:00:00Z', 'owner-change'), INITIAL_LEARNING_STATE);
  await expect(readLocalLessonHistory(scope, batch)).rejects.toBeInstanceOf(database.StaleOwnerGenerationError);
});
