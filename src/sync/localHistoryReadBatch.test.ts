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
  }
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
