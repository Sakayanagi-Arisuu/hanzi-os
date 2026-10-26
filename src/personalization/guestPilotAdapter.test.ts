import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CONTENT_VERSION, RELEASED_LESSONS } from '../data/curriculum';
import * as rich from '../learning/richLessonContent';
import { extractPilotLearningUnits } from '../server/pilotLearningUnits';
import { INITIAL_LEARNING_STATE } from '../store/LearningStore';
import { createInitialSyncDocument } from '../sync/document';
import { readActiveOwnerLearningScope, readOrInitializeOwnerGeneration, readOwnerLocalState,
  resetSyncDatabaseForTests, writeOwnerCheckpoint, transitionOwnerCheckpoint, type ActiveOwnerLearningScope } from '../sync/indexedDb';
import { startAdaptiveSession, recordAdaptivePractice, recordAdaptiveDraft, recordAdaptiveSupport, advanceAdaptiveSession } from '../sync/adaptiveSession';
import { buildGuestPilotPlan, materializeGuestPilotUnit } from './guestPilotAdapter';
import { extractPilotSourceUnits } from './pilotSourceUnits';
import * as learnerModel from './learnerModel';
import {DEFAULT_LEARNING_PREFERENCES} from '../learning/learningPreferences';

let scope: ActiveOwnerLearningScope;
const now = '2026-10-22T00:00:00Z';
const request = { context: { online: true, minutes: 5 as const, microphone: false }, intent: { kind: 'produce' as const, origin: 'manual' as const } };
const clear = async () => { await resetSyncDatabaseForTests();
  await new Promise<void>((resolve, reject) => { const request = indexedDB.deleteDatabase('hanzi-os-sync-v1');
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); }); };
async function progress(unlocked = false) {
  const state = structuredClone(INITIAL_LEARNING_STATE);
  if (unlocked) state.completedLessons = Object.fromEntries(RELEASED_LESSONS.map(lesson => [lesson.id,
    { score: 100, bestScore: 100, attempts: 1, completedAt: now }]));
  await writeOwnerCheckpoint(scope.ownerGeneration.ownerKey, 0, createInitialSyncDocument(state, now, 'fixture'), state, scope.ownerGeneration);
  return state;
}
beforeEach(async () => { await clear(); vi.stubGlobal('window', new EventTarget());
  await readOrInitializeOwnerGeneration('anonymous:guest-pilot'); scope = (await readActiveOwnerLearningScope())!; });
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); await clear(); });

it('preserves exact server graph/unit/payload bindings using only the three permitted local sources', async () => {
  const server = await extractPilotLearningUnits();
  const subset = await extractPilotSourceUnits({ contentVersion: CONTENT_VERSION,
    lessons: ['hsk1-time-place-events-01-numbers','daily-1','daily-3'].map(rich.getRichLessonContent) });
  expect(subset).toEqual(server);
});

it('reads durable guest progress and preferences, keeps shadow default, and does not trust caller unlock flags', async () => {
  const state = await progress(true);
  const shadow = await buildGuestPilotPlan(scope, request);
  expect(shadow.executionEnabled).toBe(false); expect(shadow.manifest.shadowOnly).toBe(true);
  const practice = await buildGuestPilotPlan(scope, request, 'practice');
  expect(practice.executionEnabled).toBe(true); expect(practice.model.status).toBe('disabled');
  expect(practice.manifest).toMatchObject({ shadowOnly: false, completionLessonIds: [], authorityGrants: [] });
  await expect(buildGuestPilotPlan(scope, { ...request, eligibility: { unlocked: true } } as typeof request)).rejects.toThrow('request');
  expect(await readOwnerLocalState(scope.ownerGeneration.ownerKey)).toEqual(state);
});

it('fails closed for missing state, prerequisites, source permission and unprepared offline plans', async () => {
  await expect(buildGuestPilotPlan(scope, request)).rejects.toThrow('progress unavailable');
  await progress();
  expect((await buildGuestPilotPlan(scope, request, 'practice')).executionEnabled).toBe(false);
  await progress(true);
  expect((await buildGuestPilotPlan(scope, { ...request, context: { ...request.context, online: false } }, 'practice')).executionEnabled).toBe(false);
  vi.spyOn(rich, 'getRichLessonContent').mockReturnValue(null);
  await expect(buildGuestPilotPlan(scope, request)).rejects.toThrow('source unavailable');
});

it('requires durable inference consent for automatic suggestions and retains manual choice', async () => {
  const state = await progress(true);
  const automatic = { ...request, intent: null };
  expect((await buildGuestPilotPlan(scope, automatic, 'practice')).executionEnabled).toBe(false);
  expect((await buildGuestPilotPlan(scope, request, 'practice')).executionEnabled).toBe(true);
  state.profile.learningPreferences = { ...DEFAULT_LEARNING_PREFERENCES, allowInference: true };
  await writeOwnerCheckpoint(scope.ownerGeneration.ownerKey, 0,
    createInitialSyncDocument(state, now, 'fixture-consent'), state, scope.ownerGeneration);
  const result = await buildGuestPilotPlan(scope, automatic, 'practice');
  expect(result.executionEnabled).toBe(true);
  expect(result.manifest.intent).toEqual({ kind: 'explore', origin: 'default' });
  expect(result.manifest.authorityGrants).toEqual([]);
  await expect(buildGuestPilotPlan(scope, { ...automatic, intent: undefined } as unknown as typeof automatic)).rejects.toThrow('request');
});

