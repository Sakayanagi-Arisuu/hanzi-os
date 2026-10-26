import 'fake-indexeddb/auto';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { readOrInitializeOwnerGeneration, readActiveOwnerLearningScope, resetSyncDatabaseForTests, StaleOwnerGenerationError } from './indexedDb';
import { beginMockPractice, readMockPracticeRuns, saveMockPracticeRun, syncMockPractice } from './offlineMockPractice';
import { offlineMockPackage, gradeOfflineMockPractice } from '../server/offlineMockPractice';
import { getHskMockExamDefinition } from '../server/hskMockExamBank';
import { readLocalActivityHistory } from './activityHistory';
import { workspaceHistoryEntry, workspaceHistoryEvents } from './workspaceHistory';
import { projectLessonHistory } from '../learning/lessonHistory';
const clear = async () => { await resetSyncDatabaseForTests(); await new Promise<void>(resolve => {
  const request = indexedDB.deleteDatabase('hanzi-os-sync-v1'); request.onsuccess = () => resolve();
}); };
beforeEach(async () => { await clear(); vi.stubGlobal('window', new EventTarget()); await readOrInitializeOwnerGeneration('account:a'); });
afterEach(async () => { vi.unstubAllGlobals(); await clear(); });
it('preserves an offline run through closing storage, failed sync, replay and an owner switch', async () => {
  const scope = (await readActiveOwnerLearningScope())!;
  const definition = getHskMockExamDefinition('hsk1', 'a')!;
  const run = await beginMockPractice(scope, await offlineMockPackage(definition));
  const item = run.package.form.items[0]!;
  run.answers.push({ position: 0, itemId: item.itemId, itemVersion: item.itemVersion, answer: item.options[0]!, occurredAt: new Date().toISOString() });
  await saveMockPracticeRun(scope, run);
  await resetSyncDatabaseForTests();
  expect((await readMockPracticeRuns(scope))[0]!.answers).toHaveLength(1);
  run.submittedAt = new Date().toISOString(); await saveMockPracticeRun(scope, run);
  const pendingHistory = await readLocalActivityHistory(scope);
  expect(pendingHistory.filter(event => event.business?.category === 'objective')).toMatchObject([
    { outcome: 'unknown', confirmationState: 'provisional', score: null },
  ]);
  expect(pendingHistory.find(event => event.business?.details?.status === 'pending')?.confirmationState).toBe('provisional');
  await syncMockPractice(scope, new AbortController().signal, vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
  expect((await readMockPracticeRuns(scope))[0]!.result).toBeNull();
  const send = vi.fn<typeof fetch>(async () => Response.json({ result: await gradeOfflineMockPractice(definition, run) }));
  await syncMockPractice(scope, new AbortController().signal, send);
  await syncMockPractice(scope, new AbortController().signal, send);
  expect(send).toHaveBeenCalledOnce();
  expect((await readMockPracticeRuns(scope))[0]!.result?.score.answered).toBe(1);
  const confirmedHistory = await readLocalActivityHistory(scope);
  expect(confirmedHistory).toHaveLength(3);
  expect(confirmedHistory.filter(event => event.business?.category === 'objective')).toMatchObject([
    { confirmationState: 'confirmed', authority: 'server-recorded', masteryEligible: false },
  ]);
  const result = (await readMockPracticeRuns(scope))[0]!.result!;
  const entry = workspaceHistoryEntry({ key: `exam.practice:${run.id}`, value: result, changedAt: Date.parse(result.submittedAt), changeId: result.formHash })!;
  const remote = workspaceHistoryEvents({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: scope.resetEpoch }, [entry], [], true);
  expect(projectLessonHistory({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: scope.resetEpoch }, [...pendingHistory, ...confirmedHistory, ...remote])).toHaveLength(3);
  // A stale generation cannot write even when the visible account key is reused.
  await expect(saveMockPracticeRun({ ...scope, ownerGeneration: { ...scope.ownerGeneration, generation: scope.ownerGeneration.generation + 1 } }, run))
    .rejects.toBeInstanceOf(StaleOwnerGenerationError);
  await expect(saveMockPracticeRun({ ...scope, ownerGeneration: { ...scope.ownerGeneration, ownerKey: 'account:b' } }, run))
    .rejects.toBeInstanceOf(StaleOwnerGenerationError);
});

it('keeps distinct histories for two runs of the same form even when legacy change IDs reused the form hash', async () => {
  const scope = (await readActiveOwnerLearningScope())!;
  const pack = await offlineMockPackage(getHskMockExamDefinition('hsk1', 'a')!);
  const first = await beginMockPractice(scope, pack);
  first.submittedAt = new Date().toISOString(); await saveMockPracticeRun(scope, first);
  const second = await beginMockPractice(scope, pack);
  second.submittedAt = new Date().toISOString(); await saveMockPracticeRun(scope, second);
  const entries = [first, second].map(run => workspaceHistoryEntry({ key: `exam.practice:${run.id}`,
    changeId: pack.formHash, changedAt: Date.parse(run.submittedAt!), value: { contentVersion: pack.contentVersion,
      sessionId: run.id, formHash: pack.formHash, formVersion: pack.form.formVersion, submittedAt: run.submittedAt } })!);
  expect(entries[0].key).not.toBe(entries[1].key);
  const events = workspaceHistoryEvents({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: 0 }, entries, [], true);
  expect(new Set(events.map(event => event.eventId)).size).toBe(2);
  const local = await readLocalActivityHistory(scope);
  expect(projectLessonHistory({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: 0 }, [...local, ...events])).toHaveLength(4);
});
it('opens one run across simultaneous tabs and rejects a conflicting answer overwrite', async () => {
  const scope = (await readActiveOwnerLearningScope())!;
  const pack = await offlineMockPackage(getHskMockExamDefinition('hsk1', 'a')!);
  const [first, second] = await Promise.all([beginMockPractice(scope, pack), beginMockPractice(scope, pack)]);
  expect(first.id).toBe(second.id);
  expect(await readMockPracticeRuns(scope)).toHaveLength(1);
  const item = pack.form.items[0]!;
  const answer = { position: 0, itemId: item.itemId, itemVersion: item.itemVersion,
    answer: item.options[0]!, occurredAt: new Date().toISOString() };
  await saveMockPracticeRun(scope, { ...first, answers: [answer] });
  await expect(saveMockPracticeRun(scope, { ...second, answers: [{ ...answer, answer: item.options[1]! }] })).rejects.toThrow('cửa sổ khác');
  expect((await readMockPracticeRuns(scope))[0]!.answers).toEqual([answer]);
});
