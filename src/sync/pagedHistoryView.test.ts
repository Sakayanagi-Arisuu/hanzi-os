import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createActivityHistoryEvent } from '../learning/activityHistory';
import { projectLessonHistory, type LessonHistoryEventV1 } from '../learning/lessonHistory';
import { canonicalPagedHistoryView, updatePagedHistoryView } from './pagedHistoryView';
import { closeHistoryViewDatabaseForTests, HISTORY_VIEW_DATABASE, historyViewRecords, readHistoryViewPage, type HistoryView } from './historyViewStore';
import { readOrInitializeOwnerGeneration, readActiveOwnerLearningScope, writeOwnerCheckpoint, resetSyncDatabaseForTests,
  captureOwnerRecoverySnapshot, type ActiveOwnerLearningScope } from './indexedDb';
import { createInitialSyncDocument } from './document';
import { INITIAL_LEARNING_STATE } from '../store/LearningStore';

let scope: ActiveOwnerLearningScope;
async function clear() {
  await closeHistoryViewDatabaseForTests(); await resetSyncDatabaseForTests();
  for (const name of [HISTORY_VIEW_DATABASE, 'hanzi-os-sync-v1']) await new Promise<void>((resolve, reject) => {
    const r = indexedDB.deleteDatabase(name); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error);
  });
}
beforeEach(async () => {
  await clear(); vi.stubGlobal('window', new EventTarget());
  const { ownerGeneration } = await readOrInitializeOwnerGeneration('anonymous:paged-view');
  await writeOwnerCheckpoint(ownerGeneration.ownerKey, 0, createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-10-28T00:00:00Z', 'paged-view'), INITIAL_LEARNING_STATE, ownerGeneration);
  scope = (await readActiveOwnerLearningScope())!;
});
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); await clear(); });
const event = (id: string, occurredAt: string | null = null) => createActivityHistoryEvent({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: 0,
  operationId: id, module: 'profile', category: 'visit', sourceId: `source:${id}`, itemId: id, contentVersion: 'fixture', activityVersion: 'fixture', occurredAt, sourceRecordRef: id });
const canonical = (input: readonly LessonHistoryEventV1[]) => projectLessonHistory({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: 0 }, input);
async function all(view: HistoryView) {
  const result = []; let page = await readHistoryViewPage(view, { module: 'all', skill: 'all' });
  for (;;) { result.push(...page.events); if (!page.hasNext) break; page = await readHistoryViewPage(view, { module: 'all', skill: 'all', cursor: page.last }); }
  return result;
}

it('stores canonical history in bounded blocks and reads the exact order without changing source stores', async () => {
  const input = canonical(Array.from({ length: 513 }, (_, i) => event(`item-${i}`, i % 3 ? '2026-10-28T00:00:00Z' : null)));
  const before = structuredClone(input), source = await captureOwnerRecoverySnapshot(scope), adds = vi.spyOn(IDBObjectStore.prototype, 'add');
  const view = await canonicalPagedHistoryView(scope, input);
  expect(adds.mock.calls.filter(([value]) => value && typeof value === 'object' && 'eventId' in value)).toHaveLength(0);
  expect(await all(view)).toEqual(input);
  const ordered = []; for await (const batch of historyViewRecords(view, 'order')) { expect(batch.length).toBeLessThanOrEqual(128); ordered.push(...batch.map(row => row.event)); }
  expect(ordered).toEqual(input); expect(input).toEqual(before);
  expect((await captureOwnerRecoverySnapshot(scope)).stores).toEqual(source.stores);
});

it('overlays repeated remote pages exactly and rebases stable collation ties after timestamps change', async () => {
  const a = event('é', '2026-10-20T00:00:00Z'), b = event('e\u0301', '2026-10-21T00:00:00Z'), c = event('e\u0341', '2026-10-21T00:00:00Z');
  let expected: LessonHistoryEventV1[] = [], view: HistoryView | null = null;
  const rounds = [[a, b], [{ ...a, occurredAt: b.occurredAt }, c], [{ ...b, occurredAt: '2026-10-19T00:00:00Z' }], [b],
    Array.from({ length: 140 }, (_, i) => event(`new-${i}`)), Array.from({ length: 50 }, (_, i) => event(`new-${i}`))];
  for (const received of rounds) {
    expected = canonical([...expected, ...received]);
    view = await updatePagedHistoryView(scope, view, [received]);
    expect(await all(view)).toEqual(expected);
  }
});

