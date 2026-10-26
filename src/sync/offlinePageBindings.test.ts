import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { loadOfflinePageBindings } from './offlinePageBindings';
import { readOrInitializeOwnerGeneration, resetSyncDatabaseForTests, type OwnerScopedCacheScope } from './indexedDb';
import { lessonPageDocumentHash } from '../learning/lessonPageBinding';
import { emptyLessonBlock, type LessonPageDocument } from '../learning/lessonPages';
import { emptyLessonActivity } from '../learning/lessonActivities';

const document: LessonPageDocument = { version: 1, pages: [{ id: 'p', title: 'Trang', layout: 'focus',
  blocks: [{ ...emptyLessonBlock('b'), kind: 'activity', activity: emptyLessonActivity() }] }] };
const binding = { activityId: 'lesson-page:["lesson","p","b"]', activityVersion: `lesson-page-v1:sha256:${'a'.repeat(64)}`,
  revisionId: 'revision', pageId: 'p', blockId: 'b' };
let scope: OwnerScopedCacheScope;
async function clear() {
  await resetSyncDatabaseForTests();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('hanzi-os-sync-v1');
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
  });
}
beforeEach(async () => {
  await clear();
  scope = { expectedOwnerGeneration: (await readOrInitializeOwnerGeneration('account:a')).ownerGeneration, resetEpoch: 0, entryKey: 'reader' };
});
afterEach(clear);

it('keeps exact revision bindings across reload and network loss but not across changed content or access rejection', async () => {
  const payload = { version: 1, lessonId: 'lesson', documentHash: await lessonPageDocumentHash(document), activities: [binding] };
  const send = vi.fn<typeof fetch>().mockResolvedValue(Response.json(payload));
  const signal = new AbortController().signal;
  expect(await loadOfflinePageBindings(scope, 'lesson', document, signal, send)).toEqual({ b: binding });
  await resetSyncDatabaseForTests();
  send.mockRejectedValue(new TypeError('offline'));
  expect(await loadOfflinePageBindings(scope, 'lesson', document, signal, send)).toEqual({ b: binding });
  const changed = structuredClone(document); changed.pages[0].title = 'Revised';
  expect(await loadOfflinePageBindings(scope, 'lesson', changed, signal, send)).toEqual({});
  send.mockResolvedValue(new Response(null, { status: 403 }));
  expect(await loadOfflinePageBindings(scope, 'lesson', document, signal, send)).toEqual({});
  await expect(loadOfflinePageBindings({ ...scope, expectedOwnerGeneration: { ownerKey: 'account:b', generation: 0 } },
    'lesson', document, signal, send)).rejects.toThrow();
});
