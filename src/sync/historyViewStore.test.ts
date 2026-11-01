import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createActivityHistoryEvent } from '../learning/activityHistory';
import { projectLessonHistory, type LessonHistoryEventV1 } from '../learning/lessonHistory';
import { createInitialSyncDocument } from './document';
import { INITIAL_LEARNING_STATE } from '../store/LearningStore';
import { readOrInitializeOwnerGeneration, readActiveOwnerLearningScope, writeOwnerCheckpoint, captureOwnerRecoverySnapshot,
  resetSyncDatabaseForTests, deleteOwnerData, type ActiveOwnerLearningScope } from './indexedDb';
import { appendHistoryView, clearOwnerHistoryViews, closeHistoryViewDatabaseForTests, createHistoryView, dropHistoryView,
  HISTORY_VIEW_DATABASE, historyViewBatches, readHistoryViewPage, readHistoryViewsPage, sealHistoryView, type HistoryView, type HistoryViewPage } from './historyViewStore';

let scope: ActiveOwnerLearningScope;
async function clear() {
  await closeHistoryViewDatabaseForTests(); await resetSyncDatabaseForTests();
  for (const name of [HISTORY_VIEW_DATABASE, 'hanzi-os-sync-v1']) await new Promise<void>((resolve, reject) => {
    const r = indexedDB.deleteDatabase(name); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); r.onblocked = () => reject(Error('Test database still open'));
  });
}
beforeEach(async () => {
  await clear(); vi.stubGlobal('window', new EventTarget());
  const { ownerGeneration } = await readOrInitializeOwnerGeneration('anonymous:disk-history');
  await writeOwnerCheckpoint(ownerGeneration.ownerKey, 0, createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-10-28T00:00:00Z', 'disk-history'), INITIAL_LEARNING_STATE, ownerGeneration);
  scope = (await readActiveOwnerLearningScope())!;
});
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); await clear(); });

const events = (count = 257, ownerKey = scope.ownerGeneration.ownerKey) => Array.from({ length: count }, (_, i) => ({ ...createActivityHistoryEvent({
  ownerKey, resetEpoch: 0, operationId: `event-${i}`, module: i % 2 ? 'profile' : 'reader', category: 'self-review',
  sourceId: `source-${i}`, itemId: `item-${i}`, contentVersion: 'fixture-v1', activityVersion: 'fixture-v1',
  occurredAt: i % 3 ? '2026-10-28T00:00:00Z' : null, sourceRecordRef: `record-${i}`,
}), skill: i % 2 ? 'reading' as const : null }));
async function ready(input: readonly LessonHistoryEventV1[], current = scope) {
  const view = await createHistoryView(current); await appendHistoryView(view, input); await sealHistoryView(view); return view;
}
async function allPages(view: HistoryView, query: { module: 'all' | 'profile' | 'reader'; skill: string }) {
  const pages: HistoryViewPage[] = []; let page = await readHistoryViewPage(view, query);
  for (;;) { pages.push(page); if (!page.hasNext) break;
    page = await readHistoryViewPage(view, { ...query, cursor: page.last });
    if (pages.length > 100) throw Error('Cursor failed to advance');
  }
  return pages;
}

it('paginates the exact canonical receipt projection with a fixed window and no source-store changes', async () => {
  const input = events();
  input.push({ ...input[4], confirmationState: 'confirmed', authority: 'server-recorded', receiptRef: 'receipt-4', receivedAt: '2026-10-28T01:00:00Z' });
  input.push(input[4]);
  const before = structuredClone(input), source = await captureOwnerRecoverySnapshot(scope), view = await ready(input);
  const expected = projectLessonHistory({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: 0 }, input);
  for (const query of [{ module: 'all' as const, skill: 'all' }, { module: 'reader' as const, skill: 'unknown' }, { module: 'profile' as const, skill: 'reading' }]) {
    const filtered = expected.filter(e => (query.module === 'all' || e.module === query.module)
      && (query.skill === 'all' || (query.skill === 'unknown' ? e.skill === null : e.skill === query.skill)));
    const pages = await allPages(view, query);
    expect(pages.flatMap(page => page.events)).toEqual(filtered);
    pages.forEach((page, index) => { expect(page.events.length).toBeLessThanOrEqual(20); expect(page.count).toBe(filtered.length); expect(page.offset).toBe(index * 20); });
    for (let index = pages.length - 1; index > 0; index--) {
      const previous = await readHistoryViewPage(view, { ...query, direction: 'previous', cursor: pages[index].first });
      expect(previous.events).toEqual(pages[index - 1].events); expect(previous.offset).toBe((index - 1) * 20);
    }
  }
  expect(input).toEqual(before);
  expect((await captureOwnerRecoverySnapshot(scope)).stores).toEqual(source.stores);
});

