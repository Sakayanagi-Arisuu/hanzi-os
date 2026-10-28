import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readActiveOwnerLearningScope, readOrInitializeOwnerGeneration, resetSyncDatabaseForTests,
  type ActiveOwnerLearningScope } from '../sync/indexedDb';
import { advanceAdaptiveSession, readAdaptiveSession, recordAdaptivePractice, recordAdaptiveSupport,
  startAdaptiveSession, type AdaptiveJournal } from '../sync/adaptiveSession';
import { extractPilotLearningUnits } from '../server/pilotLearningUnits';
import { reduceLearnerModel } from './learnerModel';
import { composeShadowSession } from './sessionComposer';
import { sealPracticeManifest } from './practiceManifest';
import { AdaptiveSessionController } from './adaptiveSessionController';
import { readAdaptiveDraftRecoveries } from '../sync/adaptiveDraftRecovery';
import { readWorkspace, saveWorkspaceChanges } from '../sync/workspaceSync';
import * as adaptiveSession from '../sync/adaptiveSession';

let scope: ActiveOwnerLearningScope;
const clear = async () => {
  await resetSyncDatabaseForTests();
  await new Promise<void>((resolve, reject) => { const request = indexedDB.deleteDatabase('hanzi-os-sync-v1');
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
};
beforeEach(async () => { await clear(); vi.stubGlobal('window', new EventTarget());
  await readOrInitializeOwnerGeneration('anonymous:controller'); scope = (await readActiveOwnerLearningScope())!; });
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); await clear(); });
async function production() {
  const { graph, units } = await extractPilotLearningUnits();
  const owner = { ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: scope.resetEpoch }, now = '2026-10-21T00:00:00Z';
  const model = await reduceLearnerModel({ graph, units, events: [], scope: owner, asOf: now, allowInference: false });
  const shadow = await composeShadowSession({ graph, units, model, scope: owner, now, preferences: null,
    context: { online: true, microphone: false, minutes: 5 }, intent: { kind: 'produce', origin: 'manual' },
    eligibility: { scope: owner, authority: 'guest-released-source', entries: units.map(unit => ({ unitId: unit.id,
      binding: unit.binding, sourcePermitted: true, entitlementAllowed: true, lessonPrerequisitesAllowed: true })) } });
  let saved = await startAdaptiveSession(scope, await sealPracticeManifest(shadow), { id: 'controller', acceptsTaskChange: true });
  const step = saved.snapshot.manifest.steps[0]!;
  if (step.kind !== 'unit') throw new Error('Unit required');
  saved = await recordAdaptivePractice(scope, saved.snapshot, { stepId: step.stepId, unitBinding: step.unitBinding,
    kind: 'exposure', response: null, ime: null, selfReview: null });
  await advanceAdaptiveSession(scope, saved.snapshot);
  const controller = new AdaptiveSessionController(scope);
  await controller.hydrate();
  return controller;
}
function receipt(journal: AdaptiveJournal, response: string) {
  const step = journal.snapshot.manifest.steps[journal.snapshot.cursor]!;
  if (step.kind !== 'unit') throw new Error('Unit required');
  return { stepId: step.stepId, unitBinding: step.unitBinding, kind: 'self-review' as const,
    response, ime: true, selfReview: 'compared' as const };
}

it('serializes draft/support/receipt/next and restores the exact typed answer and IME after reload', async () => {
  const controller = await production();
  controller.updateDraft({ response: '三本书多少钱？', ime: true });
  const draft = controller.flushDraft();
  const support = controller.support('reveal');
  const practice = controller.practice(receipt(controller.getState().journal!, '三本书多少钱？'));
  await Promise.all([draft, support, practice]);
  controller.dispose();
  const resumed = new AdaptiveSessionController(scope); await resumed.hydrate();
  expect(resumed.getState().draft).toEqual({ response: '三本书多少钱？', ime: true });
  const snapshot = resumed.getState().journal!.snapshot;
  expect(snapshot.receipts[1]).toMatchObject({ response: '三本书多少钱？', ime: true });
  expect(snapshot.support[snapshot.manifest.steps[1]!.stepId]?.reveal).toBe(true);
  await resumed.advance();
  expect(resumed.getState().journal!.status).toBe('finished');
});

