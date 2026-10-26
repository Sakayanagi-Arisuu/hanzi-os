import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { beginOwnerRecovery, continueOwnerRecovery, finishOwnerRecovery, prepareOwnerRecovery, readPendingOwnerRecovery, rollBackOwnerRecovery } from './ownerRecoveryApply';
import { openOwnerRecoveryPreview, cancelOwnerRecoveryPreview, readOwnerRecoveryStatus } from './ownerRecoveryApply';
import { createOwnerDeviceRecoveryArchive } from './ownerDeviceRecovery';
import { captureOwnerRecoverySnapshot, readActiveOwnerLearningScope, readLessonResume, readOrInitializeOwnerGeneration,
  resetSyncDatabaseForTests, writeLessonResume, writeOwnerCheckpoint, writeSyncMeta, readSyncMeta, type ActiveOwnerLearningScope } from './indexedDb';
import { deleteOwnerData, openSyncDatabase, OWNER_RECOVERY_STORES, readOwnerDocument, listPendingOperations } from './indexedDb';
import { ownerRecoveryResourceIntegrity } from './ownerRecoveryArchive';
import { createInitialSyncDocument } from './document';
import { INITIAL_LEARNING_STATE } from '../store/LearningStore';
import { LEARNING_OWNER_STORAGE_KEY, getCharacterForgeSessionStorageKey } from '../lib/storageKeys';
import { saveGuestAvatar } from '../profile/avatarStorage';
import { readerProgressStorageKey } from '../reader/library/readerProgressStorage';
import { executeCodecTask, type CodecArgs, type CodecTask } from './ownerRecoveryCodecTask';

const binding = { installationId: 'recovery-apply', deviceId: 'recovery-device' };
let scope: ActiveOwnerLearningScope;
let values: Map<string, string>;
const storage = { getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
const clear = async () => { await resetSyncDatabaseForTests(); await new Promise<void>((resolve, reject) => {
  const req = indexedDB.deleteDatabase('hanzi-os-sync-v1'); req.onsuccess = () => resolve(); req.onerror = () => reject(req.error);
}); };
const write = (value: unknown, entryKey = 'journal') => writeLessonResume({ expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: scope.resetEpoch, entryKey, value });
const read = async (current: ActiveOwnerLearningScope, entryKey = 'journal') => (await readLessonResume({ expectedOwnerGeneration: current.ownerGeneration, resetEpoch: current.resetEpoch, entryKey }))?.value;
beforeEach(async () => {
  await clear(); vi.stubGlobal('window', new EventTarget());
  await readOrInitializeOwnerGeneration('anonymous:recovery-apply'); scope = (await readActiveOwnerLearningScope())!;
  const state = structuredClone(INITIAL_LEARNING_STATE);
  await writeOwnerCheckpoint(scope.ownerGeneration.ownerKey, 0, createInitialSyncDocument(state, '2026-10-23T00:00:00Z', 'init'), state, scope.ownerGeneration);
  values = new Map([[LEARNING_OWNER_STORAGE_KEY, scope.ownerGeneration.ownerKey], ['secret', 'retain']]);
});
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); await clear(); });

async function prepared() {
  await write({ version: 99, raw: 'archived-journal' });
  values.set(getCharacterForgeSessionStorageKey(scope.ownerGeneration.ownerKey), '{raw-archive');
  await saveGuestAvatar(scope.ownerGeneration, 0, new Blob(['archived'], { type: 'image/webp' }));
  const source = await createOwnerDeviceRecoveryArchive(scope, binding, storage);
  await write({ version: 99, raw: 'current-journal' });
  values.set(getCharacterForgeSessionStorageKey(scope.ownerGeneration.ownerKey), '{raw-current');
  await saveGuestAvatar(scope.ownerGeneration, 1, new Blob(['current'], { type: 'image/webp' }));
  const preview = await prepareOwnerRecovery(source, scope, binding, storage);
  return { source, preview };
}

