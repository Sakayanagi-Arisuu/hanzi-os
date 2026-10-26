import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { workspaceEntriesWithHistory, workspaceEntriesWithHistoryCooperatively, workspaceHistoryEntry,
  workspaceHistoryEvents, workspaceHistoryEventsCooperatively } from './workspaceHistory';
import { readWorkspace, readWorkspaceCooperatively } from './workspaceSync';
import { readLocalLearningHistory } from './reviewHistory';
import { readActiveOwnerLearningScope, readOrInitializeOwnerGeneration, resetSyncDatabaseForTests, writeLessonResume,
  readLessonResume, transitionOwnerCheckpoint, writeOwnerCheckpoint, StaleOwnerGenerationError, type ActiveOwnerLearningScope } from './indexedDb';
import { createInitialSyncDocument } from './document';
import { INITIAL_LEARNING_STATE } from '../store/LearningStore';
import type { WorkspaceEntry } from './workspaceProtocol';
import * as activityHistory from './activityHistory';
import { createActivityHistoryEvent } from '../learning/activityHistory';

const sources = () => Array.from({ length: 2_200 }, (_, index): WorkspaceEntry => ({ key: `reader.saved:cooperative-${index}`,
  value: { word: '书', savedAt: index, contentVersion: 'fixture-v1' }, changedAt: index, changeId: `change-${index}` }));
let scope: ActiveOwnerLearningScope;
const clear = async () => {
  await resetSyncDatabaseForTests();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('hanzi-os-sync-v1'); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
  });
};
beforeEach(async () => {
  await clear(); vi.stubGlobal('window', new EventTarget());
  const { ownerGeneration } = await readOrInitializeOwnerGeneration('anonymous:cooperative-history');
  await writeOwnerCheckpoint(ownerGeneration.ownerKey, 0, createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-10-24T00:00:00Z', 'cooperative'), INITIAL_LEARNING_STATE, ownerGeneration);
  scope = (await readActiveOwnerLearningScope())!;
});
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); await clear(); });
const write = (value: unknown) => writeLessonResume({ expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: scope.resetEpoch, entryKey: 'workspace-sync:v1', value });

it('retains every original source and descriptor, including descriptors beyond the first batch', async () => {
  const original = sources(), input = [...original, ...original.filter((_, index) => index % 2 === 0).map(entry => workspaceHistoryEntry(entry)!)];
  const before = structuredClone(input);
  expect(await workspaceEntriesWithHistoryCooperatively(input)).toEqual(workspaceEntriesWithHistory(input));
  expect(input).toEqual(before);
});

it('preserves guest/account/server confirmation and pending identity across batch boundaries', async () => {
  const original = sources(), entries = workspaceEntriesWithHistory(original), pending = original.filter((_, index) => index % 2 === 0);
  for (const ownerKey of ['anonymous:cooperative-history', 'account:cooperative-history']) for (const server of [false, true]) {
    const current = { ownerKey, resetEpoch: 0 };
    expect(await workspaceHistoryEventsCooperatively(current, entries, pending, server)).toEqual(workspaceHistoryEvents(current, entries, pending, server));
  }
});

it('uses the same complete parser and retains unreadable pending or unknown source values', async () => {
  const entries = sources(), journal = { version: 1, entries, pending: entries };
  await write(journal);
  expect(await readWorkspaceCooperatively(scope)).toEqual(await readWorkspace(scope));
  for (const invalid of [{ ...journal, version: 99 }, { ...journal, pending: [...entries, { ...entries[0], changedAt: -1 }] }]) {
    await write(invalid);
    await expect(readWorkspace(scope)).rejects.toThrow();
    await expect(readWorkspaceCooperatively(scope)).rejects.toThrow();
    expect((await readLessonResume({ expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: 0, entryKey: 'workspace-sync:v1' }))?.value).toEqual(invalid);
  }
});

it('fences the combined history when another task changes the actual owner during a yield', async () => {
  const entries = sources(); await write({ version: 1, entries, pending: entries });
  let changed = false;
  vi.stubGlobal('scheduler', { yield: async () => {
    if (!changed) {
      changed = true;
      await transitionOwnerCheckpoint(scope.ownerGeneration, 'anonymous:cooperative-other', 0,
        createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-10-24T01:00:00Z', 'changed-owner'), INITIAL_LEARNING_STATE);
    }
  } });
  await expect(readLocalLearningHistory(scope)).rejects.toBeInstanceOf(StaleOwnerGenerationError);
  expect(changed).toBe(true);
});

it('checks the actual owner again after the final combined projection yields', async () => {
  const events = Array.from({ length: 2_200 }, (_, index) => createActivityHistoryEvent({
    ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: 0, operationId: `late-final-${index}`, module: 'profile',
    category: 'preference', sourceId: `late-${index}`, itemId: `late-${index}`, contentVersion: 'fixture-v1',
    activityVersion: 'fixture-v1', occurredAt: '2026-10-24T00:00:00Z', sourceRecordRef: `late-${index}`,
  }));
  vi.spyOn(activityHistory, 'readLocalActivityHistory').mockResolvedValue(events);
  let changed = false;
  vi.stubGlobal('scheduler', { yield: async () => {
    if (!changed) {
      changed = true;
      await transitionOwnerCheckpoint(scope.ownerGeneration, 'anonymous:final-projection-other', 0,
        createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-10-24T01:00:00Z', 'final-changed-owner'), INITIAL_LEARNING_STATE);
    }
  } });
  await expect(readLocalLearningHistory(scope)).rejects.toBeInstanceOf(StaleOwnerGenerationError);
  expect(changed).toBe(true);
});
