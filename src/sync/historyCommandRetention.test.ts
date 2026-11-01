import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { listLearningCommandRecords } from './learningCommandOutbox';
import { LocalHistoryReadBatch } from './localHistoryReadBatch';
import { readLocalLearningHistory } from './reviewHistory';
import { saveDescriptiveActivity } from './activityObservations';
import { createInitialSyncDocument } from './document';
import { INITIAL_LEARNING_STATE } from '../store/LearningStore';
import { LEARNING_COMMAND_OUTBOX_STORE, openSyncDatabase, readOrInitializeOwnerGeneration, readActiveOwnerLearningScope,
  writeOwnerCheckpoint, resetSyncDatabaseForTests, StaleOwnerGenerationError, type ActiveOwnerLearningScope } from './indexedDb';

let scope: ActiveOwnerLearningScope;
async function clear() {
  await resetSyncDatabaseForTests();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('hanzi-os-sync-v1'); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
  });
}
beforeEach(async () => {
  await clear(); vi.stubGlobal('window', new EventTarget());
  const { ownerGeneration } = await readOrInitializeOwnerGeneration('anonymous:history-command-retention');
  await writeOwnerCheckpoint(ownerGeneration.ownerKey, 0, createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-11-01T00:00:00Z', 'command-retention'), INITIAL_LEARNING_STATE, ownerGeneration);
  scope = (await readActiveOwnerLearningScope())!;
});
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); await clear(); });

async function seed(sequences: unknown[], epochs: number[] = sequences.map((_, i) => i % 2)) {
  const db = await openSyncDatabase(), tx = db.transaction(LEARNING_COMMAND_OUTBOX_STORE, 'readwrite');
  for (const [i, deviceSequence] of sequences.entries()) tx.objectStore(LEARNING_COMMAND_OUTBOX_STORE).put({
    recordKey: `raw:${String(i).padStart(3, '0')}`, ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: epochs[i],
    deviceSequence, kind: 'legacy-unknown', payload: '原'.repeat(8000), status: 'pending',
  });
  await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
}
async function raw() {
  const db = await openSyncDatabase(), tx = db.transaction(LEARNING_COMMAND_OUTBOX_STORE, 'readonly');
  return new Promise<unknown[]>((resolve, reject) => {
    const request = tx.objectStore(LEARNING_COMMAND_OUTBOX_STORE).getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
}

it.each([
  [9, 1, 4, 1, 0, 8, 2],
  [4, undefined, 1, NaN, 1, 3, -1],
  [new Date('2026-11-01'), null, '3', {}, [], Infinity, -Infinity],
].map(sequences => ({ sequences })))('matches global-sort-then-filter exactly, including malformed legacy comparison inputs: %j', async ({ sequences }) => {
  await seed(sequences);
  const before = await raw(), canonical = await listLearningCommandRecords(scope.ownerGeneration);
  const expected = canonical.filter(record => record.resetEpoch === scope.resetEpoch);
  const getAll = vi.spyOn(IDBIndex.prototype, 'getAll'), cursor = vi.spyOn(IDBIndex.prototype, 'openCursor');
  expect(await new LocalHistoryReadBatch(scope, true).commands(scope)).toEqual(expected);
  expect(getAll).not.toHaveBeenCalled(); expect(cursor).toHaveBeenCalledTimes(1);
  expect(await new LocalHistoryReadBatch(scope).commands(scope)).toEqual(canonical);
  expect(await raw()).toEqual(before);
});

it('does not hide the original BigInt sort error by discarding another epoch first', async () => {
  await seed([1n, 2], [1, 0]); const before = await raw();
  await expect(listLearningCommandRecords(scope.ownerGeneration)).rejects.toBeInstanceOf(TypeError);
  await expect(new LocalHistoryReadBatch(scope, true).commands(scope)).rejects.toBeInstanceOf(TypeError);
  expect(await raw()).toEqual(before);
});

it('keeps a single excluded BigInt row compatible when the original sort needs no comparison', async () => {
  await seed([1n], [1]);
  expect(await new LocalHistoryReadBatch(scope, true).commands(scope)).toEqual([]);
  expect(await listLearningCommandRecords(scope.ownerGeneration)).toHaveLength(1);
});

it('keeps history output and every old-epoch source row while excluding payloads from the shared batch', async () => {
  await saveDescriptiveActivity(scope, { operationId: 'current-activity', module: 'profile', category: 'visit',
    sourceId: 'profile', itemId: 'profile', contentVersion: 'fixture', activityVersion: 'fixture' });
  const canonical = await readLocalLearningHistory(scope);
  await seed(Array.from({ length: 80 }, (_, i) => 80 - i), Array(80).fill(1));
  const before = await raw();
  expect(await new LocalHistoryReadBatch(scope, true).commands(scope)).toEqual([]);
  expect(await new LocalHistoryReadBatch(scope).commands(scope)).toHaveLength(80);
  expect(canonical).toHaveLength(1); expect(await readLocalLearningHistory(scope)).toEqual(canonical);
  expect(await raw()).toEqual(before);
});

it('propagates a cursor failure, retries fresh, and fences stale owner generations', async () => {
  await seed([2, 1]); const before = await raw();
  vi.spyOn(IDBIndex.prototype, 'openCursor').mockImplementationOnce(() => { throw Error('command cursor unavailable'); });
  await expect(new LocalHistoryReadBatch(scope, true).commands(scope)).rejects.toThrow('command cursor unavailable');
  expect(await new LocalHistoryReadBatch(scope, true).commands(scope)).toHaveLength(1);
  await expect(listLearningCommandRecords({ ...scope.ownerGeneration, generation: scope.ownerGeneration.generation + 1 }, 0)).rejects.toBeInstanceOf(StaleOwnerGenerationError);
  expect(await raw()).toEqual(before);
});

it.each([-1, NaN, Infinity, 2147483648])('rejects an invalid retention epoch without modifying the journal: %s', async epoch => {
  await seed([1]); const before = await raw();
  await expect(listLearningCommandRecords(scope.ownerGeneration, epoch)).rejects.toThrow('Invalid history epoch');
  expect(await raw()).toEqual(before);
});