it('rechecks source binding and prerequisites at render without changing frozen records', async () => {
  await progress(true);
  const plan = await buildGuestPilotPlan(scope, request, 'practice');
  const journal = await startAdaptiveSession(scope, plan.manifest, { id: 'guest-pilot', acceptsTaskChange: true });
  const signal = new AbortController().signal;
  expect((await materializeGuestPilotUnit(scope, journal.snapshot, signal)).binding).toBe(plan.manifest.steps[0]!.kind === 'unit' ? plan.manifest.steps[0]!.unitBinding : '');
  const altered = structuredClone(journal.snapshot); altered.manifest.graphBinding = 'a'.repeat(64);
  await expect(materializeGuestPilotUnit(scope, altered, signal)).rejects.toThrow('source changed');
  await progress();
  await expect(materializeGuestPilotUnit(scope, journal.snapshot, signal)).rejects.toThrow('source changed');
  expect(journal.snapshot.manifest.binding).toBe(plan.manifest.binding);
});

it('does not let account scopes fall back to guest or return payload after cancellation/owner change', async () => {
  await progress(true);
  const plan = await buildGuestPilotPlan(scope, request, 'practice');
  const journal = await startAdaptiveSession(scope, plan.manifest, { id: 'scope-test', acceptsTaskChange: true });
  const abort = new AbortController(); abort.abort();
  await expect(materializeGuestPilotUnit(scope, journal.snapshot, abort.signal)).rejects.toThrow();
  await transitionOwnerCheckpoint(scope.ownerGeneration, `siwc_${'a'.repeat(64)}`, 0,
    createInitialSyncDocument(INITIAL_LEARNING_STATE, now, 'switch'), INITIAL_LEARNING_STATE);
  await expect(buildGuestPilotPlan(scope, request)).rejects.toThrow('scope changed');
  await expect(buildGuestPilotPlan((await readActiveOwnerLearningScope())!, request)).rejects.toThrow('scope changed');
});

it('completes practice only in its journal and preserves the exact pre-existing progress state', async () => {
  const original = await progress(true);
  const plan = await buildGuestPilotPlan(scope, request, 'practice');
  let saved = await startAdaptiveSession(scope, plan.manifest, { id: 'conservation', acceptsTaskChange: true });
  while (saved.snapshot.cursor < saved.snapshot.manifest.steps.length) {
    const step = saved.snapshot.manifest.steps[saved.snapshot.cursor]!;
    if (step.kind !== 'unit') throw new Error('Unit fixture required');
    const typed = step.receiptKind === 'self-review';
    if (typed) saved = await recordAdaptiveDraft(scope, saved.snapshot, { response: '两本书多少钱？', ime: true });
    saved = await recordAdaptiveSupport(scope, saved.snapshot, 'reveal');
    saved = await recordAdaptivePractice(scope, saved.snapshot, { stepId: step.stepId, unitBinding: step.unitBinding,
      kind: step.receiptKind, response: typed ? '两本书多少钱？' : null, ime: typed ? true : null,
      selfReview: typed ? 'compared' : null });
    saved = await advanceAdaptiveSession(scope, saved.snapshot);
  }
  expect(saved.status).toBe('finished');
  expect(await readOwnerLocalState(scope.ownerGeneration.ownerKey)).toEqual(original);
});

it('does not return inferred suggestions after durable opt-out changes while composing',async()=>{
  const state=await progress(true);
  state.profile.learningPreferences={...DEFAULT_LEARNING_PREFERENCES,allowInference:true};
  await writeOwnerCheckpoint(scope.ownerGeneration.ownerKey,0,createInitialSyncDocument(state,now,'enabled'),state,scope.ownerGeneration);
  const original=learnerModel.reduceLearnerModel;
  vi.spyOn(learnerModel,'reduceLearnerModel').mockImplementation(async input=>{
    const model=await original(input);
    const disabled=structuredClone(state);disabled.profile.learningPreferences!.allowInference=false;
    await writeOwnerCheckpoint(scope.ownerGeneration.ownerKey,0,createInitialSyncDocument(disabled,now,'disabled'),disabled,scope.ownerGeneration);
    return model;
  });
  await expect(buildGuestPilotPlan(scope,request,'practice')).rejects.toThrow('preference changed');
  expect((await readOwnerLocalState(scope.ownerGeneration.ownerKey))?.profile.learningPreferences?.allowInference).toBe(false);
});
