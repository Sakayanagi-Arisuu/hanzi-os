import { compareHistoryEvents, isLessonHistoryEvent, reconcileLessonHistoryEvent, type HistoryModule, type LessonHistoryEventV1 } from '../learning/lessonHistory';
import type { ActiveOwnerLearningScope } from './indexedDb';
import { historyViewEvent } from './historyViewEvent';

// Disposable projections only. Never store progress, drafts, outbox or authority
// in this database, and never use it as an input to learning or recovery.
export const HISTORY_VIEW_DATABASE = 'hanzi-os-history-view-v1';
const VIEWS = 'views', ROWS = 'rows', PAGES = 'pages', BATCH_SIZE = 128, WRITE_BATCH_SIZE = 512;
const MAX_ROW_BYTES = 512 * 1024, BATCH_BYTES = 1024 * 1024;
const MAX_AGE = 24 * 60 * 60 * 1000;
export const HISTORY_VIEW_PAGE_SIZE = 20;
export type HistoryView = { id: string; scope: ActiveOwnerLearningScope };
type Metadata = HistoryView & { version: 1; status: 'building' | 'ready'; count: number; touchedAt: number;
  storage?: 'pages'; pages?: { id: number; order: number }; orderIndex?: false };
type Row = { viewId: string; eventId: string; ordinal: number; event: LessonHistoryEventV1 };
export type HistoryViewRecord = Pick<Row, 'ordinal' | 'event'>;
type PageLane = 'id' | 'order';
type StoredPage = { version: 1; viewId: string; ownerKey: string; lane: PageLane; index: number; rows: Row[] };
export type HistoryViewCursor = Pick<LessonHistoryEventV1, 'eventId' | 'occurredAt'> & { ordinal: number };
export type HistoryViewQuery = { module: HistoryModule | 'all'; skill: string; cursor?: HistoryViewCursor | null; direction?: 'next' | 'previous'; inclusive?: boolean };
export type HistoryViewPage = { events: LessonHistoryEventV1[]; count: number; offset: number;
  first: HistoryViewCursor | null; last: HistoryViewCursor | null; hasPrevious: boolean; hasNext: boolean };
export const emptyHistoryViewPage = (): HistoryViewPage => ({ events: [], count: 0, offset: 0, first: null, last: null, hasPrevious: false, hasNext: false });

let databasePromise: Promise<IDBDatabase> | null = null;
export class HistoryViewUnavailableError extends Error {}
const unavailable = () => new HistoryViewUnavailableError('History view unavailable; retain original journals.');
const request = <T>(value: IDBRequest<T>) => new Promise<T>((resolve, reject) => { value.onsuccess = () => resolve(value.result); value.onerror = () => reject(value.error); });
const done = (tx: IDBTransaction) => new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onabort = tx.onerror = () => reject(tx.error ?? unavailable()); });
const range = (id: string, after = -1) => IDBKeyRange.bound([id, after], [id, Number.MAX_SAFE_INTEGER], true, false);
const sameScope = (a: ActiveOwnerLearningScope, b: ActiveOwnerLearningScope) => a?.ownerGeneration?.ownerKey === b?.ownerGeneration?.ownerKey
  && a?.ownerGeneration?.generation === b?.ownerGeneration?.generation && a?.resetEpoch === b?.resetEpoch;
const cancelled = (signal?: AbortSignal) => { if (signal?.aborted) throw new DOMException('History request cancelled', 'AbortError'); };