it('applies and rolls back with codec replies arriving in later Worker event tasks', async () => {
  const { source, preview } = await prepared();
  let replies = 0;
  vi.stubGlobal('Worker', class DelayedCodecWorker {
    onmessage: ((event: MessageEvent) => void) | null = null;
    timer: ReturnType<typeof setTimeout> | null = null;
    terminate() { if (this.timer !== null) clearTimeout(this.timer); }
    postMessage(request: { version: number; id: string; task: CodecTask; args: CodecArgs<CodecTask> }) {
      const args = structuredClone(request.args);
      this.timer = setTimeout(async () => {
        try {
          const result = await executeCodecTask(request.task, args);
          replies++;
          this.onmessage?.({ data: { ...request, ok: true, result } } as MessageEvent);
        } catch (error) {
          this.onmessage?.({ data: { ...request, ok: false, error: (error as Error).message } } as MessageEvent);
        }
      }, 1);
    }
  });
  await beginOwnerRecovery(source, scope, binding, preview.digest, storage);
  expect((await readPendingOwnerRecovery())?.phase).toBe('applying-local');
  await continueOwnerRecovery(storage);
  await rollBackOwnerRecovery();
  await continueOwnerRecovery(storage);
  await finishOwnerRecovery(storage);
  const active = (await readActiveOwnerLearningScope())!;
  expect(active.ownerGeneration.generation).toBe(scope.ownerGeneration.generation + 1);
  expect(await read(active)).toEqual({ version: 99, raw: 'current-journal' });
  expect(await ((await captureOwnerRecoverySnapshot(active)).avatar as { value: { blob: Blob } }).value.blob.text()).toBe('current');
  expect(await readPendingOwnerRecovery()).toBeNull();
  expect(replies).toBeGreaterThan(20);
});

it('atomically keeps a preimage, restores raw journals/avatar, resumes local writes and fences stale tabs', async () => {
  const { source, preview } = await prepared();
  await writeSyncMeta('deviceSequence', 900);
  await beginOwnerRecovery(source, scope, binding, preview.digest, storage);
  const job = (await readPendingOwnerRecovery())!;
  expect(job.phase).toBe('applying-local');
  expect(job.before.snapshot.stores['lesson-resumes'][0]).toMatchObject({ value: { raw: 'current-journal' } });
  await expect(readActiveOwnerLearningScope()).rejects.toThrow('recovery');
  await expect(write('stale-tab')).rejects.toThrow();
  await expect(saveGuestAvatar(scope.ownerGeneration, 0, new Blob(['stale'], { type: 'image/webp' }))).rejects.toThrow();
  await continueOwnerRecovery(storage); await continueOwnerRecovery(storage);
  expect((await readPendingOwnerRecovery())?.phase).toBe('awaiting-confirmation');
  await finishOwnerRecovery(storage);
  const active = (await readActiveOwnerLearningScope())!;
  expect(active.ownerGeneration.generation).toBe(scope.ownerGeneration.generation + 1);
  expect(await read(active)).toEqual({ version: 99, raw: 'archived-journal' });
  expect(values.get(getCharacterForgeSessionStorageKey(scope.ownerGeneration.ownerKey))).toBe('{raw-archive');
  expect(await ((await captureOwnerRecoverySnapshot(active)).avatar as { value: { blob: Blob } }).value.blob.text()).toBe('archived');
  expect(await readSyncMeta('deviceSequence')).toBe(900);
  expect(values.get('secret')).toBe('retain');
  await expect(write('old-tab-after-finish')).rejects.toThrow();
  expect(await readPendingOwnerRecovery()).toBeNull();
});

it('retains partial local writes across a crash, retries and rolls back to the durable preimage', async () => {
  const { source, preview } = await prepared();
  await beginOwnerRecovery(source, scope, binding, preview.digest, storage);
  let writes = 0;
  const failed = { ...storage, removeItem: (key: string) => { if (++writes === 3) throw Error('quota'); storage.removeItem(key); } };
  await expect(continueOwnerRecovery(failed)).rejects.toThrow('quota');
  await resetSyncDatabaseForTests();
  expect((await readPendingOwnerRecovery())?.phase).toBe('applying-local');
  await continueOwnerRecovery(storage);
  await rollBackOwnerRecovery(); await rollBackOwnerRecovery();
  await continueOwnerRecovery(storage); await finishOwnerRecovery(storage);
  const active = (await readActiveOwnerLearningScope())!;
  expect(await read(active)).toEqual({ version: 99, raw: 'current-journal' });
  expect(values.get(getCharacterForgeSessionStorageKey(scope.ownerGeneration.ownerKey))).toBe('{raw-current');
  expect(await ((await captureOwnerRecoverySnapshot(active)).avatar as { value: { blob: Blob } }).value.blob.text()).toBe('current');
});

