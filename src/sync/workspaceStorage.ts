import { withLessonResumeTransaction, readActiveOwnerLearningScope, StaleOwnerGenerationError, type ActiveOwnerLearningScope, type OwnerScopedCacheRecord } from './indexedDb';
import { validWorkspaceEntry, type WorkspaceEntry } from './workspaceProtocol';
import { WORKSPACE_CACHE_KEY, WORKSPACE_PAGE_PREFIX, WORKSPACE_PAGE_MAX_BYTES, WORKSPACE_PAGE_MAX_ITEMS, WORKSPACE_PAGED_THRESHOLD, WORKSPACE_LEGACY_MAX_BYTES } from './workspaceStorageFormat';
import { forEachHistoryBatch } from '../lib/historyWork';

type Journal = { version: 1; entries: WorkspaceEntry[]; pending: WorkspaceEntry[] };
type ProjectedJournal<T> = { version: 1; entries: T[]; pending: T[] };
type Lane = 'entries' | 'pending';
type Manifest = { version: 2; storage: 'pages-v1' | 'pages-ref-v1'; revision: string;
  entries: { count: number; pages: number }; pending: { count: number; pages: number } };
type PendingRef = { ref: number };
type Cell = WorkspaceEntry | PendingRef;
type Page = { version: 1 | 2; revision: string; lane: Lane; index: number; entries: Cell[] };
const lanes = ['entries', 'pending'] as const;
const MAX_PAGES = 8192;
const failure = () => new Error('Không đọc được dữ liệu đọc và luyện đã lưu. Hãy giữ dữ liệu trên thiết bị để khôi phục.');
const request = <T>(r: IDBRequest<T>) => new Promise<T>((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
const recordKey = (scope: ActiveOwnerLearningScope, entryKey: string) => JSON.stringify([scope.ownerGeneration.ownerKey, scope.resetEpoch, entryKey]);
const cacheScope = (scope: ActiveOwnerLearningScope) => ({ expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: scope.resetEpoch, entryKey: WORKSPACE_CACHE_KEY });
const pageEntryKey = (revision: string, lane: Lane, index: number) => `${WORKSPACE_PAGE_PREFIX}${revision}:${lane}:${index}`;
function byteLength(value: unknown) {
  let size = new TextEncoder().encode(JSON.stringify(value)).byteLength;
  const seen = new WeakSet<object>(), stack = [value];
  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== 'object' || seen.has(current)) continue;
    seen.add(current);
    if (current instanceof Blob) size += current.size;
    else if (current instanceof ArrayBuffer) size += current.byteLength;
    else if (ArrayBuffer.isView(current) && !seen.has(current.buffer)) {
      size += current.buffer.byteLength; seen.add(current.buffer);
    }
    else if (ArrayBuffer.isView(current)) continue;
    else if (current instanceof Date) continue;
    else {
      if (!Array.isArray(current) && Object.getPrototypeOf(current) !== Object.prototype && Object.getPrototypeOf(current) !== null) throw failure();
      for (const child of Object.values(current)) stack.push(child);
    }
  }
  return size;
}