async function database() {
  if (!databasePromise) databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const opening = indexedDB.open(HISTORY_VIEW_DATABASE, 2);
    let blocked = false;
    opening.onupgradeneeded = () => {
      const db = opening.result;
      if (!db.objectStoreNames.contains(VIEWS)) {
        const views = db.createObjectStore(VIEWS, { keyPath: 'id' });
        views.createIndex('owner', 'scope.ownerGeneration.ownerKey'); views.createIndex('touched', 'touchedAt');
        const rows = db.createObjectStore(ROWS, { keyPath: ['viewId', 'eventId'] });
        rows.createIndex('order', ['viewId', 'ordinal'], { unique: true });
      }
      const rows = opening.transaction!.objectStore(ROWS);
      if (!rows.indexNames.contains('owner')) rows.createIndex('owner', 'event.ownerKey');
      if (!db.objectStoreNames.contains(PAGES)) {
        const pages = db.createObjectStore(PAGES, { keyPath: ['viewId', 'lane', 'index'] }); pages.createIndex('owner', 'ownerKey');
      }
    };
    opening.onerror = () => { databasePromise = null; reject(opening.error); };
    opening.onblocked = () => { blocked = true; databasePromise = null; reject(unavailable()); };
    opening.onsuccess = () => {
      if (blocked) { opening.result.close(); return; }
      const db = opening.result;
      db.onversionchange = () => { db.close(); databasePromise = null; };
      resolve(db);
    };
  });
  return databasePromise;
}
async function transaction<T>(mode: IDBTransactionMode, work: (tx: IDBTransaction) => Promise<T>) {
  const db = await database();
  let tx: IDBTransaction;
  // Only this disposable cache can use relaxed durability. Canonical learner
  // stores retain their existing durability and transaction behavior.
  try { tx = db.transaction([VIEWS, ROWS, PAGES], mode, { durability: 'relaxed' }); }
  catch (error) { if (!(error instanceof TypeError)) throw error; tx = db.transaction([VIEWS, ROWS, PAGES], mode); }
  const completion = done(tx);
  void completion.catch(() => undefined);
  try { const result = await work(tx); await completion; return result; }
  catch (error) { try { tx.abort(); } catch { /* already finished */ } await completion.catch(() => undefined); throw tx.error ?? error; }
}
async function metadata(tx: IDBTransaction, view: HistoryView, ready: boolean) {
  const value = await request<Metadata | undefined>(tx.objectStore(VIEWS).get(view.id));
  if (!value || value.version !== 1 || value.id !== view.id || !sameScope(value.scope, view.scope)
    || !['ready', 'building'].includes(value.status) || ready && value.status !== 'ready'
    || !Number.isSafeInteger(value.count) || value.count < 0 || !Number.isSafeInteger(value.touchedAt)
    || value.storage !== undefined && value.storage !== 'pages'
    || value.orderIndex !== undefined && value.orderIndex !== false) throw unavailable();
  if (value.storage === 'pages' && (!value.pages || ['id', 'order'].some(key => {
    const pages = value.pages![key as PageLane];
    if (key === 'order' && value.orderIndex === false) return pages !== 0;
    return !Number.isSafeInteger(pages) || pages < 0 || pages > value.count
      || ready && ((value.count === 0) !== (pages === 0) || value.count > pages * BATCH_SIZE);
  }))) throw unavailable();
  return value;
}
function validateRow(row: Row, view: HistoryView) {
  if (!row || row.viewId !== view.id || !Number.isSafeInteger(row.ordinal) || row.ordinal < 0
    || !isLessonHistoryEvent(row.event) || row.eventId !== row.event.eventId
    || row.event.ownerKey !== view.scope.ownerGeneration.ownerKey || row.event.resetEpoch !== view.scope.resetEpoch) throw unavailable();
  return row;
}
function removeView(tx: IDBTransaction, id: string) {
  tx.objectStore(VIEWS).delete(id);
  // The second primary-key part is a string. An array upper bound is greater
  // than every such string and stays inside this exact view-id prefix.
  tx.objectStore(ROWS).delete(IDBKeyRange.bound([id], [id, []], false, true));
  tx.objectStore(PAGES).delete(IDBKeyRange.bound([id], [id, []], false, true));
}