it('rejects a stale preview or failed preimage write without changing any live store', async () => {
  const { source, preview } = await prepared();
  await write('newer');
  await expect(beginOwnerRecovery(source, scope, binding, preview.digest, storage)).rejects.toThrow('stale');
  const fresh = await prepareOwnerRecovery(source, scope, binding, storage);
  const original = IDBObjectStore.prototype.put;
  vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function(this: IDBObjectStore, value, key) {
    if (this.name === 'meta' && String(value.key).startsWith('owner-recovery-job:')) throw Error('quota preimage');
    return key === undefined ? original.call(this, value) : original.call(this, value, key);
  });
  await expect(beginOwnerRecovery(source, scope, binding, fresh.digest, storage)).rejects.toThrow('quota preimage');
  expect(await read(scope)).toBe('newer'); expect(await readPendingOwnerRecovery()).toBeNull();
});

it('preserves newer local conflicts and keeps the bootstrap fence until resolved', async () => {
  const { source, preview } = await prepared();
  await beginOwnerRecovery(source, scope, binding, preview.digest, storage);
  const key = getCharacterForgeSessionStorageKey(scope.ownerGeneration.ownerKey);
  values.set(key, 'newer-other-tab');
  await expect(continueOwnerRecovery(storage)).rejects.toThrow('Newer local');
  await expect(finishOwnerRecovery(storage)).rejects.toThrow();
  expect(values.get(key)).toBe('newer-other-tab'); expect(await readPendingOwnerRecovery()).not.toBeNull();
});

it('moves known Reader documents to the new generation and preserves the old raw key', async () => {
  const oldKey = readerProgressStorageKey({ ownerKey: scope.ownerGeneration.ownerKey, ownerGeneration: scope.ownerGeneration.generation, resetEpoch: 0 });
  const raw = JSON.stringify({ schemaVersion: 2, ownerKey: scope.ownerGeneration.ownerKey, ownerGeneration: scope.ownerGeneration.generation, resetEpoch: 0, chapters: { raw: 'keep' }, extra: 'retain' });
  values.set(oldKey, raw);
  const { source, preview } = await prepared();
  await beginOwnerRecovery(source, scope, binding, preview.digest, storage); await continueOwnerRecovery(storage); await finishOwnerRecovery(storage);
  const current = (await readActiveOwnerLearningScope())!;
  const newKey = readerProgressStorageKey({ ownerKey: current.ownerGeneration.ownerKey, ownerGeneration: current.ownerGeneration.generation, resetEpoch: 0 });
  expect(JSON.parse(values.get(newKey)!)).toEqual({ ...JSON.parse(raw), ownerGeneration: current.ownerGeneration.generation });
  expect(values.get(oldKey)).toBe(raw);
});

it('refuses account/unknown reader/profile or opt-in changes without writing', async () => {
  const { source } = await prepared();
  await expect(prepareOwnerRecovery(source, { ...scope, ownerGeneration: { ownerKey: 'account:other', generation: 1 } }, binding, storage)).rejects.toThrow('Account');
  const state = structuredClone(INITIAL_LEARNING_STATE); state.profile.name = 'changed';
  await writeOwnerCheckpoint(scope.ownerGeneration.ownerKey, 0, createInitialSyncDocument(state, '2026-10-23T01:00:00Z', 'changed'), state, scope.ownerGeneration);
  await expect(prepareOwnerRecovery(source, scope, binding, storage)).rejects.toThrow('Profile or consent');
  expect(await readPendingOwnerRecovery()).toBeNull();
});

it('rejects unsigned v1 and unknown Reader data before creating a recovery job', async () => {
  const { source } = await prepared();
  const legacy = JSON.parse(source); legacy.version = 1; delete legacy.seal;
  await expect(prepareOwnerRecovery(JSON.stringify(legacy), scope, binding, storage)).rejects.toThrow('inspect-only');
  const key = readerProgressStorageKey({ ownerKey: scope.ownerGeneration.ownerKey, ownerGeneration: scope.ownerGeneration.generation, resetEpoch: 0 });
  values.set(key, '{unknown-raw-reader');
  const unknown = await createOwnerDeviceRecoveryArchive(scope, binding, storage);
  await expect(prepareOwnerRecovery(unknown, scope, binding, storage)).rejects.toThrow();
  expect(values.get(key)).toBe('{unknown-raw-reader'); expect(await readPendingOwnerRecovery()).toBeNull();
});

