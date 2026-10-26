import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readActiveOwnerLearningScope, readOrInitializeOwnerGeneration, resetSyncDatabaseForTests } from '../sync/indexedDb';
import { readWorkspace, saveWorkspaceChanges } from '../sync/workspaceSync';
import { collectPracticeMistakes, practiceMistakeKey, savePracticeMistake, type PracticeMistake } from './practiceMistakes';
const clear = async () => { await resetSyncDatabaseForTests(); await new Promise<void>(resolve => {
  const request = indexedDB.deleteDatabase('hanzi-os-sync-v1'); request.onsuccess = () => resolve();
}); };
beforeEach(async () => { await clear(); vi.stubGlobal('window', new EventTarget()); await readOrInitializeOwnerGeneration('account:a'); });
afterEach(async () => { vi.unstubAllGlobals(); await clear(); });
const mistake: PracticeMistake = { version: 1, source: 'reader', activityId: 'chapter:question', activityVersion: 'v1',
  prompt: 'Đi đâu?', context: '我去学校。', answer: 'Trường học', options: ['Trường học', 'Nhà'], explanation: '学校 là trường học.',
  sourceLabel: 'Chương 1', occurredAt: '2026-10-17T00:00:00Z' };
it('bridges a source mistake into the shared queue, preserves hints and corrections across reload, and isolates revisions', async () => {
  const scope = (await readActiveOwnerLearningScope())!;
  await savePracticeMistake('account:a', mistake, scope);
  const key = await practiceMistakeKey(mistake);
  expect(collectPracticeMistakes((await readWorkspace(scope)).entries)[0].item).toMatchObject({ originSource: 'reader', resolved: false });
  await saveWorkspaceChanges(scope, [{ key: key.replace('practice.mistake:', 'practice.correction:'),
    value: { originAt: mistake.occurredAt, correct: true, usedHint: true } }]);
  expect(collectPracticeMistakes((await readWorkspace(scope)).entries)[0].item.resolved).toBe(false);
  await saveWorkspaceChanges(scope, [{ key: key.replace('practice.mistake:', 'practice.correction:'),
    value: { originAt: mistake.occurredAt, correct: true, usedHint: false } }]);
  await resetSyncDatabaseForTests();
  await savePracticeMistake('account:a', { ...mistake, occurredAt: '2026-10-17T01:00:00Z' }, scope);
  expect(collectPracticeMistakes((await readWorkspace(scope)).entries)[0].item.resolved).toBe(true);
  await savePracticeMistake('account:a', { ...mistake, source: 'assessment', originId: 'exam-1' }, scope);
  const examKey = await practiceMistakeKey({ ...mistake, source: 'assessment' });
  await saveWorkspaceChanges(scope, [{ key: examKey.replace('practice.mistake:', 'practice.correction:'),
    value: { originAt: mistake.occurredAt, originId: 'exam-1', correct: true, usedHint: false } }]);
  await savePracticeMistake('account:a', { ...mistake, source: 'assessment', originId: 'exam-2', occurredAt: '2026-10-17T02:00:00Z' }, scope);
  expect(collectPracticeMistakes((await readWorkspace(scope)).entries).find(entry => entry.item.id === examKey)?.item.resolved).toBe(false);
  await savePracticeMistake('account:a', { ...mistake, activityVersion: 'v2' }, scope);
  expect(collectPracticeMistakes((await readWorkspace(scope)).entries).filter(entry => !entry.item.resolved)).toHaveLength(2);
  await expect(savePracticeMistake('account:a', mistake, { ...scope, resetEpoch: 1 })).rejects.toThrow('scope changed');
  await expect(savePracticeMistake('account:b', mistake)).rejects.toThrow('owner changed');
  expect(collectPracticeMistakes((await readWorkspace(scope)).entries).every(entry => !('masteryEligible' in entry.item))).toBe(true);
});
