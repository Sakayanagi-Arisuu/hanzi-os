import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readOrInitializeOwnerGeneration, readActiveOwnerLearningScope, resetSyncDatabaseForTests, writeLessonResume,
  readLessonResume, openSyncDatabase, LESSON_RESUME_STORE, captureOwnerRecoverySnapshot, writeOwnerCheckpoint, listLessonResumes, transitionOwnerCheckpoint, type ActiveOwnerLearningScope } from './indexedDb';
import { saveWorkspaceChanges, readWorkspace, syncWorkspace } from './workspaceSync';
import { workspaceEntriesWithHistory } from './workspaceHistory';
import { readLocalLearningHistory } from './reviewHistory';
import { WORKSPACE_PAGE_PREFIX, WORKSPACE_PAGE_MAX_BYTES, WORKSPACE_PAGE_MAX_ITEMS } from './workspaceStorageFormat';
import { createOwnerRecoveryArchive, stageOwnerRecoveryArchive } from './ownerRecoveryArchive';
import { type WorkspaceEntry } from './workspaceProtocol';
import { INITIAL_LEARNING_STATE } from '../store/LearningStore';
import { createInitialSyncDocument } from './document';
import { createOwnerDeviceRecoveryArchive } from './ownerDeviceRecovery';
import { prepareOwnerRecovery, beginOwnerRecovery, continueOwnerRecovery, finishOwnerRecovery, rollBackOwnerRecovery } from './ownerRecoveryApply';
import { LEARNING_OWNER_STORAGE_KEY } from '../lib/storageKeys';

let scope: ActiveOwnerLearningScope;
const cacheScope = () => ({ expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: scope.resetEpoch, entryKey: 'workspace-sync:v1' });
const clear = async () => { await resetSyncDatabaseForTests(); await new Promise<void>((resolve, reject) => {
  const r = indexedDB.deleteDatabase('hanzi-os-sync-v1'); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error);
}); };
beforeEach(async () => {
  await clear(); vi.stubGlobal('window', new EventTarget());
  await readOrInitializeOwnerGeneration('anonymous:workspace-pages'); scope = (await readActiveOwnerLearningScope())!;
  await writeOwnerCheckpoint(scope.ownerGeneration.ownerKey, 0,
    createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-10-27T00:00:00Z', 'pages-fixture'), INITIAL_LEARNING_STATE, scope.ownerGeneration);
});
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); await clear(); });
async function dump() {
  const db = await openSyncDatabase(), tx = db.transaction(LESSON_RESUME_STORE, 'readonly');
  return new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
    const r = tx.objectStore(LESSON_RESUME_STORE).getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
  });
}
async function put(row: Record<string, unknown>) {
  const db = await openSyncDatabase(), tx = db.transaction(LESSON_RESUME_STORE, 'readwrite');
  tx.objectStore(LESSON_RESUME_STORE).put(row);
  await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
}
async function legacy() {
  const original: WorkspaceEntry[] = Array.from({ length: 600 }, (_, i) => ({ key: `reader.saved:${i}`,
    value: { word: '书', savedAt: i, contentVersion: 'pages-fixture-v1' }, changedAt: i + 1, changeId: `change-${i}` }));
  const journal = { version: 1 as const, entries: workspaceEntriesWithHistory(original), pending: workspaceEntriesWithHistory(original.slice(0, 400)) };
  await writeLessonResume({ ...cacheScope(), value: journal });
  return journal;
}
const migrate = () => saveWorkspaceChanges(scope, [{ key: 'reader.saved:0', value: { word: '书', savedAt: 0, contentVersion: 'pages-fixture-v1' } }]);
const pageRows = (rows: Array<Record<string, unknown>>) => rows.filter(row => String(row.entryKey).startsWith(WORKSPACE_PAGE_PREFIX));

it('keeps legacy reads read-only, migrates only on a successful write, and preserves complete history and pending', async () => {
  const journal = await legacy(), before = await dump();
  expect(await readWorkspace(scope)).toEqual(journal); expect(await dump()).toEqual(before);
  const history = await readLocalLearningHistory(scope);
  await migrate();
  expect((await readLessonResume(cacheScope()))?.value).toMatchObject({ version: 2, storage: 'pages-ref-v1' });
  expect(await readWorkspace(scope)).toEqual(journal);
  expect(await readLocalLearningHistory(scope)).toEqual(history);
  const rows = await dump(), pages = pageRows(rows);
  expect(pages.length).toBeGreaterThan(2);
  for (const row of pages) {
    const page = row.value as { entries: WorkspaceEntry[] };
    expect(page.entries.length).toBeLessThanOrEqual(WORKSPACE_PAGE_MAX_ITEMS);
    expect(new TextEncoder().encode(JSON.stringify(page)).byteLength).toBeLessThanOrEqual(WORKSPACE_PAGE_MAX_BYTES);
    expect(row.ownerKey).toBe(scope.ownerGeneration.ownerKey); expect(row.resetEpoch).toBe(scope.resetEpoch);
  }
  expect(JSON.stringify((await readLessonResume(cacheScope()))?.value).length).toBeLessThan(512);
  expect(await readWorkspace(scope)).toEqual(journal); expect(await dump()).toEqual(rows);
  expect((await listLessonResumes(scope)).map(row => row.entryKey)).toEqual(['workspace-sync:v1']);
});