it('deletes only this owner retained preimage and blocks deletion during recovery', async () => {
  const { source, preview } = await prepared();
  await writeSyncMeta('owner-recovery-job:v1:other', { scope: { ownerGeneration: { ownerKey: 'anonymous:other', generation: 1 }, resetEpoch: 0 } });
  await beginOwnerRecovery(source, scope, binding, preview.digest, storage);
  const job = (await readPendingOwnerRecovery())!;
  await expect(deleteOwnerData(scope.ownerGeneration.ownerKey)).rejects.toThrow('recovery');
  await continueOwnerRecovery(storage); await finishOwnerRecovery(storage);
  expect(await readSyncMeta(`owner-recovery-job:v1:${job.id}`)).not.toBeNull();
  await deleteOwnerData(scope.ownerGeneration.ownerKey);
  expect(await readSyncMeta(`owner-recovery-job:v1:${job.id}`)).toBeNull();
  expect(await readSyncMeta('owner-recovery-job:v1:other')).not.toBeNull();
});

it('rejects a row key collision without overwriting another owner', async () => {
  const db = await openSyncDatabase();
  const raw = async (ownerKey: string) => {
    const tx = db.transaction('lesson-resumes', 'readwrite');
    tx.objectStore('lesson-resumes').put({ recordKey: 'collision', ownerKey, value: { raw: ownerKey } });
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error); });
  };
  await raw(scope.ownerGeneration.ownerKey);
  const source = await createOwnerDeviceRecoveryArchive(scope, binding, storage);
  await raw('anonymous:other');
  const preview = await prepareOwnerRecovery(source, scope, binding, storage);
  await expect(beginOwnerRecovery(source, scope, binding, preview.digest, storage)).rejects.toThrow('another owner');
  const tx = db.transaction('lesson-resumes', 'readonly');
  const row = await new Promise<{ ownerKey: string }>(resolve => { const req = tx.objectStore('lesson-resumes').get('collision'); req.onsuccess = () => resolve(req.result); });
  expect(row.ownerKey).toBe('anonymous:other'); expect(await readPendingOwnerRecovery()).toBeNull();
});

it('retains a corrupted durable job and refuses to clear its recovery fence', async () => {
  const { source, preview } = await prepared();
  await beginOwnerRecovery(source, scope, binding, preview.digest, storage);
  const job = (await readPendingOwnerRecovery())!;
  job.before.local[0].value = 'corrupted';
  await writeSyncMeta(`owner-recovery-job:v1:${job.id}`, job);
  expect(Object.keys((await readOwnerRecoveryStatus()).job!).sort()).toEqual(['id', 'phase']);
  await expect(readActiveOwnerLearningScope()).rejects.toThrow('recovery');
  await expect(readPendingOwnerRecovery()).rejects.toThrow('integrity');
  await expect(finishOwnerRecovery(storage)).rejects.toThrow('integrity');
  expect(await readSyncMeta('activeOwnerRecovery:v1')).not.toBeNull();
});

it('rolls back before any local write and safely moves Reader preimage to the new generation', async () => {
  const key = readerProgressStorageKey({ ownerKey: scope.ownerGeneration.ownerKey, ownerGeneration: scope.ownerGeneration.generation, resetEpoch: 0 });
  values.set(key, JSON.stringify({ schemaVersion: 2, ownerKey: scope.ownerGeneration.ownerKey, ownerGeneration: scope.ownerGeneration.generation, resetEpoch: 0, chapters: {} }));
  const { source, preview } = await prepared();
  await beginOwnerRecovery(source, scope, binding, preview.digest, storage);
  await rollBackOwnerRecovery(); await continueOwnerRecovery(storage); await finishOwnerRecovery(storage);
  expect(await read((await readActiveOwnerLearningScope())!)).toEqual({ version: 99, raw: 'current-journal' });
});

it('binds the preview to the selected archive as well as the unchanged live preimage', async () => {
  await write('archive A'); const a = await createOwnerDeviceRecoveryArchive(scope, binding, storage);
  await write('archive B'); const b = await createOwnerDeviceRecoveryArchive(scope, binding, storage);
  await write('live C'); const preview = await prepareOwnerRecovery(a, scope, binding, storage);
  await expect(beginOwnerRecovery(b, scope, binding, preview.digest, storage)).rejects.toThrow('preview is stale');
  expect(await read(scope)).toBe('live C'); expect(await readPendingOwnerRecovery()).toBeNull();
});

