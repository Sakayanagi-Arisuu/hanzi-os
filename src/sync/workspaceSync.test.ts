import 'fake-indexeddb/auto';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { readOrInitializeOwnerGeneration, readActiveOwnerLearningScope, resetSyncDatabaseForTests, writeLessonResume, readLessonResume, openSyncDatabase, LESSON_RESUME_STORE } from './indexedDb';
import { saveWorkspaceChanges, readWorkspace, readWorkspaceCooperatively, syncWorkspace, WORKSPACE_CHANGED } from './workspaceSync';
const clear = async () => { await resetSyncDatabaseForTests(); await new Promise<void>(resolve => {
  const request = indexedDB.deleteDatabase('hanzi-os-sync-v1'); request.onsuccess = () => resolve();
}); };
beforeEach(async () => { await clear(); vi.stubGlobal('window', new EventTarget()); await readOrInitializeOwnerGeneration('account:a'); });
afterEach(async () => { vi.unstubAllGlobals(); await clear(); });
it('keeps unsent changes through errors, merges remote data, and does not acknowledge edits made in flight', async () => {
  const scope = (await readActiveOwnerLearningScope())!;
  await saveWorkspaceChanges(scope, [{ key: 'reader.saved:ni', value: '你' }]);
  await expect(syncWorkspace(scope, new AbortController().signal, vi.fn().mockResolvedValue(new Response(null, { status: 503 })))).rejects.toThrow();
  expect((await readWorkspace(scope)).pending).toHaveLength(2);
  const send = vi.fn<typeof fetch>(async (_url, init) => {
    const body = JSON.parse(init!.body as string);
    await saveWorkspaceChanges(scope, [{ key: 'reader.saved:ni', value: null }]);
    return Response.json({ version: 1, resetEpoch: 0, entries: [...body.entries,
      { key: 'reader.bookmark:chapter', value: true, changedAt: Date.now(), changeId: 'remote' }] });
  });
  await syncWorkspace(scope, new AbortController().signal, send);
  const journal = await readWorkspace(scope);
  expect(journal.pending).toHaveLength(2);
  expect(journal.pending.find(entry => entry.key === 'reader.saved:ni')!.value).toBeNull();
  expect(journal.pending.filter(entry => entry.key.startsWith('history.activity:'))).toHaveLength(1);
  expect(journal.entries.filter(entry => entry.key.startsWith('history.activity:'))).toHaveLength(2);
  expect(journal.entries.some(entry => entry.key === 'reader.bookmark:chapter')).toBe(true);
  await syncWorkspace(scope, new AbortController().signal, vi.fn().mockResolvedValue(Response.json({ version: 1, resetEpoch: 0, entries: [] })));
  expect((await readWorkspace(scope)).pending).toHaveLength(2);
});

it.each([{ schemaVersion: 99 }, { ownerKey: 'account:other' }, { resetEpoch: 1 }, { entryKey: 'forged' }, { value: undefined }])(
  'retains an unreadable workspace wrapper through reads and attempted writes: %j', async patch => {
    const scope = (await readActiveOwnerLearningScope())!;
    await saveWorkspaceChanges(scope, [{ key: 'reader.saved:original', value: '原' }]);
    const cacheScope = { expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: scope.resetEpoch, entryKey: 'workspace-sync:v1' };
    const original = (await readLessonResume(cacheScope))!;
    const corrupted = { ...original, ...patch };
    const db = await openSyncDatabase();
    const tx = db.transaction(LESSON_RESUME_STORE, 'readwrite');
    tx.objectStore(LESSON_RESUME_STORE).put(corrupted);
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
    const changed = vi.fn();
    window.addEventListener(WORKSPACE_CHANGED, changed);
    await expect(readWorkspace(scope)).rejects.toThrow('giữ dữ liệu');
    await expect(readWorkspaceCooperatively(scope)).rejects.toThrow('giữ dữ liệu');
    await expect(saveWorkspaceChanges(scope, [{ key: 'reader.saved:new', value: '新' }])).rejects.toThrow('giữ dữ liệu');
    const send = vi.fn<typeof fetch>();
    await expect(syncWorkspace(scope, new AbortController().signal, send)).rejects.toThrow('giữ dữ liệu');
    expect(send).not.toHaveBeenCalled();
    expect(changed).not.toHaveBeenCalled();
    expect(await readLessonResume(cacheScope)).toEqual(corrupted);
  });

it('rechecks the raw wrapper inside acknowledgment and retains pending when it changes in flight', async () => {
  const scope = (await readActiveOwnerLearningScope())!;
  await saveWorkspaceChanges(scope, [{ key: 'reader.saved:original', value: '原' }]);
  const cacheScope = { expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: scope.resetEpoch, entryKey: 'workspace-sync:v1' };
  const original = (await readLessonResume(cacheScope))!;
  const corrupted = { ...original, ownerKey: 'account:other' };
  const received = vi.fn(); window.addEventListener('hanzi-workspace-received', received);
  const send = vi.fn<typeof fetch>(async (_url, init) => {
    const db = await openSyncDatabase();
    const tx = db.transaction(LESSON_RESUME_STORE, 'readwrite');
    tx.objectStore(LESSON_RESUME_STORE).put(corrupted);
    await new Promise<void>((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); });
    return Response.json({ version: 1, resetEpoch: scope.resetEpoch, entries: JSON.parse(init!.body as string).entries });
  });
  await expect(syncWorkspace(scope, new AbortController().signal, send)).rejects.toThrow('giữ dữ liệu');
  expect(send).toHaveBeenCalledTimes(1);
  expect(received).not.toHaveBeenCalled();
  expect(await readLessonResume(cacheScope)).toEqual(corrupted);
});

it('preserves an unsupported stored journal instead of replacing it with an empty workspace', async () => {
  const scope = (await readActiveOwnerLearningScope())!;
  const storedScope = { expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: scope.resetEpoch, entryKey: 'workspace-sync:v1' };
  const unsupported = { version: 2, entries: [{ key: 'future:reader', value: 'giữ lại' }], pending: [] };
  await writeLessonResume({ ...storedScope, value: unsupported });
  await expect(readWorkspace(scope)).rejects.toThrow('giữ dữ liệu');
  await expect(saveWorkspaceChanges(scope, [{ key: 'reader.saved:w', value: '你' }])).rejects.toThrow();
  expect((await readLessonResume(storedScope))?.value).toEqual(unsupported);
});