it('keeps small journals in the legacy format and fences another generation before any mutation', async () => {
  await saveWorkspaceChanges(scope, [{ key: 'reader.saved:small', value: '小' }]);
  expect((await readLessonResume(cacheScope()))?.value).toMatchObject({ version: 1 });
  expect(pageRows(await dump())).toHaveLength(0);
  const before = await dump();
  await expect(readWorkspace({ ...scope, ownerGeneration: { ...scope.ownerGeneration, generation: 999 } })).rejects.toThrow();
  expect(await dump()).toEqual(before);
});

it('freezes newly submitted values and the write scope before asynchronous IDB work', async () => {
  const input = structuredClone(scope), value = { word: '初' };
  const writing = saveWorkspaceChanges(input, [{ key: 'reader.saved:snapshot', value }]);
  value.word = '改'; input.ownerGeneration.ownerKey = 'anonymous:mutated-input'; input.resetEpoch = 99;
  await writing;
  expect((await readWorkspace(scope)).entries.find(entry => entry.key === 'reader.saved:snapshot')?.value).toEqual({ word: '初' });
});

it('pages wide Unicode payloads before they reach the item threshold, without truncating their content', async () => {
  const word = '字'.repeat(16000);
  await saveWorkspaceChanges(scope, Array.from({ length: 8 }, (_, i) => ({ key: `reader.saved:wide-${i}`, value: { word } })));
  expect((await readLessonResume(cacheScope()))?.value).toMatchObject({ version: 2 });
  const read = await readWorkspace(scope);
  expect(read.entries.filter(entry => entry.key.startsWith('reader.saved:wide-'))).toHaveLength(8);
  expect((read.entries.find(entry => entry.key === 'reader.saved:wide-0')!.value as { word: string }).word).toBe(word);
});

it('rolls back a partial migration on quota failure and retries without changing legacy IDs', async () => {
  const journal = await legacy(), before = await dump();
  const original = IDBObjectStore.prototype.put; let pages = 0;
  const spy = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, value, key?) {
    if (String(value.entryKey).startsWith(WORKSPACE_PAGE_PREFIX) && ++pages === 2) throw new DOMException('Fixture quota', 'QuotaExceededError');
    return key === undefined ? original.call(this, value) : original.call(this, value, key);
  });
  await expect(migrate()).rejects.toThrow('Fixture quota');
  expect(await dump()).toEqual(before);
  spy.mockRestore(); await migrate(); expect(await readWorkspace(scope)).toEqual(journal);
});

it('does not clone internal pages again when aggregating local history', async () => {
  await legacy(); await migrate(); const pages = pageRows(await dump()).length;
  const get = vi.spyOn(IDBObjectStore.prototype, 'get');
  expect(await readLocalLearningHistory(scope)).toHaveLength(600);
  expect(get.mock.calls.filter(([key]) => typeof key === 'string' && key.includes(WORKSPACE_PAGE_PREFIX))).toHaveLength(pages);
});

it('references only identical objects and retains a different pending payload even with the same key and changeId', async () => {
  const journal = await legacy();
  const source = journal.entries.find(entry => entry.key === 'reader.saved:0')!;
  journal.pending[0] = { ...source, value: { raw: undefined, stale: true } };
  await writeLessonResume({ ...cacheScope(), value: journal });
  await migrate(); const read = await readWorkspace(scope);
  expect(read).toEqual(journal);
  expect(read.pending.find(entry => entry.key === source.key)!.value).toEqual({ raw: undefined, stale: true });
  expect(read.pending.find(entry => entry.key === source.key)).not.toBe(read.entries.find(entry => entry.key === source.key));
  const matching = read.pending.find(entry => entry.key === 'reader.saved:1');
  expect(matching).toBe(read.entries.find(entry => entry.key === 'reader.saved:1'));
});

it('reads the earlier full-pending page encoding and rewrites it without losing any pending values', async () => {
  const journal = await legacy(); await migrate();
  const rows = await dump(), root = rows.find(row => row.entryKey === 'workspace-sync:v1')!;
  (root.value as { storage: string }).storage = 'pages-v1';
  for (const row of pageRows(rows)) {
    const page = row.value as { version: number; lane: string; entries: Array<WorkspaceEntry | { ref: number }> };
    if (page.lane === 'pending') {
      page.version = 1;
      page.entries = page.entries.map(entry => 'ref' in entry ? journal.entries[entry.ref] : entry);
      await put(row);
    }
  }
  await put(root); expect(await readWorkspace(scope)).toEqual(journal);
  await migrate(); expect(await readWorkspace(scope)).toEqual(journal);
});