function validateRecord(scope: ActiveOwnerLearningScope, entryKey: string, record: OwnerScopedCacheRecord<unknown>) {
  if (!record || record.schemaVersion !== 1 || record.ownerKey !== scope.ownerGeneration.ownerKey || record.resetEpoch !== scope.resetEpoch
    || record.entryKey !== entryKey || record.recordKey !== recordKey(scope, entryKey) || record.value === undefined) throw failure();
}
function manifest(value: unknown): Manifest | null {
  if (!value || typeof value !== 'object' || (value as { version?: unknown }).version !== 2
    || !['pages-v1', 'pages-ref-v1'].includes(String((value as { storage?: unknown }).storage))) return null;
  const root = value as Manifest;
  if (Object.keys(root).sort().join() !== 'entries,pending,revision,storage,version'
    || typeof root.revision !== 'string' || !/^[a-f0-9-]{36}$/.test(root.revision)
    || lanes.some(lane => !root[lane] || !Number.isSafeInteger(root[lane].count) || root[lane].count < 0
      || Object.keys(root[lane]).sort().join() !== 'count,pages'
      || !Number.isSafeInteger(root[lane].pages) || root[lane].pages < 0 || root[lane].pages > MAX_PAGES
      || root[lane].pages > root[lane].count || root[lane].count > root[lane].pages * WORKSPACE_PAGE_MAX_ITEMS
      || (root[lane].count === 0) !== (root[lane].pages === 0))) throw failure();
  return root;
}
async function materialize<T>(scope: ActiveOwnerLearningScope, store: IDBObjectStore, record: OwnerScopedCacheRecord<unknown> | undefined,
  project: (entry: WorkspaceEntry, lane: Lane) => T) {
  if (!record) return { record: null, root: null };
  validateRecord(scope, WORKSPACE_CACHE_KEY, record);
  const root = manifest(record.value);
  if (!root) return { record, root };
  const journal: ProjectedJournal<T> = { version: 1, entries: [], pending: [] };
  for (const lane of lanes) {
    for (let index = 0; index < root[lane].pages; index++) {
      const entryKey = pageEntryKey(root.revision, lane, index);
      const stored = await request<OwnerScopedCacheRecord<Page> | undefined>(store.get(recordKey(scope, entryKey)));
      if (!stored) throw failure();
      validateRecord(scope, entryKey, stored);
      const page = stored.value;
      if (!page || Object.keys(page).sort().join() !== 'entries,index,lane,revision,version'
        || page.version !== (lane === 'pending' && root.storage === 'pages-ref-v1' ? 2 : 1)
        || page.revision !== root.revision || page.lane !== lane || page.index !== index
        || !Array.isArray(page.entries) || !page.entries.length || page.entries.length > WORKSPACE_PAGE_MAX_ITEMS
        || Object.keys(page.entries).length !== page.entries.length || !Object.keys(page.entries).every((key, position) => key === String(position)) || byteLength(page) > WORKSPACE_PAGE_MAX_BYTES) throw failure();
      for (const entry of page.entries) {
        if (page.version === 2 && entry && typeof entry === 'object' && !Array.isArray(entry)
          && Object.keys(entry).length === 1 && 'ref' in entry) {
          if (!Number.isSafeInteger(entry.ref) || entry.ref < 0 || entry.ref >= journal.entries.length) throw failure();
          journal.pending.push(journal.entries[entry.ref]);
        } else {
          if (!validWorkspaceEntry(entry)) throw failure();
          journal[lane].push(project(entry, lane));
        }
      }
    }
    if (journal[lane].length !== root[lane].count) throw failure();
  }
  return { record: { ...record, value: journal }, root };
}
function wrap(scope: ActiveOwnerLearningScope, entryKey: string, value: unknown, updatedAt: string): OwnerScopedCacheRecord<unknown> {
  return { schemaVersion: 1, ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: scope.resetEpoch,
    entryKey, recordKey: recordKey(scope, entryKey), value, updatedAt };
}
function* split(revision: string, lane: Lane, entries: Iterable<Cell>): Generator<Page> {
  let values: Cell[] = [], size = 0, index = 0;
  for (const entry of entries) {
    const length = byteLength(entry);
    if (values.length && (values.length >= WORKSPACE_PAGE_MAX_ITEMS || size + length > 240 * 1024)) {
      yield { version: lane === 'pending' ? 2 : 1, revision, lane, index: index++, entries: values }; values = []; size = 0;
    }
    values.push(entry); size += length;
  }
  if (values.length) yield { version: lane === 'pending' ? 2 : 1, revision, lane, index, entries: values };
}
function smallLegacyJournal(journal: Journal) {
  if (journal.entries.length + journal.pending.length >= WORKSPACE_PAGED_THRESHOLD) return false;
  let size = 64;
  for (const lane of lanes) for (const entry of journal[lane]) {
    size += byteLength(entry) + 1;
    if (size > WORKSPACE_LEGACY_MAX_BYTES) return false;
  }
  return true;
}
export async function readWorkspaceStorage(scope: ActiveOwnerLearningScope) {
  scope = structuredClone(scope);
  return withLessonResumeTransaction(cacheScope(scope), 'readonly', async store => {
    const record = await request<OwnerScopedCacheRecord<unknown> | undefined>(store.get(recordKey(scope, WORKSPACE_CACHE_KEY)));
    return materialize(scope, store, record, entry => entry);
  });
}
/** Select synchronously while each page is in the same readonly transaction.
 * Only the selected values survive the next page request. Legacy single-record
 * journals still require one full structured clone; this read never migrates.
 * A pending reference reuses the selected entry object, just as the full reader
 * reuses the original entry. The selector is not called again for references.
 * The selector must not return a Promise or perform external side effects. */
