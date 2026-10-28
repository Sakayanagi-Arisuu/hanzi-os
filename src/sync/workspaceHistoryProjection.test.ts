import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readOrInitializeOwnerGeneration, readActiveOwnerLearningScope, resetSyncDatabaseForTests, writeLessonResume,
  readLessonResume, captureOwnerRecoverySnapshot, writeOwnerCheckpoint, transitionOwnerCheckpoint, StaleOwnerGenerationError,
  type ActiveOwnerLearningScope } from './indexedDb';
import { readWorkspace, saveWorkspaceChanges } from './workspaceSync';
import { workspaceEntriesWithHistoryCooperatively, workspaceHistoryEventsCooperatively, workspaceHistoryEntry } from './workspaceHistory';
import { readWorkspaceHistoryProjection } from './workspaceHistoryProjection';
import { projectWorkspaceStorage } from './workspaceStorage';
import { readLocalLearningHistory } from './reviewHistory';
import type { WorkspaceEntry } from './workspaceProtocol';
import { INITIAL_LEARNING_STATE } from '../store/LearningStore';
import { createInitialSyncDocument } from './document';

let scope: ActiveOwnerLearningScope;
const cacheScope = () => ({ expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: scope.resetEpoch, entryKey: 'workspace-sync:v1' });
const clear = async () => { await resetSyncDatabaseForTests(); await new Promise<void>((resolve, reject) => {
  const r = indexedDB.deleteDatabase('hanzi-os-sync-v1'); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error);
}); };
beforeEach(async () => {
  await clear(); vi.stubGlobal('window', new EventTarget());
  await readOrInitializeOwnerGeneration('anonymous:history-projection'); scope = (await readActiveOwnerLearningScope())!;
  await writeOwnerCheckpoint(scope.ownerGeneration.ownerKey, 0,
    createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-10-28T00:00:00Z', 'projection'), INITIAL_LEARNING_STATE, scope.ownerGeneration);
});
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); await clear(); });
const source = (index: number): WorkspaceEntry => ({ key: `reader.saved:projection-${index}`, changedAt: index + 1, changeId: `change-${index}`,
  value: { word: '书', savedAt: index, contentVersion: 'projection-v1', raw: '保留'.repeat(18000) } });
async function fixture(paged: boolean) {
  const sources = Array.from({ length: 24 }, (_, index) => source(index));
  const descriptors = sources.filter((_, index) => index % 2 === 0).map(entry => workspaceHistoryEntry(entry)!);
  // The persisted descriptor must take precedence over a newer derivation.
  descriptors[0].value = { ...(descriptors[0].value as object), itemId: 'persisted-item', rawUnknown: '保留'.repeat(12000) };
  const entries = [...sources, ...descriptors];
  await writeLessonResume({ ...cacheScope(), value: { version: 1, entries,
    pending: [entries[1], descriptors[0], { ...entries[2], value: { distinctPending: true } }] } });
  if (paged) await saveWorkspaceChanges(scope, [{ key: sources[0].key, value: sources[0].value }]);
}
async function canonical() {
  const journal = await readWorkspace(scope);
  return workspaceHistoryEventsCooperatively({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: scope.resetEpoch },
    await workspaceEntriesWithHistoryCooperatively(journal.entries), journal.pending);
}

it.each([false, true])('matches every canonical event and stored-descriptor precedence without writing raw sources: paged=%s', async paged => {
  await fixture(paged);
  const before = await captureOwnerRecoverySnapshot(scope), expected = await canonical();
  const actual = await readWorkspaceHistoryProjection(scope);
  expect(actual).toEqual(expected); expect(actual).toHaveLength(24);
  expect(actual.find(event => event.operationId === 'workspace:change-0')?.itemId).toBe('persisted-item');
  expect(JSON.stringify(actual)).not.toContain('rawUnknown');
  expect(JSON.stringify(actual)).not.toContain('保留');
  expect((await captureOwnerRecoverySnapshot(scope)).stores).toEqual(before.stores);
  expect((await readLessonResume(cacheScope()))?.value).toMatchObject({ version: paged ? 2 : 1 });
});