it('keeps localeCompare ties stable across cursors rather than using IndexedDB code-point order', async () => {
  const input = ['é', 'e\u0301', 'Z', 'a', 'A', '_', '-', '你', 'n', 'N'].flatMap((name, index) => {
    const event = events(1)[0];
    return Array.from({ length: 3 }, (_, copy) => {
      const e = createActivityHistoryEvent({ ownerKey: event.ownerKey, resetEpoch: 0, operationId: `${name}-${copy}`, module: 'profile', category: 'visit',
        sourceId: name, itemId: name, contentVersion: 'fixture-v1', activityVersion: 'fixture-v1', occurredAt: null, sourceRecordRef: `${index}-${copy}` });
      return e;
    });
  });
  const view = await ready(input), pages = await allPages(view, { module: 'all', skill: 'all' });
  expect(pages.flatMap(page => page.events)).toEqual(projectLessonHistory({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: 0 }, input));
});

it('streams insertion order in bounded batches, including deduplication inside and between write batches', async () => {
  const input = events(300), view = await createHistoryView(scope);
  await appendHistoryView(view, [...input, ...input]); await appendHistoryView(view, input.slice(0, 100)); await sealHistoryView(view);
  const result: LessonHistoryEventV1[] = [];
  for await (const batch of historyViewBatches(view)) { expect(batch.length).toBeLessThanOrEqual(128); result.push(...batch); }
  expect(result).toEqual(input);
  await expect(appendHistoryView(view, input)).rejects.toThrow('unavailable');
});

it('does not duplicate unknown binary metadata from raw events into the disposable display cache', async () => {
  const input = events(1)[0];
  const raw = new Blob(['retain original bytes']), buffer = new Uint8Array([1, 2, 3]);
  Object.assign(input, { raw, buffer }); Object.assign(input.assistance, { raw }); Object.assign(input.sourceLessonIds, { buffer });
  const view = await ready([input]), page = await readHistoryViewPage(view, { module: 'all', skill: 'all' });
  expect(Object.hasOwn(page.events[0], 'raw')).toBe(false); expect(Object.hasOwn(page.events[0], 'buffer')).toBe(false);
  expect(Object.hasOwn(page.events[0].assistance, 'raw')).toBe(false); expect(Object.hasOwn(page.events[0].sourceLessonIds, 'buffer')).toBe(false);
  expect(await raw.text()).toBe('retain original bytes'); expect(buffer).toEqual(new Uint8Array([1, 2, 3]));
});

it('preserves optional known review metadata accepted by the shared history contract', async () => {
  const input = events(1)[0];
  input.review = { cardId: null, wordId: input.sourceId, wordVersion: null, cardRevision: null, nextCardRevision: null,
    schedulerVersion: null, rating: null, ratingKind: 'self-reported', reviewModality: null, scheduledAt: null, nextDueAt: null, reportedDurationMs: null };
  const view = await ready([input]);
  expect((await readHistoryViewPage(view, { module: 'all', skill: 'all' })).events).toEqual([input]);
});