export async function projectWorkspaceStorage<T>(scope: ActiveOwnerLearningScope, project: (entry: WorkspaceEntry, lane: Lane) => T): Promise<ProjectedJournal<T>> {
  scope = structuredClone(scope);
  const loaded = await withLessonResumeTransaction(cacheScope(scope), 'readonly', async store => {
    const raw = await request<OwnerScopedCacheRecord<unknown> | undefined>(store.get(recordKey(scope, WORKSPACE_CACHE_KEY)));
    return materialize(scope, store, raw, project);
  });
  if (loaded.root) return loaded.record!.value as ProjectedJournal<T>;
  if (!loaded.record) return { version: 1, entries: [], pending: [] };
  const journal = loaded.record.value as Journal;
  if (journal?.version !== 1 || lanes.some(lane => !Array.isArray(journal[lane]))) throw failure();
  const result: ProjectedJournal<T> = { version: 1, entries: new Array(journal.entries.length), pending: new Array(journal.pending.length) };
  // A legacy clone is unavoidable, but validation/projection must still yield
  // outside the IDB transaction. Preserve Array.every/map sparse-hole behavior.
  for (const lane of lanes) await forEachHistoryBatch(journal[lane].length, index => {
    if (index in journal[lane] && !validWorkspaceEntry(journal[lane][index])) throw failure();
  });
  for (const lane of lanes) await forEachHistoryBatch(journal[lane].length, index => {
    if (index in journal[lane]) result[lane][index] = project(journal[lane][index], lane);
  });
  const active = await readActiveOwnerLearningScope();
  if (!active || active.ownerGeneration.ownerKey !== scope.ownerGeneration.ownerKey
    || active.ownerGeneration.generation !== scope.ownerGeneration.generation || active.resetEpoch !== scope.resetEpoch) throw new StaleOwnerGenerationError();
  return result;
}
/** Legacy data is changed only by a successful normal write. Root, pages, old
 * page removal and pending acknowledgment commit together, or all roll back. */
export async function updateWorkspaceStorage<T extends Journal>(scope: ActiveOwnerLearningScope, update: (value: unknown) => T): Promise<T> {
  scope = structuredClone(scope);
  return withLessonResumeTransaction(cacheScope(scope), 'readwrite', async store => {
    const raw = await request<OwnerScopedCacheRecord<unknown> | undefined>(store.get(recordKey(scope, WORKSPACE_CACHE_KEY)));
    const previous = await materialize(scope, store, raw, entry => entry);
    const journal = update(previous.record?.value);
    if (journal.version !== 1 || lanes.some(lane => !Array.isArray(journal[lane])
      || Object.keys(journal[lane]).length !== journal[lane].length
      || !Object.keys(journal[lane]).every((key, position) => key === String(position)) || !journal[lane].every(validWorkspaceEntry))) throw failure();
    const updatedAt = new Date().toISOString();
    if (!previous.root && smallLegacyJournal(journal)) {
      await request(store.put(wrap(scope, WORKSPACE_CACHE_KEY, journal, updatedAt)));
      return journal;
    }
    const revision = crypto.randomUUID();
    const root: Manifest = { version: 2, storage: 'pages-ref-v1', revision, entries: { count: journal.entries.length, pages: 0 }, pending: { count: journal.pending.length, pages: 0 } };
    const positions = new Map(journal.entries.map((entry, index) => [entry, index]));
    function* pendingCells(): Generator<Cell> {
      for (const entry of journal.pending) {
        const position = positions.get(entry);
        // Pointer identity proves byte-for-byte identity, including undefined,
        // Blob and other structured-clone values. Never infer equality from a
        // key, changeId or lossy JSON comparison; unmatched pending stays inline.
        yield position === undefined ? entry : { ref: position };
      }
    }
    for (const lane of lanes) for (const page of split(revision, lane, lane === 'entries' ? journal.entries : pendingCells())) {
      if (page.index >= MAX_PAGES || byteLength(page) > WORKSPACE_PAGE_MAX_BYTES) throw failure();
      await request(store.put(wrap(scope, pageEntryKey(revision, lane, page.index), page, updatedAt)));
      root[lane].pages++;
    }
    await request(store.put(wrap(scope, WORKSPACE_CACHE_KEY, root, updatedAt)));
    if (previous.root) for (const lane of lanes) for (let index = 0; index < previous.root[lane].pages; index++) {
      await request(store.delete(recordKey(scope, pageEntryKey(previous.root.revision, lane, index))));
    }
    return journal;
  });
}