it('keeps the current Lamport head when restoring older progress without rewriting pending payloads', async () => {
  await write({ version: 99, raw: 'archived-journal' });
  const current = (await readOwnerDocument(scope.ownerGeneration.ownerKey))!;
  const originalPending = { ownerKey: scope.ownerGeneration.ownerKey, operationId: 'synthetic:clock-old',
    document: structuredClone(current.document), deviceSequence: 1, quarantinedAt: null, requestHash: 'retain-original-hash' };
  const db = await openSyncDatabase(), tx = db.transaction('outbox', 'readwrite');
  tx.objectStore('outbox').put(originalPending);
  await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error); });
  const source = await createOwnerDeviceRecoveryArchive(scope, binding, storage);
  current.document.clock = { counter: 900, operationId: 'current-head', observedAt: '2026-10-23T02:00:00Z' };
  await writeOwnerCheckpoint(scope.ownerGeneration.ownerKey, current.revision, current.document,
    structuredClone(INITIAL_LEARNING_STATE), scope.ownerGeneration);
  const preview = await prepareOwnerRecovery(source, scope, binding, storage);
  await beginOwnerRecovery(source, scope, binding, preview.digest, storage);
  expect((await readPendingOwnerRecovery())?.after.originalHeadClock?.counter).toBeLessThan(900);
  await continueOwnerRecovery(storage); await finishOwnerRecovery(storage);
  expect((await readOwnerDocument(scope.ownerGeneration.ownerKey))?.document.clock).toEqual(current.document.clock);
  expect(await listPendingOperations(scope.ownerGeneration.ownerKey)).toEqual([originalPending]);
  expect(await read((await readActiveOwnerLearningScope())!)).toEqual({ version: 99, raw: 'archived-journal' });
});

it('round-trips all seven stores, retaining original pending payloads and first answers without network calls', async () => {
  const db = await openSyncDatabase(), ownerKey = scope.ownerGeneration.ownerKey;
  const state = structuredClone(INITIAL_LEARNING_STATE), document = createInitialSyncDocument(state, '2026-10-23T00:00:00Z', 'init');
  const seed = async (raw: string) => {
    const tx = db.transaction([...OWNER_RECOVERY_STORES], 'readwrite');
    for (const name of OWNER_RECOVERY_STORES) {
      const store = tx.objectStore(name);
      if (name === 'documents') store.put({ ownerKey, document, revision: 0, raw });
      else if (name === 'local-states') store.put({ ownerKey, state, raw });
      else if (name === 'outbox') store.put({ ownerKey, operationId: 'synthetic:pending', document, raw });
      else store.put({ ownerKey, recordKey: `synthetic:${name}`, resetEpoch: 0, entryKey: 'synthetic:opaque',
        value: { version: 99, firstAnswer: 'wrong', pending: true, raw } });
    }
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error); });
  };
  await seed('archived');
  const original = await captureOwnerRecoverySnapshot(scope), source = await createOwnerDeviceRecoveryArchive(scope, binding, storage);
  await seed('current');
  const preview = await prepareOwnerRecovery(source, scope, binding, storage), network = vi.spyOn(globalThis, 'fetch');
  await beginOwnerRecovery(source, scope, binding, preview.digest, storage);
  await continueOwnerRecovery(storage); await finishOwnerRecovery(storage);
  const restored = await captureOwnerRecoverySnapshot((await readActiveOwnerLearningScope())!);
  expect((await ownerRecoveryResourceIntegrity(restored.stores)).sha256).toBe((await ownerRecoveryResourceIntegrity(original.stores)).sha256);
  expect(OWNER_RECOVERY_STORES.every(name => restored.stores[name].length === 1)).toBe(true);
  expect(network).not.toHaveBeenCalled();
});

