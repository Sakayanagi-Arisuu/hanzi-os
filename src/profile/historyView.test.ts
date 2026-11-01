import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createInitialSyncDocument } from '../sync/document';
import { INITIAL_LEARNING_STATE } from '../store/LearningStore';
import { readOrInitializeOwnerGeneration, readActiveOwnerLearningScope, writeOwnerCheckpoint, resetSyncDatabaseForTests,
  transitionOwnerCheckpoint, StaleOwnerGenerationError, captureOwnerRecoverySnapshot, type ActiveOwnerLearningScope } from '../sync/indexedDb';
import { saveWorkspaceChanges } from '../sync/workspaceSync';
import { readLocalLearningHistory } from '../sync/reviewHistory';
import { HISTORY_VIEW_DATABASE, closeHistoryViewDatabaseForTests, dropHistoryView, historyViewBatches } from '../sync/historyViewStore';
import { buildHistoryView, historyViewGroups, localHistoryView, queryHistoryView } from './historyView';
import { createActivityHistoryEvent } from '../learning/activityHistory';

let scope: ActiveOwnerLearningScope;
async function clear() {
  await closeHistoryViewDatabaseForTests(); await resetSyncDatabaseForTests();
  for (const name of [HISTORY_VIEW_DATABASE, 'hanzi-os-sync-v1']) await new Promise<void>((resolve, reject) => {
    const r = indexedDB.deleteDatabase(name); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error);
  });
}
beforeEach(async () => {
  await clear(); vi.stubGlobal('window', new EventTarget());
  const { ownerGeneration } = await readOrInitializeOwnerGeneration('anonymous:scoped-history-view');
  await writeOwnerCheckpoint(ownerGeneration.ownerKey, 0, createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-10-28T00:00:00Z', 'view'), INITIAL_LEARNING_STATE, ownerGeneration);
  scope = (await readActiveOwnerLearningScope())!;
});
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); await clear(); });
const event = (id: string) => createActivityHistoryEvent({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: 0,
  operationId: id, module: 'profile', category: 'visit', sourceId: id, itemId: id, contentVersion: 'fixture', activityVersion: 'fixture', occurredAt: null, sourceRecordRef: id });

it('provides every canonical local event through bounded pages, leaving all seven source stores unchanged', async () => {
  await saveWorkspaceChanges(scope, Array.from({ length: 43 }, (_, i) => ({ key: `reader.saved:${i}`, value: { savedAt: i, word: '书' } })));
  const before = await captureOwnerRecoverySnapshot(scope), expected = await readLocalLearningHistory(scope);
  const view = await localHistoryView(scope), actual = [];
  let page = await queryHistoryView(view, { module: 'all', skill: 'all' });
  for (;;) { actual.push(...page.events); if (!page.hasNext) break; page = await queryHistoryView(view, { module: 'all', skill: 'all', cursor: page.last }); }
  expect(actual).toEqual(expected); expect((await captureOwnerRecoverySnapshot(scope)).stores).toEqual(before.stores);
  await dropHistoryView(view);
});

it.each(['owner', 'generation', 'reset'] as const)('rejects a published view after the active %s changes', async kind => {
  const view = await buildHistoryView(scope, [[event('one')]]);
  if (kind === 'reset') {
    const doc = createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-10-28T01:00:00Z', 'reset'); doc.reset.epoch++;
    await writeOwnerCheckpoint(scope.ownerGeneration.ownerKey, 1, doc, INITIAL_LEARNING_STATE, scope.ownerGeneration);
  } else await transitionOwnerCheckpoint(scope.ownerGeneration, kind === 'owner' ? 'anonymous:new-view-owner' : scope.ownerGeneration.ownerKey,
    0, createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-10-28T01:00:00Z', 'next'), INITIAL_LEARNING_STATE);
  await expect(queryHistoryView(view, { module: 'all', skill: 'all' })).rejects.toBeInstanceOf(StaleOwnerGenerationError);
});

it('drops a candidate rather than publishing it when ownership changes during its cooperative checkpoint', async () => {
  let changed = false;
  vi.stubGlobal('scheduler', { yield: async () => {
    if (changed) return; changed = true;
    await transitionOwnerCheckpoint(scope.ownerGeneration, 'anonymous:changed-during-view', 0,
      createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-10-28T01:00:00Z', 'next'), INITIAL_LEARNING_STATE);
  } });
  await expect(buildHistoryView(scope, [[event('one')]])).rejects.toBeInstanceOf(StaleOwnerGenerationError);
  expect(changed).toBe(true);
});

it('reconciles old remote and new pages before combining with local, without a full array of old remote history', async () => {
  const first = event('one'), local = await buildHistoryView(scope, [[first]]);
  const remote = await buildHistoryView(scope, [[{ ...first, authority: 'server-recorded', confirmationState: 'confirmed', receiptRef: 'receipt' }]]);
  const nextRemote = await buildHistoryView(scope, historyViewGroups([remote], [[event('two')]]));
  const combined = await buildHistoryView(scope, historyViewGroups([local, nextRemote]));
  const page = await queryHistoryView(combined, { module: 'all', skill: 'all' });
  expect(page.count).toBe(2); expect(page.events.find(e => e.operationId === 'one')?.confirmationState).toBe('confirmed');
  let count = 0; for await (const batch of historyViewBatches(nextRemote)) count += batch.length;
  expect(count).toBe(2);
});

it('freezes the query handle before asynchronous cache work without mutating canonical data', async () => {
  const view = await buildHistoryView(scope, [[event('one')]]), original = IDBObjectStore.prototype.getAll;
  const read = vi.spyOn(IDBObjectStore.prototype, 'getAll').mockImplementation(function (this: IDBObjectStore, query?, count?) {
    if (this.transaction.db.name === HISTORY_VIEW_DATABASE) view.scope.ownerGeneration.ownerKey = 'anonymous:mutated-handle';
    return original.call(this, query, count);
  });
  expect((await queryHistoryView(view, { module: 'all', skill: 'all' })).events.map(e => e.ownerKey)).toEqual([scope.ownerGeneration.ownerKey]);
  read.mockRestore();
});