it.each([false, true])('retains exact pending confirmation for account entries, including inline pending with a different payload: paged=%s', async paged => {
  await transitionOwnerCheckpoint(scope.ownerGeneration, 'account:history-projection', 0,
    createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-10-28T01:00:00Z', 'account-projection'), INITIAL_LEARNING_STATE);
  scope = (await readActiveOwnerLearningScope())!;
  await fixture(paged);
  const events = await readWorkspaceHistoryProjection(scope);
  expect(events).toEqual(await canonical());
  expect(events.find(event => event.operationId === 'workspace:change-0')).toMatchObject({ confirmationState: 'provisional', receiptRef: null });
  expect(events.find(event => event.operationId === 'workspace:change-1')).toMatchObject({ confirmationState: 'provisional', authority: 'unknown' });
  expect(events.find(event => event.operationId === 'workspace:change-2')).toMatchObject({ confirmationState: 'provisional', authority: 'unknown' });
  expect(events.find(event => event.operationId === 'workspace:change-3')).toMatchObject({ confirmationState: 'confirmed', authority: 'server-recorded' });
  expect(events.every(event => !event.masteryEligible)).toBe(true);
});

it('selects bounded page values while preserving pending reference identity and distinct inline payloads', async () => {
  await saveWorkspaceChanges(scope, Array.from({ length: 24 }, (_, index) => ({ key: source(index).key, value: source(index).value })));
  const selected = await projectWorkspaceStorage(scope, entry => ({ key: entry.key, changeId: entry.changeId }));
  expect(selected.entries).toHaveLength(48); expect(selected.pending).toHaveLength(48);
  for (const entry of selected.pending) expect(entry).toBe(selected.entries.find(row => row.key === entry.key));
  expect(JSON.stringify(selected)).not.toContain('保留');
  const before = await captureOwnerRecoverySnapshot(scope);
  let visited = 0;
  await expect(projectWorkspaceStorage(scope, () => { if (++visited === 12) throw Error('projection failed'); return null; })).rejects.toThrow('projection failed');
  expect((await captureOwnerRecoverySnapshot(scope)).stores).toEqual(before.stores);
  expect(await readWorkspaceHistoryProjection(scope)).toHaveLength(24);
});

it('checks the source even when a stored descriptor would suppress derivation', async () => {
  const entry: WorkspaceEntry = { key: 'activity.record:invalid-source', value: { version: 99 }, changeId: 'invalid-source', changedAt: 1 };
  const descriptor = workspaceHistoryEntry(source(0))!;
  await writeLessonResume({ ...cacheScope(), value: { version: 1, entries: [entry, descriptor], pending: [] } });
  const before = await captureOwnerRecoverySnapshot(scope);
  await expect(canonical()).rejects.toThrow('Unreadable practice source');
  await expect(readWorkspaceHistoryProjection(scope)).rejects.toThrow('Unreadable practice source');
  expect((await captureOwnerRecoverySnapshot(scope)).stores).toEqual(before.stores);
});

it('keeps sparse legacy entries fail-closed and never fills in their missing sources', async () => {
  const entries: WorkspaceEntry[] = new Array(2); entries[1] = source(1);
  await writeLessonResume({ ...cacheScope(), value: { version: 1, entries, pending: [] } });
  const before = await captureOwnerRecoverySnapshot(scope);
  await expect(canonical()).rejects.toThrow();
  await expect(readWorkspaceHistoryProjection(scope)).rejects.toThrow();
  expect((await captureOwnerRecoverySnapshot(scope)).stores).toEqual(before.stores);
});

it('fences the final owner/reset after legacy projection yields and keeps the original snapshot', async () => {
  const entries = Array.from({ length: 2200 }, (_, index) => ({ ...source(index), value: { savedAt: index } }));
  await writeLessonResume({ ...cacheScope(), value: { version: 1, entries, pending: entries } });
  let changed = false;
  vi.stubGlobal('scheduler', { yield: async () => {
    if (changed) return;
    changed = true;
    await transitionOwnerCheckpoint(scope.ownerGeneration, 'anonymous:projection-other', 0,
      createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-10-28T01:00:00Z', 'projection-other'), INITIAL_LEARNING_STATE);
  } });
  await expect(readLocalLearningHistory(scope)).rejects.toBeInstanceOf(StaleOwnerGenerationError);
  expect(changed).toBe(true);
});

it('also fences callers of the generic projection after a legacy yield', async () => {
  const entries = Array.from({ length: 2200 }, (_, index) => ({ ...source(index), value: { savedAt: index } }));
  await writeLessonResume({ ...cacheScope(), value: { version: 1, entries, pending: [] } });
  let changed = false;
  vi.stubGlobal('scheduler', { yield: async () => {
    if (changed) return;
    changed = true;
    await transitionOwnerCheckpoint(scope.ownerGeneration, 'anonymous:generic-projection-other', 0,
      createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-10-28T01:00:00Z', 'generic-other'), INITIAL_LEARNING_STATE);
  } });
  await expect(projectWorkspaceStorage(scope, entry => entry.key)).rejects.toBeInstanceOf(StaleOwnerGenerationError);
  expect(changed).toBe(true);
});