async function createView(scope: ActiveOwnerLearningScope, pagedCount?: number, orderIndex = true): Promise<HistoryView> {
  scope = structuredClone(scope);
  if (!scope.ownerGeneration.ownerKey || !Number.isSafeInteger(scope.ownerGeneration.generation) || scope.ownerGeneration.generation < 1
    || !Number.isSafeInteger(scope.resetEpoch) || scope.resetEpoch < 0) throw unavailable();
  const view = { id: crypto.randomUUID(), scope };
  await transaction('readwrite', async tx => {
    // An abandoned view is replaceable from source. Expiry never touches a
    // learner journal and an expired active tab can simply rebuild its view.
    const expired = tx.objectStore(VIEWS).index('touched').openCursor(IDBKeyRange.upperBound(Date.now() - MAX_AGE));
    expired.onsuccess = () => { if (expired.result) { removeView(tx, expired.result.primaryKey as string); expired.result.continue(); } };
    await request(tx.objectStore(VIEWS).add({ ...view, version: 1, status: 'building', count: pagedCount ?? 0, touchedAt: Date.now(),
      ...(pagedCount === undefined ? {} : { storage: 'pages' as const, pages: { id: 0, order: 0 }, ...(orderIndex ? {} : { orderIndex: false as const }) }) } satisfies Metadata));
  });
  return view;
}
export const createHistoryView = (scope: ActiveOwnerLearningScope) => createView(scope);

/** Each write batch is bounded in item count and serialized bytes. A failure
 * leaves the view unpublishable; the owner journal is never changed. */
export async function appendHistoryView(view: HistoryView, events: readonly LessonHistoryEventV1[], signal?: AbortSignal) {
  return appendHistoryViewGroups(view, [events], signal);
}