it.each([-1, 0.5, 999999, 'wrong'])('rejects invalid pending references without changing source pages: %s', async ref => {
  await legacy(); await migrate();
  const page = pageRows(await dump()).find(row => (row.value as { lane: string }).lane === 'pending')!;
  const value = page.value as { entries: unknown[] }; value.entries[0] = { ref };
  await put(page); const before = await dump();
  await expect(readWorkspace(scope)).rejects.toThrow('giữ dữ liệu');
  await expect(migrate()).rejects.toThrow('giữ dữ liệu');
  expect(await dump()).toEqual(before);
});

it('preserves explicit undefined and binary values and rejects an oversized binary page without replacing legacy data', async () => {
  const journal = await legacy();
  const entry = journal.entries.find(entry => entry.key === 'reader.saved:0')!;
  entry.value = { word: '书', raw: undefined, attachment: new Blob(['binary-retain']) };
  await writeLessonResume({ ...cacheScope(), value: journal });
  await saveWorkspaceChanges(scope, [{ key: entry.key, value: entry.value }]);
  const read = (await readWorkspace(scope)).entries.find(row => row.key === entry.key)!.value as { raw?: unknown; attachment: Blob };
  expect(Object.hasOwn(read, 'raw')).toBe(true); expect(read.raw).toBeUndefined(); expect(await read.attachment.text()).toBe('binary-retain');
  entry.value = { attachment: new Blob(['x'.repeat(WORKSPACE_PAGE_MAX_BYTES + 1)]) };
  await writeLessonResume({ ...cacheScope(), value: journal }); const before = await dump();
  await expect(saveWorkspaceChanges(scope, [{ key: entry.key, value: entry.value }])).rejects.toThrow('giữ dữ liệu');
  expect(await dump()).toEqual(before);
});

it('counts the complete backing buffer of a small typed view before migrating legacy data', async () => {
  const journal = await legacy();
  const entry = journal.entries.find(entry => entry.key === 'reader.saved:0')!;
  entry.value = { view: new Uint8Array(new ArrayBuffer(WORKSPACE_PAGE_MAX_BYTES + 1), 0, 1) };
  await writeLessonResume({ ...cacheScope(), value: journal }); const before = await dump();
  await expect(saveWorkspaceChanges(scope, [{ key: entry.key, value: entry.value }])).rejects.toThrow('giữ dữ liệu');
  expect(await dump()).toEqual(before);
  const retained = (await readWorkspace(scope)).entries.find(row => row.key === entry.key)!.value as { view: Uint8Array };
  expect(retained.view.buffer.byteLength).toBe(WORKSPACE_PAGE_MAX_BYTES + 1);
});

it('replaces only the prior referenced pages and retains unrelated drafts and orphan forensic rows', async () => {
  await legacy(); await migrate();
  const rows = await dump(), oldKeys = pageRows(rows).map(row => row.recordKey);
  const orphan = { ...pageRows(rows)[0], entryKey: WORKSPACE_PAGE_PREFIX + '\uffff-forensic-orphan',
    recordKey: JSON.stringify([scope.ownerGeneration.ownerKey, scope.resetEpoch, WORKSPACE_PAGE_PREFIX + '\uffff-forensic-orphan']) };
  await put(orphan);
  await writeLessonResume({ ...cacheScope(), entryKey: 'unrelated-draft', value: { raw: 'keep' } });
  await saveWorkspaceChanges(scope, [{ key: 'reader.saved:new', value: '新' }]);
  const next = await dump();
  expect(next).toContainEqual(orphan);
  expect(next.some(row => oldKeys.includes(row.recordKey))).toBe(false);
  expect((await readLessonResume({ ...cacheScope(), entryKey: 'unrelated-draft' }))?.value).toEqual({ raw: 'keep' });
  expect((await readWorkspace(scope)).pending.some(entry => entry.key === 'reader.saved:new')).toBe(true);
});

