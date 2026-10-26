import 'fake-indexeddb/auto';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { readOrInitializeOwnerGeneration, readActiveOwnerLearningScope, resetSyncDatabaseForTests, writeLessonResume, readLessonResume } from './indexedDb';
import { saveWorkspaceChanges, readWorkspace, syncWorkspace } from './workspaceSync';
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

it('preserves an unsupported stored journal instead of replacing it with an empty workspace', async () => {
  const scope = (await readActiveOwnerLearningScope())!;
  const storedScope = { expectedOwnerGeneration: scope.ownerGeneration, resetEpoch: scope.resetEpoch, entryKey: 'workspace-sync:v1' };
  const unsupported = { version: 2, entries: [{ key: 'future:reader', value: 'giữ lại' }], pending: [] };
  await writeLessonResume({ ...storedScope, value: unsupported });
  await expect(readWorkspace(scope)).rejects.toThrow('giữ dữ liệu');
  await expect(saveWorkspaceChanges(scope, [{ key: 'reader.saved:w', value: '你' }])).rejects.toThrow();
  expect((await readLessonResume(storedScope))?.value).toEqual(unsupported);
});