export async function appendHistoryViewGroups(view: HistoryView,
  groups: AsyncIterable<readonly LessonHistoryEventV1[]> | Iterable<readonly LessonHistoryEventV1[]>, signal?: AbortSignal, checkpoint?: () => Promise<void>) {
  let batch: LessonHistoryEventV1[] = [], bytes = 0;
  const flush = async () => {
    if (!batch.length) return;
    cancelled(signal);
    const fold = () => transaction('readwrite', async tx => {
      const meta = await metadata(tx, view, false);
      if (meta.status !== 'building' || meta.storage === 'pages') throw unavailable();
      const store = tx.objectStore(ROWS);
      for (let start = 0; start < batch.length; start += 32) {
        const part = batch.slice(start, start + 32);
        const existing = await Promise.all(part.map(event => request<Row | undefined>(store.get([view.id, event.eventId]))));
        const folded = new Map<string, Row>();
        for (const [index, event] of part.entries()) {
          cancelled(signal);
          const previous = folded.get(event.eventId) ?? existing[index];
          if (previous) validateRow(previous, view);
          const next = reconcileLessonHistoryEvent({ ownerKey: view.scope.ownerGeneration.ownerKey, resetEpoch: view.scope.resetEpoch }, event, previous?.event);
          const ordinal = previous?.ordinal ?? meta.count++;
          const row = { viewId: view.id, eventId: next.eventId, ordinal, event: next } satisfies Row;
          folded.set(row.eventId, row); store.put(row);
        }
      }
      await request(tx.objectStore(VIEWS).put({ ...meta, touchedAt: Date.now() }));
    });
    if (new Set(batch.map(event => event.eventId)).size !== batch.length) await fold();
    else {
      try {
        await transaction('readwrite', async tx => {
          const meta = await metadata(tx, view, false);
          if (meta.status !== 'building' || meta.storage === 'pages') throw unavailable();
          for (const event of batch) {
            cancelled(signal);
            const next = reconcileLessonHistoryEvent({ ownerKey: view.scope.ownerGeneration.ownerKey, resetEpoch: view.scope.resetEpoch }, event);
            // add is the uniqueness proof. A collision aborts the entire batch
            // and retries through the same canonical reducer as an overlay.
            tx.objectStore(ROWS).add({ viewId: view.id, eventId: next.eventId, ordinal: meta.count++, event: next } satisfies Row);
          }
          await request(tx.objectStore(VIEWS).put({ ...meta, touchedAt: Date.now() }));
        });
      } catch (error) {
        if (!(error instanceof DOMException) || error.name !== 'ConstraintError') throw error;
        await fold();
      }
    }
    batch = []; bytes = 0;
    await checkpoint?.();
  }
  for await (const events of groups) for (const raw of events) {
    cancelled(signal);
    const event = historyViewEvent(raw), size = new TextEncoder().encode(JSON.stringify(event)).byteLength;
    if (size > MAX_ROW_BYTES) throw unavailable();
    if (batch.length >= WRITE_BATCH_SIZE || batch.length && bytes + size > BATCH_BYTES) await flush();
    batch.push(structuredClone(event)); bytes += size;
  }
  await flush();
}
export async function sealHistoryView(view: HistoryView) {
  await transaction('readwrite', async tx => { const meta = await metadata(tx, view, false);
    if (meta.storage === 'pages' && ['id', 'order'].some(key => {
      if (key === 'order' && meta.orderIndex === false) return meta.pages!.order !== 0;
      const pages = meta.pages![key as PageLane]; return (meta.count === 0) !== (pages === 0) || meta.count > pages * BATCH_SIZE;
    })) throw unavailable();
    await request(tx.objectStore(VIEWS).put({ ...meta, status: 'ready', touchedAt: Date.now() })); });
}
export async function dropHistoryView(view: HistoryView) {
  await transaction('readwrite', async tx => { const saved = await request<Metadata | undefined>(tx.objectStore(VIEWS).get(view.id));
    if (saved && !sameScope(saved.scope, view.scope)) throw unavailable(); removeView(tx, view.id); });
}
export async function clearOwnerHistoryViews(ownerKey: string) {
  // Deleting canonical data must not allocate a new cache database for an owner
  // who has never used this display projection (especially under storage pressure).
  if (!databasePromise && typeof indexedDB.databases === 'function') {
    const names = await indexedDB.databases();
    if (!names.some(entry => entry.name === HISTORY_VIEW_DATABASE)) return;
  }
  await transaction('readwrite', async tx => {
    const cursor = tx.objectStore(VIEWS).index('owner').openKeyCursor(IDBKeyRange.only(ownerKey));
    await new Promise<void>((resolve, reject) => {
      cursor.onerror = () => reject(cursor.error);
      cursor.onsuccess = () => { if (!cursor.result) { resolve(); return; } removeView(tx, cursor.result.primaryKey as string); cursor.result.continue(); };
    });
    // Also remove owned projection rows left by an interrupted metadata write.
    for (const storeName of [ROWS, PAGES]) {
      const orphan = tx.objectStore(storeName).index('owner').openKeyCursor(IDBKeyRange.only(ownerKey));
      orphan.onsuccess = () => { if (orphan.result) { tx.objectStore(storeName).delete(orphan.result.primaryKey); orphan.result.continue(); } };
    }
  });
}

async function pageRows(tx: IDBTransaction, view: HistoryView, lane: PageLane, index: number) {
  const page = await request<StoredPage | undefined>(tx.objectStore(PAGES).get([view.id, lane, index]));
  if (!page || page.version !== 1 || page.viewId !== view.id || page.ownerKey !== view.scope.ownerGeneration.ownerKey
    || page.lane !== lane || page.index !== index || Object.keys(page).sort().join() !== 'index,lane,ownerKey,rows,version,viewId'
    || !Array.isArray(page.rows) || !page.rows.length || page.rows.length > BATCH_SIZE || Object.keys(page.rows).length !== page.rows.length
    || new TextEncoder().encode(JSON.stringify(page)).byteLength > BATCH_BYTES) throw unavailable();
  return page.rows;
}

/** Both indexes use bounded blocks. ID blocks support the local/remote merge;
 * insertion-order blocks preserve canonical stable ties when adding receipts. */