it.each(['owner', 'epoch', 'revision', 'index', 'missing', 'payload'])('retains all rows when a referenced page is malformed: %s', async kind => {
  await legacy(); await migrate();
  const page = pageRows(await dump())[0];
  const originalKey = page.recordKey as string;
  const value = { ...(page.value as Record<string, unknown>) };
  if (kind === 'owner') page.ownerKey = 'account:other';
  if (kind === 'epoch') page.resetEpoch = 1;
  if (kind === 'revision') value.revision = 'unknown';
  if (kind === 'index') value.index = 99;
  if (kind === 'payload') value.entries = [{ malformed: true }];
  if (kind === 'missing') page.recordKey = JSON.stringify([scope.ownerGeneration.ownerKey, 0, 'moved-fixture']);
  page.value = value;
  if (kind === 'missing') {
    const db = await openSyncDatabase(), tx = db.transaction(LESSON_RESUME_STORE, 'readwrite');
    tx.objectStore(LESSON_RESUME_STORE).delete(originalKey);
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
  }
  await put(page); const before = await dump();
  await expect(readWorkspace(scope)).rejects.toThrow('giữ dữ liệu');
  await expect(migrate()).rejects.toThrow('giữ dữ liệu');
  expect(await dump()).toEqual(before);
});

it('retains pages, pending and acknowledgment when a page changes while the request is in flight', async () => {
  await legacy(); await migrate(); let retained: Array<Record<string, unknown>> = [];
  const send = vi.fn<typeof fetch>(async (_url, init) => {
    const page = pageRows(await dump())[0]; page.ownerKey = 'account:other'; await put(page); retained = await dump();
    return Response.json({ version: 1, resetEpoch: scope.resetEpoch, entries: JSON.parse(init!.body as string).entries });
  });
  await expect(syncWorkspace(scope, new AbortController().signal, send)).rejects.toThrow('giữ dữ liệu');
  expect(await dump()).toEqual(retained); expect(send).toHaveBeenCalledTimes(1);
});

it('includes every page and unchanged metadata in the existing owner recovery codec', async () => {
  await legacy(); await migrate(); const snapshot = await captureOwnerRecoverySnapshot(scope);
  const binding = { installationId: 'pages-fixture', deviceId: 'pages-device' };
  const source = await createOwnerRecoveryArchive(snapshot, binding);
  expect((await stageOwnerRecoveryArchive(source, scope, binding)).snapshot).toEqual(snapshot);
  expect((await dump()).length).toBe(snapshot.stores['lesson-resumes'].length);
});

it('keeps account pending until exact acknowledgment and sends the existing flat protocol rather than internal page records', async () => {
  await transitionOwnerCheckpoint(scope.ownerGeneration, 'account:workspace-pages-account', 0,
    createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-10-27T01:00:00Z', 'account-pages'), INITIAL_LEARNING_STATE);
  scope = (await readActiveOwnerLearningScope())!;
  await legacy(); await migrate(); const before = await readWorkspace(scope);
  const acknowledged = new Set<string>();
  const send = vi.fn<typeof fetch>(async (_url, init) => {
    const body = JSON.parse(init!.body as string);
    expect(body.version).toBe(1); expect(body.resetEpoch).toBe(0);
    expect(body.entries).toHaveLength(100);
    expect(body.entries.every((entry: WorkspaceEntry) => !entry.key.startsWith(WORKSPACE_PAGE_PREFIX))).toBe(true);
    for (const entry of body.entries) acknowledged.add(entry.changeId);
    return Response.json(body);
  });
  await syncWorkspace(scope, new AbortController().signal, send);
  const after = await readWorkspace(scope);
  expect(after.pending).toEqual(before.pending.filter(entry => !acknowledged.has(entry.changeId)));
  expect(after.pending.length).toBeGreaterThan(0);
  expect(new Map(after.entries.map(entry => [entry.key, entry]))).toEqual(new Map(before.entries.map(entry => [entry.key, entry])));
});

it.each([false, true])('restores legacy snapshots and can roll back to all paged data: rollback=%s', async rollback => {
  const oldJournal = await legacy();
  const values = new Map([[LEARNING_OWNER_STORAGE_KEY, scope.ownerGeneration.ownerKey]]);
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  const binding = { installationId: 'pages-restore', deviceId: 'pages-device' };
  const archive = await createOwnerDeviceRecoveryArchive(scope, binding, storage);
  await migrate(); await saveWorkspaceChanges(scope, [{ key: 'reader.saved:new', value: '新' }]);
  const currentJournal = await readWorkspace(scope);
  const preview = await prepareOwnerRecovery(archive, scope, binding, storage);
  await beginOwnerRecovery(archive, scope, binding, preview.digest, storage);
  await continueOwnerRecovery(storage); await continueOwnerRecovery(storage);
  if (rollback) { await rollBackOwnerRecovery(); await continueOwnerRecovery(storage); await continueOwnerRecovery(storage); }
  await finishOwnerRecovery(storage);
  const active = (await readActiveOwnerLearningScope())!;
  expect(await readWorkspace(active)).toEqual(rollback ? currentJournal : oldJournal);
  expect(pageRows(await dump()).length > 0).toBe(rollback);
  await expect(readWorkspace(scope)).rejects.toThrow();
});