it('saves the latest draft before opening its frozen source lesson and resumes the same unfinished step', async () => {
  const controller = await production();
  const before = controller.getState().journal!.snapshot;
  const step = before.manifest.steps[before.cursor]!; if (step.kind !== 'unit') throw Error('Unit required');
  controller.updateDraft({ response: '三本书多少钱？', ime: true });
  expect(await controller.sourceLessonPath()).toBe(`/lesson/${encodeURIComponent(step.sourceLessonId)}`);
  controller.dispose();
  const resumed = new AdaptiveSessionController(scope); await resumed.hydrate();
  expect(resumed.getState().draft).toEqual({ response: '三本书多少钱？', ime: true });
  const saved = resumed.getState().journal!.snapshot;
  expect(saved.cursor).toBe(before.cursor); expect(saved.receipts).toEqual(before.receipts);
  expect(saved.manifest).toEqual(before.manifest); expect(resumed.getState().journal!.status).toBe('active');
});

it('does not produce a navigation path after a draft save failure and keeps the visible answer', async () => {
  const controller = await production(), before = await readAdaptiveSession(scope);
  controller.updateDraft({ response: '保留我的草稿', ime: true });
  vi.spyOn(adaptiveSession, 'recordAdaptiveDraft').mockRejectedValueOnce(new DOMException('quota', 'QuotaExceededError'));
  await expect(controller.sourceLessonPath()).rejects.toThrow('quota');
  expect(controller.getState().draft.response).toBe('保留我的草稿');
  expect(controller.getState().draftStatus).toBe('error');
  expect((await readAdaptiveSession(scope))!.snapshot).toEqual(before!.snapshot);
});

it('blocks source navigation if another tab changed the saved step before leaving', async () => {
  const controller = await production(), before = controller.getState().journal!.snapshot;
  await recordAdaptiveSupport(scope, before, 'pinyin');
  await expect(controller.sourceLessonPath()).rejects.toThrow('changed before');
  expect(controller.getState().conflict).toBe(true);
  expect((await readAdaptiveSession(scope))!.snapshot.cursor).toBe(before.cursor);
});

it('retains a dirty answer on external revision and requires explicit reload without silently rebasing', async () => {
  const controller = await production();
  controller.updateDraft({ response: '我的草稿', ime: true });
  const external = (await readAdaptiveSession(scope))!;
  await recordAdaptiveSupport(scope, external.snapshot, 'pinyin');
  await controller.refresh();
  expect(controller.getState()).toMatchObject({ conflict: true, draft: { response: '我的草稿', ime: true } });
  await expect(controller.flushDraft()).rejects.toThrow('External revision');
  await expect(controller.reloadSaved({ discardVisibleDraft: false })).rejects.toThrow('explicitly');
  expect(controller.getState().draft.response).toBe('我的草稿');
  await controller.reloadSaved({ discardVisibleDraft: true });
  expect(controller.getState()).toMatchObject({ conflict: false, draft: { response: '', ime: false } });
});

it('keeps the draft on stale CAS and refuses a delayed receipt that differs from the visible answer', async () => {
  const controller = await production();
  controller.updateDraft({ response: 'first', ime: true });
  const old = receipt(controller.getState().journal!, 'first');
  controller.updateDraft({ response: 'second', ime: true });
  await expect(controller.practice(old)).rejects.toThrow('Draft changed');
  expect((await readAdaptiveSession(scope))!.snapshot.receipts).toHaveLength(1);
  expect(controller.getState().draft.response).toBe('second');
  const external = (await readAdaptiveSession(scope))!;
  await recordAdaptiveSupport(scope, external.snapshot, 'translation');
  controller.updateDraft({ response: 'third', ime: false });
  await expect(controller.flushDraft()).rejects.toThrow(/another tab|Conflicting adaptive command/);
  expect(controller.getState()).toMatchObject({ draftStatus: 'error', draft: { response: 'third', ime: false } });
});