export async function createPagedHistoryView(scope: ActiveOwnerLearningScope, count: number,
  records: (lane: PageLane) => AsyncIterable<readonly HistoryViewRecord[]>, signal?: AbortSignal, orderIndex = true): Promise<HistoryView> {
  if (!Number.isSafeInteger(count) || count < 0) throw unavailable();
  const view = await createView(scope, count, orderIndex);
  try {
    for (const lane of (orderIndex ? ['order', 'id'] : ['id']) as PageLane[]) {
      let rows: Row[] = [], bytes = 256, index = 0, seen = 0, lastId: string | null = null, lastEvent: LessonHistoryEventV1 | null = null;
      const flush = async () => {
        if (!rows.length) return;
        const page: StoredPage = { version: 1, viewId: view.id, ownerKey: view.scope.ownerGeneration.ownerKey, lane, index, rows };
        if (new TextEncoder().encode(JSON.stringify(page)).byteLength > BATCH_BYTES) throw unavailable();
        await transaction('readwrite', async tx => {
          const meta = await metadata(tx, view, false);
          if (meta.status !== 'building' || meta.storage !== 'pages' || meta.pages![lane] !== index) throw unavailable();
          await request(tx.objectStore(PAGES).add(page));
          meta.pages![lane]++;
          await request(tx.objectStore(VIEWS).put({ ...meta, touchedAt: Date.now() }));
        });
        rows = []; bytes = 256; index++;
      };
      for await (const batch of records(lane)) for (const record of batch) {
        cancelled(signal);
        const event = historyViewEvent(record.event);
        reconcileLessonHistoryEvent({ ownerKey: view.scope.ownerGeneration.ownerKey, resetEpoch: view.scope.resetEpoch }, event);
        if (!Number.isSafeInteger(record.ordinal) || record.ordinal < 0 || record.ordinal >= count
          || lane === 'order' && (record.ordinal !== seen || lastEvent && compareHistoryEvents(lastEvent, event) > 0)
          || lane === 'id' && lastId !== null && lastId >= event.eventId) throw unavailable();
        const row: Row = { viewId: view.id, eventId: event.eventId, ordinal: record.ordinal, event };
        const eventBytes = new TextEncoder().encode(JSON.stringify(event)).byteLength;
        const size = new TextEncoder().encode(JSON.stringify(row)).byteLength + 1;
        if (eventBytes > MAX_ROW_BYTES || size + 256 > BATCH_BYTES) throw unavailable();
        if (rows.length >= BATCH_SIZE || bytes + size > BATCH_BYTES) await flush();
        rows.push(row); bytes += size; seen++; lastId = event.eventId; lastEvent = event;
      }
      await flush(); if (seen !== count) throw unavailable();
    }
    cancelled(signal); await sealHistoryView(view); return view;
  } catch (error) { await dropHistoryView(view).catch(() => undefined); throw error; }
}

export async function* historyViewRecords(view: HistoryView, lane: PageLane, signal?: AbortSignal): AsyncGenerator<HistoryViewRecord[]> {
  let after = -1, afterId: string | null = null, seen = 0, pageIndex = 0, total: number | null = null;
  for (;;) {
    cancelled(signal);
    const batch = await transaction('readonly', async tx => {
      const meta = await metadata(tx, view, true);
      if (lane === 'order' && meta.orderIndex === false) throw unavailable();
      if (total !== null && meta.count !== total) throw unavailable(); total = meta.count;
      if (meta.storage === 'pages') return pageIndex >= meta.pages![lane] ? [] : pageRows(tx, view, lane, pageIndex++);
      return lane === 'order' ? request<Row[]>(tx.objectStore(ROWS).index('order').getAll(range(view.id, after), BATCH_SIZE))
        : request<Row[]>(tx.objectStore(ROWS).getAll(IDBKeyRange.bound(afterId === null ? [view.id] : [view.id, afterId], [view.id, []], afterId !== null, true), BATCH_SIZE));
    });
    if (!batch.length) { if (seen !== total) throw unavailable(); return; }
    for (const row of batch) {
      validateRow(row, view);
      if (row.ordinal >= total! || lane === 'order' && row.ordinal !== ++after
        || lane === 'id' && afterId !== null && afterId >= row.eventId) throw unavailable();
      afterId = row.eventId; seen++;
    }
    yield batch.map(({ event, ordinal }) => ({ event, ordinal }));
  }
}