it('joins local and remote views exactly, including confirmations outside the currently visible filter', async () => {
  const local = events(87), remote = [...local.filter((_, i) => i % 3 === 0).map(e => ({ ...e, authority: 'server-recorded' as const,
    confirmationState: 'confirmed' as const, receiptRef: `receipt:${e.operationId}` })), ...events(100).slice(87)];
  const a = await ready(local), b = await ready(remote);
  const expected = projectLessonHistory({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: 0 }, [...local, ...projectLessonHistory({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: 0 }, remote)]);
  for (const query of [{ module: 'all' as const, skill: 'all' }, { module: 'reader' as const, skill: 'unknown' }]) {
    const result: LessonHistoryEventV1[] = []; let page = await readHistoryViewsPage([a, b], query);
    for (;;) { result.push(...page.events); if (!page.hasNext) break;
      const before = page; page = await readHistoryViewsPage([a, b], { ...query, cursor: page.last });
      expect((await readHistoryViewsPage([a, b], { ...query, cursor: page.first, direction: 'previous' })).events).toEqual(before.events);
    }
    expect(result).toEqual(expected.filter(e => (query.module === 'all' || e.module === query.module) && (query.skill === 'all' || e.skill === null)));
  }
});

it('does not hide a local conflict by folding a prior remote projection into local first', async () => {
  const base = createActivityHistoryEvent({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: 0, operationId: 'conflict', module: 'reader', category: 'objective',
    sourceId: 'source', itemId: 'item', contentVersion: 'fixture', activityVersion: 'fixture', occurredAt: null, sourceRecordRef: 'record' });
  const local = { ...base, outcome: 'correct' as const, score: 100 as const };
  const old = { ...base, authority: 'server-recorded' as const, confirmationState: 'confirmed' as const, receiptRef: 'stable-receipt' };
  const incoming = { ...old, authority: 'server-verified' as const, outcome: 'incorrect' as const, score: 0 as const };
  const a = await ready([local]), previous = await ready([old]), next = await ready([old, incoming]);
  expect((await readHistoryViewsPage([a, previous], { module: 'all', skill: 'all' })).events[0].outcome).toBe('unknown');
  // The conflict remains relevant even when the filter would hide this module.
  await expect(readHistoryViewsPage([a, next], { module: 'profile', skill: 'all' })).rejects.toThrow('Conflicting');
});

it('remaps a cursor to the same event after local insertions move remote ordinal offsets', async () => {
  const remote = events(45), a = await ready([]), b = await ready(remote);
  const first = await readHistoryViewsPage([a, b], { module: 'all', skill: 'all' });
  const changedLocal = await ready(events(10)); // these remote identities are now also present locally
  const second = await readHistoryViewsPage([changedLocal, b], { module: 'all', skill: 'all', cursor: first.last });
  const expected = projectLessonHistory({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: 0 }, remote).slice(20, 40);
  expect(second.events).toEqual(expected); expect(second.offset).toBe(20);
});

it('does not publish a partially written, conflicting, oversized or cancelled view', async () => {
  const good = events(), before = await captureOwnerRecoverySnapshot(scope);
  const view = await createHistoryView(scope);
  await appendHistoryView(view, good);
  await expect(readHistoryViewPage(view, { module: 'all', skill: 'all' })).rejects.toThrow('unavailable');
  await expect(appendHistoryView(view, [{ ...good[0], itemId: 'conflicting' }])).rejects.toThrow('Conflicting');
  await expect(appendHistoryView(view, [{ ...good[0], contentVersion: 'x'.repeat(600000) }])).rejects.toThrow('unavailable');
  const controller = new AbortController(); controller.abort();
  await expect(appendHistoryView(view, good, controller.signal)).rejects.toThrow('cancelled');
  await dropHistoryView(view);
  await expect(sealHistoryView(view)).rejects.toThrow('unavailable');
  expect((await captureOwnerRecoverySnapshot(scope)).stores).toEqual(before.stores);
});

it('preserves a published view and all source data after a quota error in its replacement', async () => {
  const source = await captureOwnerRecoverySnapshot(scope), first = await ready(events(25)), next = await createHistoryView(scope);
  const original = IDBObjectStore.prototype.add;
  const fail = vi.spyOn(IDBObjectStore.prototype, 'add').mockImplementation(function (this: IDBObjectStore, value, key?) {
    if (this.transaction.db.name === HISTORY_VIEW_DATABASE && this.name === 'rows') throw new DOMException('Fixture quota', 'QuotaExceededError');
    return key === undefined ? original.call(this, value) : original.call(this, value, key);
  });
  await expect(appendHistoryView(next, events())).rejects.toThrow('Fixture quota'); fail.mockRestore();
  expect((await readHistoryViewPage(first, { module: 'all', skill: 'all' })).count).toBe(25);
  await expect(readHistoryViewPage(next, { module: 'all', skill: 'all' })).rejects.toThrow('unavailable');
  expect((await captureOwnerRecoverySnapshot(scope)).stores).toEqual(source.stores);
});