it('does not execute queued support effects after the controller is disposed', async () => {
  const controller = await production();
  const revision = controller.getState().journal!.snapshot.revision;
  const pending = controller.support('syntheticTts'); controller.dispose();
  await expect(pending).rejects.toThrow('closed');
  expect((await readAdaptiveSession(scope))!.snapshot.revision).toBe(revision);
});

it('survives the StrictMode attach/cleanup/attach cycle without losing the hydrated journal', async () => {
  const controller = await production();
  const release = controller.retain(); release();
  const releaseAgain = controller.retain();
  await controller.hydrate();
  controller.updateDraft({ response: 'still mounted', ime: true });
  await controller.flushDraft();
  expect(controller.getState().draftStatus).toBe('saved');
  releaseAgain(); await Promise.resolve();
  await expect(controller.support('reveal')).rejects.toThrow('closed');
});

it('keeps a conflict draft durably before loading the external revision, without turning it into a receipt', async () => {
  const controller = await production();
  controller.updateDraft({response:'这份尚未提交',ime:true});
  const external = (await readAdaptiveSession(scope))!;
  await recordAdaptiveSupport(scope, external.snapshot, 'translation');
  await controller.refresh();
  expect(controller.getState().conflict).toBe(true);
  await controller.keepDraftAndReload();
  expect(controller.getState()).toMatchObject({conflict:false,draftStatus:'saved',draft:{response:'',ime:false}});
  expect((await readAdaptiveDraftRecoveries(scope))[0]?.draft).toEqual({response:'这份尚未提交',ime:true});
  expect((await readAdaptiveSession(scope))!.snapshot.receipts).toHaveLength(1);
});

it('flushes the visible draft before archiving and retains it on reload', async () => {
  const controller = await production();
  controller.updateDraft({response:'保留这本书',ime:true});
  await controller.archive();
  expect((await readAdaptiveSession(scope))!).toMatchObject({status:'archived',snapshot:{drafts:{'step-2':{response:'保留这本书',ime:true}}}});
  await expect(controller.support('reveal')).rejects.toThrow('read-only');
});

it('retains the visible conflict draft when the recovery transaction fails and retries exactly once', async () => {
  const controller = await production();
  controller.updateDraft({response:'配额不足也保留',ime:true});
  const external = (await readAdaptiveSession(scope))!;
  await recordAdaptiveSupport(scope, external.snapshot, 'reveal');
  await controller.refresh();
  const put = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => { throw new DOMException('quota', 'QuotaExceededError'); });
  await expect(controller.keepDraftAndReload()).rejects.toThrow('quota');
  expect(controller.getState()).toMatchObject({conflict:true,draft:{response:'配额不足也保留',ime:true}});
  put.mockRestore();
  expect(await readAdaptiveDraftRecoveries(scope)).toHaveLength(0);
  await controller.keepDraftAndReload();
  expect(await readAdaptiveDraftRecoveries(scope)).toHaveLength(1);
  expect(controller.getState().conflict).toBe(false);
});

it('can keep a visible draft for exit when another device creates an ambiguous unfinished session', async () => {
  const controller = await production();
  controller.updateDraft({response:'两条分支也保留',ime:true});
  const workspace = await readWorkspace(scope);
  const source = workspace.entries.find(entry => entry.key === 'activity.record:["overview","adaptive-state:controller:0"]')!;
  const snapshot = (source.value as {adaptiveSnapshot: AdaptiveJournal['snapshot']}).adaptiveSnapshot;
  await saveWorkspaceChanges(scope,[{key:'activity.record:["overview","adaptive-state:second-device:0"]',
    value:{...source.value as object,adaptiveSnapshot:{...snapshot,id:'second-device'}}}]);
  await expect(controller.refresh()).rejects.toThrow('unfinished');
  expect(controller.getState().conflict).toBe(true);
  await controller.keepDraftForExit();
  expect((await readAdaptiveDraftRecoveries(scope))[0]?.draft).toEqual({response:'两条分支也保留',ime:true});
  expect(controller.getState().draft.response).toBe('两条分支也保留');
});