/** Input order is the first insertion order of each unique event, matching the
 * stable Map reducer even when localeCompare reports a tie for distinct IDs. */
export async function* historyViewBatches(view: HistoryView, signal?: AbortSignal) {
  for await (const batch of historyViewRecords(view, 'order', signal)) yield batch.map(row => row.event);
}

export async function historyViewLayout(view: HistoryView) {
  return transaction('readonly', async tx => { const meta = await metadata(tx, view, true); return { count: meta.count, paged: meta.storage === 'pages', orderIndex: meta.orderIndex !== false }; });
}

async function findRow(tx: IDBTransaction, view: HistoryView, meta: Metadata, id: string) {
  if (meta.storage !== 'pages') return request<Row | undefined>(tx.objectStore(ROWS).get([view.id, id]));
  let low = 0, high = meta.pages!.id - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2), rows = await pageRows(tx, view, 'id', middle);
    const first = validateRow(rows[0], view), last = validateRow(rows[rows.length - 1], view);
    if (id < first.eventId) high = middle - 1;
    else if (id > last.eventId) low = middle + 1;
    else return rows.find(row => row.eventId === id);
  }
}

const rowCursor = (row: Row): HistoryViewCursor => ({ eventId: row.eventId, occurredAt: row.event.occurredAt, ordinal: row.ordinal });
const compare = (a: HistoryViewCursor, b: HistoryViewCursor) => compareHistoryEvents(a, b) || a.ordinal - b.ordinal;
export async function readHistoryViewPage(view: HistoryView, query: HistoryViewQuery, signal?: AbortSignal): Promise<HistoryViewPage> {
  return readHistoryViewsPage([view], query, signal);
}

/** Join immutable local/remote views in IDB key order, then select the display
 * window using the canonical locale comparator. No full joined array or ID set
 * is allocated. Both sources are checked, including rows outside the filter. */