it('durably pauses writers before preparing a large snapshot and atomically turns that pause into recovery', async () => {
  const { source } = await prepared();
  await openOwnerRecoveryPreview(source, scope, binding);
  const first = await readOwnerRecoveryStatus();
  expect(first.job).toBeNull(); expect(first.preview?.source).toBe(source);
  await expect(readActiveOwnerLearningScope()).rejects.toThrow('recovery');
  await expect(read(scope)).rejects.toThrow('recovery');
  expect(await readActiveOwnerLearningScope({ allowRecoveryPreview: true })).toEqual(scope);
  expect((await captureOwnerRecoverySnapshot(scope)).stores['lesson-resumes']).toEqual(expect.arrayContaining([
    expect.objectContaining({ value: { version: 99, raw: 'current-journal' } }),
  ]));
  await expect(write('old-tab-write')).rejects.toThrow('recovery');
  await expect(readOrInitializeOwnerGeneration(scope.ownerGeneration.ownerKey)).rejects.toThrow('recovery');
  await expect(deleteOwnerData(scope.ownerGeneration.ownerKey)).rejects.toThrow('recovery');
  await resetSyncDatabaseForTests();
  const paused = (await readOwnerRecoveryStatus()).preview!;
  const preview = await prepareOwnerRecovery(paused.source, paused.scope, paused.binding, storage);
  await expect(beginOwnerRecovery(source, scope, binding, preview.digest, storage, 'wrong-preview')).rejects.toThrow('preview changed');
  expect((await readOwnerRecoveryStatus()).preview?.id).toBe(paused.id);
  await beginOwnerRecovery(source, scope, binding, preview.digest, storage, paused.id);
  const applied = await readOwnerRecoveryStatus();
  expect(applied.preview).toBeNull(); expect(applied.job?.phase).toBe('applying-local');
  await continueOwnerRecovery(storage); await finishOwnerRecovery(storage);
  expect(await read((await readActiveOwnerLearningScope())!)).toEqual({ version: 99, raw: 'archived-journal' });
});

it('cancels a preview after reload without changing any learning data, localStorage or generation', async () => {
  const { source } = await prepared(), before = await captureOwnerRecoverySnapshot(scope), local = new Map(values);
  await openOwnerRecoveryPreview(source, scope, binding); await resetSyncDatabaseForTests();
  await cancelOwnerRecoveryPreview();
  expect(await readOwnerRecoveryStatus()).toEqual({ job: null, preview: null });
  expect(await readActiveOwnerLearningScope()).toEqual(scope);
  expect((await ownerRecoveryResourceIntegrity((await captureOwnerRecoverySnapshot(scope)).stores)).sha256)
    .toBe((await ownerRecoveryResourceIntegrity(before.stores)).sha256);
  expect(values).toEqual(local);
  await write('normal-after-cancel'); expect(await read(scope)).toBe('normal-after-cancel');
});

it('keeps the preview pause and original stores if the atomic preimage write fails', async () => {
  const { source } = await prepared(); await openOwnerRecoveryPreview(source, scope, binding);
  const paused = (await readOwnerRecoveryStatus()).preview!;
  const preview = await prepareOwnerRecovery(source, scope, binding, storage);
  const original = IDBObjectStore.prototype.put;
  const failure = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function(this: IDBObjectStore, value, key) {
    if (this.name === 'meta' && String(value.key).startsWith('owner-recovery-job:')) throw Error('quota preimage');
    return key === undefined ? original.call(this, value) : original.call(this, value, key);
  });
  await expect(beginOwnerRecovery(source, scope, binding, preview.digest, storage, paused.id)).rejects.toThrow('quota preimage');
  failure.mockRestore();
  expect((await readOwnerRecoveryStatus()).preview?.id).toBe(paused.id);
  expect(await readPendingOwnerRecovery()).toBeNull();
  expect((await captureOwnerRecoverySnapshot(scope)).stores['lesson-resumes']).toEqual(expect.arrayContaining([
    expect.objectContaining({ value: { version: 99, raw: 'current-journal' } }),
  ]));
  await expect(readActiveOwnerLearningScope()).rejects.toThrow('recovery');
  await cancelOwnerRecoveryPreview();
});

it('retains newer local data when an old tab writes during preview, allowing a fresh review', async () => {
  const { source } = await prepared(); await openOwnerRecoveryPreview(source, scope, binding);
  const paused = (await readOwnerRecoveryStatus()).preview!, preview = await prepareOwnerRecovery(source, scope, binding, storage);
  const key = getCharacterForgeSessionStorageKey(scope.ownerGeneration.ownerKey); values.set(key, 'newer-raw');
  await expect(beginOwnerRecovery(source, scope, binding, preview.digest, storage, paused.id)).rejects.toThrow('stale');
  expect(values.get(key)).toBe('newer-raw'); expect((await readOwnerRecoveryStatus()).preview?.id).toBe(paused.id);
  await cancelOwnerRecoveryPreview(); expect(values.get(key)).toBe('newer-raw');
});
