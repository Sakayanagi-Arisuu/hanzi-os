import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { LearningEvidence, LearningState } from '../types';
import { INITIAL_LEARNING_STATE } from '../store/LearningStore';
import { projectLessonHistory } from '../learning/lessonHistory';
import { projectHistoryState } from './historyStateProjection';
import { LocalHistoryReadBatch } from './localHistoryReadBatch';
import { createInitialSyncDocument } from './document';
import { readLocalLearningHistory, readLocalReviewHistory } from './reviewHistory';
import { readLocalLessonHistory } from './lessonHistory';
import { readLocalActivityHistory } from './activityHistory';
import { readOrInitializeOwnerGeneration, readActiveOwnerLearningScope, writeOwnerCheckpoint, readOwnerLocalState,
  resetSyncDatabaseForTests, transitionOwnerCheckpoint, StaleOwnerGenerationError, type ActiveOwnerLearningScope } from './indexedDb';

let scope: ActiveOwnerLearningScope;
async function clear() {
  await resetSyncDatabaseForTests();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('hanzi-os-sync-v1'); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
  });
}
beforeEach(async () => {
  await clear(); vi.stubGlobal('window', new EventTarget());
  const { ownerGeneration } = await readOrInitializeOwnerGeneration('anonymous:history-state');
  scope = (await readActiveOwnerLearningScope())!;
  await writeOwnerCheckpoint(ownerGeneration.ownerKey, 0, createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-11-01T00:00:00Z', 'history-state'), INITIAL_LEARNING_STATE, ownerGeneration);
});
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); await clear(); });
const evidence = (id: string, source: LearningEvidence['source'] = 'writing', method: LearningEvidence['method'] = 'typed-character-recall'): LearningEvidence => ({
  id, idempotencyKey: id, schemaVersion: 1, contentVersion: 'fixture', activityVersion: 'fixture', source, method,
  activityId: source === 'review' ? 'review:word-1' : id, skill: 'writing', outcome: 'correct', score: 100,
  verified: false, masteryEligible: false, occurredAt: '2026-11-01T00:00:00Z', metadata: { usedHint: true, rating: 2 },
});
async function persist(state: LearningState) {
  await writeOwnerCheckpoint(scope.ownerGeneration.ownerKey, 0, createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-11-01T00:00:00Z', 'history-state'), state, scope.ownerGeneration);
}

it('retains only fields and evidence read by the two guest consumers, with duplicate order and raw input intact', async () => {
  const review = evidence('review-one', 'review', 'fsrs-rating'), writing = evidence('writing-one');
  const state = { ...structuredClone(INITIAL_LEARNING_STATE), evidence: [evidence('lesson', 'lesson'), evidence('ignored-review', 'review'), review, writing, review],
    unknownRaw: { blob: new Blob(['keep source']), bytes: new Uint8Array([1, 2, 3]) } };
  const before = structuredClone(state), result = await projectHistoryState(scope.ownerGeneration.ownerKey, state);
  expect(result).toEqual({ schemaVersion: 2, evidence: [review, writing, review] });
  expect(result!.evidence[0]).toBe(review); expect(result!.evidence[2]).toBe(review);
  expect(Object.keys(result!)).toEqual(['schemaVersion', 'evidence']); expect(state).toEqual(before);
  expect(await state.unknownRaw.blob.text()).toBe('keep source');
});

it('matches independent canonical adapters, keeps original state, and leaves default batches complete', async () => {
  const state = { ...structuredClone(INITIAL_LEARNING_STATE), evidence: [evidence('lesson', 'lesson'), evidence('review', 'review', 'fsrs-rating'), evidence('writing')],
    unknownRaw: '原'.repeat(120000) };
  await persist(state); const before = await readOwnerLocalState(scope.ownerGeneration.ownerKey);
  const canonical = projectLessonHistory({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: 0 }, [
    ...await readLocalLessonHistory(scope), ...await readLocalReviewHistory(scope), ...await readLocalActivityHistory(scope),
  ]);
  expect(await new LocalHistoryReadBatch(scope).state(scope)).toEqual(before);
  expect(Object.keys((await new LocalHistoryReadBatch(scope, true).state(scope))!)).toEqual(['schemaVersion', 'evidence']);
  expect(canonical).toHaveLength(2); expect(await readLocalLearningHistory(scope)).toEqual(canonical);
  expect(await readOwnerLocalState(scope.ownerGeneration.ownerKey)).toEqual(before);
});

it.each([{ schemaVersion: 99, evidence: [] }, { schemaVersion: 2, evidence: { unknown: true } }])(
  'leaves unsupported state visible to the original consumer guards: %j', async raw => {
    const state = raw as unknown as LearningState;
    expect(await projectHistoryState(scope.ownerGeneration.ownerKey, state)).toEqual(raw);
    await persist(state); await expect(readLocalLearningHistory(scope)).rejects.toThrow('Unsupported review business state');
    expect(await readOwnerLocalState(scope.ownerGeneration.ownerKey)).toEqual(raw);
  });

it.each([null, undefined])('does not hide a malformed or missing evidence item: %s', async item => {
  const state = { ...INITIAL_LEARNING_STATE, evidence: [item] } as unknown as LearningState;
  await expect(projectHistoryState(scope.ownerGeneration.ownerKey, state)).rejects.toBeInstanceOf(TypeError);
});

it('visits sparse evidence slots rather than filtering their holes away', async () => {
  const entries: LearningEvidence[] = []; entries.length = 2; entries[1] = evidence('writing');
  await expect(projectHistoryState(scope.ownerGeneration.ownerKey, { ...INITIAL_LEARNING_STATE, evidence: entries })).rejects.toBeInstanceOf(TypeError);
});

it('keeps an unknown evidence source so the canonical activity adapter still rejects it', async () => {
  const unknown = { ...evidence('unknown'), source: 'unrecognized' } as unknown as LearningEvidence;
  await persist({ ...INITIAL_LEARNING_STATE, evidence: [unknown] });
  expect((await new LocalHistoryReadBatch(scope, true).state(scope))!.evidence).toEqual([unknown]);
  await expect(readLocalLearningHistory(scope)).rejects.toThrow('Unsupported business history source');
  expect((await readOwnerLocalState(scope.ownerGeneration.ownerKey))!.evidence).toEqual([unknown]);
});

it('does not retain unused account state, including versions the account history adapters never inspect', async () => {
  expect(await projectHistoryState('account:owner', { schemaVersion: 99, evidence: null } as unknown as LearningState)).toBeNull();
  expect(await projectHistoryState(scope.ownerGeneration.ownerKey, null)).toBeNull();
});

it('fences the owner after a cooperative state projection without changing the old owner state', async () => {
  await persist({ ...INITIAL_LEARNING_STATE, evidence: Array.from({ length: 1001 }, (_, i) => evidence(`lesson-${i}`, 'lesson')) });
  const before = await readOwnerLocalState(scope.ownerGeneration.ownerKey); let changed = false;
  vi.stubGlobal('scheduler', { yield: async () => {
    if (changed) return; changed = true;
    await transitionOwnerCheckpoint(scope.ownerGeneration, 'anonymous:after-state-yield', 0,
      createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-11-01T01:00:00Z', 'after-state'), INITIAL_LEARNING_STATE);
  } });
  await expect(new LocalHistoryReadBatch(scope, true).state(scope)).rejects.toBeInstanceOf(StaleOwnerGenerationError);
  expect(changed).toBe(true); expect(await readOwnerLocalState(scope.ownerGeneration.ownerKey)).toEqual(before);
});