export async function readHistoryViewsPage(views: readonly HistoryView[], query: HistoryViewQuery, signal?: AbortSignal): Promise<HistoryViewPage> {
  views = views.map(view => structuredClone(view)); query = structuredClone(query);
  if (!views.length || views.length > 2 || views.some(view => !sameScope(view.scope, views[0].scope))) throw unavailable();
  const cursor = query.cursor;
  if (cursor && (!Number.isSafeInteger(cursor.ordinal) || cursor.ordinal < 0 || typeof cursor.eventId !== 'string'
    || cursor.occurredAt !== null && typeof cursor.occurredAt !== 'string')) throw unavailable();
  const previous = query.direction === 'previous';
  return transaction('readwrite', async tx => {
    const scans = [];
    let base = 0;
    for (const view of views) {
      const meta = await metadata(tx, view, true);
      scans.push({ view, meta, buffer: [] as Row[], position: 0, after: null as string | null, pageIndex: 0, lastId: null as string | null, seen: 0, eof: false, base });
      base += meta.count; if (!Number.isSafeInteger(base)) throw unavailable();
    }
    let boundary = cursor;
    if (cursor) {
      let anchor: Row | undefined;
      for (const scan of scans) {
        const found = await findRow(tx, scan.view, scan.meta, cursor.eventId);
        if (!found) continue;
        validateRow(found, scan.view);
        if (!anchor) anchor = { ...found, ordinal: scan.base + found.ordinal };
        else anchor.event = reconcileLessonHistoryEvent({ ownerKey: scan.view.scope.ownerGeneration.ownerKey, resetEpoch: scan.view.scope.resetEpoch }, found.event, anchor.event);
      }
      if (anchor) boundary = rowCursor(anchor);
    }
    type Scan = typeof scans[number];
    const fill = async (scan: Scan) => {
      if (scan.position < scan.buffer.length || scan.eof) return;
      if (scan.meta.storage === 'pages') scan.buffer = scan.pageIndex >= scan.meta.pages!.id ? [] : await pageRows(tx, scan.view, 'id', scan.pageIndex++);
      else {
        const bounds = IDBKeyRange.bound(scan.after === null ? [scan.view.id] : [scan.view.id, scan.after], [scan.view.id, []], scan.after !== null, true);
        scan.buffer = await request<Row[]>(tx.objectStore(ROWS).getAll(bounds, 32));
      }
      scan.position = 0;
      if (!scan.buffer.length) { scan.eof = true; if (scan.seen !== scan.meta.count) throw unavailable(); }
      else scan.after = scan.buffer[scan.buffer.length - 1].eventId;
    };
    const take = (scan: Scan) => {
      const row = validateRow(scan.buffer[scan.position++], scan.view);
      if (row.ordinal >= scan.meta.count || scan.lastId !== null && scan.lastId >= row.eventId) throw unavailable();
      scan.lastId = row.eventId; scan.seen++;
      return { ...row, ordinal: scan.base + row.ordinal };
    };
    const selected: Row[] = []; let count = 0, eligible = 0;
    const compareRows = (a: Row, b: Row) => compareHistoryEvents(a.event, b.event) || a.ordinal - b.ordinal;
    for (;;) {
      cancelled(signal);
      for (const scan of scans) await fill(scan);
      const left = scans[0], right = scans[1];
      if (left.eof && (!right || right.eof)) break;
      let row: Row;
      const order = !right || right.eof ? -1 : left.eof ? 1
        : indexedDB.cmp(left.buffer[left.position].eventId, right.buffer[right.position].eventId);
      if (!order) {
        row = take(left);
        const remote = take(right);
        row.event = reconcileLessonHistoryEvent({ ownerKey: left.view.scope.ownerGeneration.ownerKey, resetEpoch: left.view.scope.resetEpoch }, remote.event, row.event);
      } else row = take(order < 0 ? left : right);
      const event = row.event;
      if ((query.module !== 'all' && event.module !== query.module)
        || (query.skill !== 'all' && (query.skill === 'unknown' ? event.skill !== null : event.skill !== query.skill))) continue;
      count++;
      const direction = boundary ? compare(rowCursor(row), boundary) : 1;
      if (boundary && (previous ? direction >= 0 : query.inclusive ? direction < 0 : direction <= 0)) continue;
      eligible++;
      if (selected.length === HISTORY_VIEW_PAGE_SIZE && (previous ? compareRows(row, selected[0]) <= 0 : compareRows(row, selected[selected.length - 1]) >= 0)) continue;
      const index = selected.findIndex(other => compareRows(row, other) < 0);
      selected.splice(index < 0 ? selected.length : index, 0, row);
      if (selected.length > HISTORY_VIEW_PAGE_SIZE) { if (previous) selected.shift(); else selected.pop(); }
    }
    for (const scan of scans) {
      if (scan.seen !== scan.meta.count) throw unavailable();
      await request(tx.objectStore(VIEWS).put({ ...scan.meta, touchedAt: Date.now() }));
    }
    const offset = previous ? eligible - selected.length : count - eligible;
    return { events: selected.map(row => row.event), count, offset, first: selected[0] ? rowCursor(selected[0]) : null,
      last: selected.length ? rowCursor(selected[selected.length - 1]) : null,
      hasPrevious: offset > 0, hasNext: offset + selected.length < count };
  });
}

export async function closeHistoryViewDatabaseForTests() { const db = await databasePromise?.catch(() => null); db?.close(); databasePromise = null; }