it('omits the unused local order index while preserving every displayed event', async () => {
  const input = canonical(Array.from({ length: 257 }, (_, i) => event(`local-${i}`))), view = await canonicalPagedHistoryView(scope, input, undefined, false);
  expect(await all(view)).toEqual(input);
  await expect(historyViewRecords(view, 'order').next()).rejects.toThrow('unavailable');
  await expect(updatePagedHistoryView(scope, view, [[event('new')]])).rejects.toThrow('rebuilding');
});

it('keeps the previous view and original journals after a failure in the second block index', async () => {
  const previous = await canonicalPagedHistoryView(scope, canonical([event('old')])), before = await captureOwnerRecoverySnapshot(scope);
  const original = IDBObjectStore.prototype.add;
  const fail = vi.spyOn(IDBObjectStore.prototype, 'add').mockImplementation(function (this: IDBObjectStore, value, key?) {
    if (this.transaction.db.name === HISTORY_VIEW_DATABASE && this.name === 'pages' && value.lane === 'id') throw new DOMException('Fixture quota', 'QuotaExceededError');
    return key === undefined ? original.call(this, value) : original.call(this, value, key);
  });
  await expect(canonicalPagedHistoryView(scope, canonical(Array.from({ length: 200 }, (_, i) => event(`next-${i}`))))).rejects.toThrow('Fixture quota');
  fail.mockRestore(); expect(await all(previous)).toEqual(canonical([event('old')]));
  expect((await captureOwnerRecoverySnapshot(scope)).stores).toEqual(before.stores);
});

it('matches the canonical reducer through deterministic randomized insertions, duplicates and time changes', async () => {
  let seed = 7391, previous: HistoryView | null = null, expected: LessonHistoryEventV1[] = [];
  const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
  const ids = ['é', 'e\u0301', 'e\u0341', ...Array.from({ length: 100 }, (_, i) => `random-${i}`)];
  for (let round = 0; round < 15; round++) {
    const input = Array.from({ length: 25 }, () => event(ids[next() % ids.length], `2026-10-${20 + next() % 5}T00:00:00Z`));
    expected = canonical([...expected, ...input]);
    previous = await updatePagedHistoryView(scope, previous, [input.slice(0, 13), input.slice(13)]);
    for await (const batch of historyViewRecords(previous, 'id')) for (const row of batch) expect(row.event).toEqual(expected[row.ordinal]);
    const ordered = []; for await (const batch of historyViewRecords(previous, 'order')) ordered.push(...batch.map(row => row.event));
    expect(ordered).toEqual(expected);
  }
});

it('rejects oversized server pages, conflicting receipts and a cancelled build without replacing a valid view', async () => {
  const previous = await updatePagedHistoryView(scope, null, [[event('old')]]), before = await captureOwnerRecoverySnapshot(scope);
  await expect(updatePagedHistoryView(scope, previous, [Array.from({ length: 151 }, (_, i) => event(`many-${i}`))])).rejects.toThrow('limit');
  await expect(updatePagedHistoryView(scope, previous, [[{ ...event('old'), itemId: 'conflict' }]])).rejects.toThrow('Conflicting');
  const controller = new AbortController(); vi.stubGlobal('scheduler', { yield: async () => controller.abort() });
  await expect(canonicalPagedHistoryView(scope, canonical(Array.from({ length: 200 }, (_, i) => event(`cancel-${i}`))), controller.signal)).rejects.toThrow('cancelled');
  expect(await all(previous)).toEqual(canonical([event('old')])); expect((await captureOwnerRecoverySnapshot(scope)).stores).toEqual(before.stores);
});