it.each(['ordinal', 'owner', 'missing'])('rejects a corrupt derived row without changing the source: %s', async kind => {
  const source = await captureOwnerRecoverySnapshot(scope), view = await ready(events(25));
  const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open(HISTORY_VIEW_DATABASE); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  const tx = db.transaction('rows', 'readwrite'), store = tx.objectStore('rows');
  const row = await new Promise<{ viewId: string; eventId: string; ordinal: number; event: LessonHistoryEventV1 }>((resolve, reject) => {
    const r = store.get([view.id, events(1)[0].eventId]); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
  });
  if (kind === 'ordinal') row.ordinal = 999;
  if (kind === 'owner') row.event.ownerKey = 'account:wrong';
  if (kind === 'missing') store.delete([view.id, row.eventId]); else store.put(row);
  await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); }); db.close();
  await expect(readHistoryViewPage(view, { module: 'all', skill: 'all' })).rejects.toThrow('unavailable');
  expect((await captureOwnerRecoverySnapshot(scope)).stores).toEqual(source.stores);
});

it('cleans only the named owner, including through the existing deleteOwnerData path', async () => {
  const own = await ready(events(25)), otherScope = { ...scope, ownerGeneration: { ownerKey: 'account:other', generation: 1 } };
  const other = await ready(events(25, otherScope.ownerGeneration.ownerKey), otherScope);
  await clearOwnerHistoryViews(scope.ownerGeneration.ownerKey);
  await expect(readHistoryViewPage(own, { module: 'all', skill: 'all' })).rejects.toThrow();
  expect((await readHistoryViewPage(other, { module: 'all', skill: 'all' })).count).toBe(25);
  const replacement = await ready(events(2));
  await deleteOwnerData(scope.ownerGeneration.ownerKey);
  await expect(readHistoryViewPage(replacement, { module: 'all', skill: 'all' })).rejects.toThrow();
  expect((await readHistoryViewPage(other, { module: 'all', skill: 'all' })).count).toBe(25);
});

it('does not allocate a cache database merely to delete canonical owner data', async () => {
  expect((await indexedDB.databases()).some(db => db.name === HISTORY_VIEW_DATABASE)).toBe(false);
  await deleteOwnerData(scope.ownerGeneration.ownerKey);
  expect((await indexedDB.databases()).some(db => db.name === HISTORY_VIEW_DATABASE)).toBe(false);
});

it('expires abandoned projections without removing canonical state or another fresh view', async () => {
  const source = await captureOwnerRecoverySnapshot(scope), now = vi.spyOn(Date, 'now').mockReturnValue(1);
  const old = await ready(events(2)); now.mockReturnValue(24 * 60 * 60 * 1000 + 2);
  const fresh = await ready(events(3));
  await expect(readHistoryViewPage(old, { module: 'all', skill: 'all' })).rejects.toThrow();
  expect((await readHistoryViewPage(fresh, { module: 'all', skill: 'all' })).count).toBe(3);
  expect((await captureOwnerRecoverySnapshot(scope)).stores).toEqual(source.stores);
});

it('cancels a running page scan instead of publishing its partial count/window', async () => {
  const view = await ready(events(300)), controller = new AbortController(), original = IDBObjectStore.prototype.getAll;
  vi.spyOn(IDBObjectStore.prototype, 'getAll').mockImplementation(function (this: IDBObjectStore, query?, count?) {
    const r = original.call(this, query, count);
    if (this.transaction.db.name === HISTORY_VIEW_DATABASE) r.addEventListener('success', () => controller.abort(), { once: true });
    return r;
  });
  await expect(readHistoryViewPage(view, { module: 'all', skill: 'all' }, controller.signal)).rejects.toThrow('cancelled');
});
