import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createActivityHistoryEvent } from '../learning/activityHistory';
import { projectLessonHistory } from '../learning/lessonHistory';
import { INITIAL_LEARNING_STATE } from '../store/LearningStore';
import { createInitialSyncDocument } from '../sync/document';
import { readActiveOwnerLearningScope, readOrInitializeOwnerGeneration, resetSyncDatabaseForTests,
  writeOwnerCheckpoint, transitionOwnerCheckpoint, StaleOwnerGenerationError, captureOwnerRecoverySnapshot, type ActiveOwnerLearningScope } from '../sync/indexedDb';
import * as workspace from '../sync/workspaceSync';
import { reconcileProfileHistory } from './historyReconciliation';

let scope: ActiveOwnerLearningScope;
const document = () => createInitialSyncDocument(INITIAL_LEARNING_STATE, '2026-10-28T00:00:00Z', 'profile-history');
async function clear() {
  await resetSyncDatabaseForTests();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('hanzi-os-sync-v1');
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
  });
}
beforeEach(async () => {
  await clear(); vi.stubGlobal('window', new EventTarget());
  const { ownerGeneration } = await readOrInitializeOwnerGeneration('anonymous:profile-history');
  await writeOwnerCheckpoint(ownerGeneration.ownerKey, 0, document(), INITIAL_LEARNING_STATE, ownerGeneration);
  scope = (await readActiveOwnerLearningScope())!;
});
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllGlobals(); await clear(); });
const events = (count = 2_001) => Array.from({ length: count }, (_, index) => createActivityHistoryEvent({
  ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: scope.resetEpoch, operationId: `profile-${index}`,
  module: 'profile', category: 'preference', sourceId: 'preferences', itemId: `item-${index}`,
  contentVersion: 'fixture-v1', activityVersion: 'fixture-v1', occurredAt: null, sourceRecordRef: `profile-${index}`,
}));

it('reconciles duplicate receipts in canonical order without mutating input or durable data', async () => {
  const input = events();
  input.push({ ...input[0], confirmationState: 'confirmed', authority: 'server-recorded', receiptRef: 'synthetic-receipt' });
  const before = structuredClone(input), snapshot = await captureOwnerRecoverySnapshot(scope);
  const result = await reconcileProfileHistory(scope, input, () => true);
  expect(result).toEqual(projectLessonHistory({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: scope.resetEpoch }, input));
  expect(result).toHaveLength(2_001);
  expect(input).toEqual(before);
  const after = await captureOwnerRecoverySnapshot(scope);
  expect({ ...after, capturedAt: snapshot.capturedAt }).toEqual(snapshot);
});

it.each(['owner', 'generation', 'reset'] as const)('rejects a durable %s change while projection yields', async kind => {
  let changed = false;
  vi.stubGlobal('scheduler', { yield: async () => {
    if (changed) return;
    changed = true;
    if (kind === 'reset') {
      const next = document(); next.reset.epoch++;
      await writeOwnerCheckpoint(scope.ownerGeneration.ownerKey, 1, next, INITIAL_LEARNING_STATE, scope.ownerGeneration);
    } else {
      await transitionOwnerCheckpoint(scope.ownerGeneration, kind === 'owner' ? 'anonymous:profile-other' : scope.ownerGeneration.ownerKey,
        1, document(), INITIAL_LEARNING_STATE);
    }
  } });
  await expect(reconcileProfileHistory(scope, events(), () => true)).rejects.toBeInstanceOf(StaleOwnerGenerationError);
  expect(changed).toBe(true);
});

it('does not start a cancelled projection or read its owner', async () => {
  const read = vi.spyOn(workspace, 'currentWorkspaceScope');
  expect(await reconcileProfileHistory(scope, events(), () => false)).toBeNull();
  expect(read).not.toHaveBeenCalled();
});

it('discards a request cancelled during projection before its durable owner lookup', async () => {
  let current = true;
  const read = vi.spyOn(workspace, 'currentWorkspaceScope');
  vi.stubGlobal('scheduler', { yield: async () => { current = false; } });
  expect(await reconcileProfileHistory(scope, events(), () => current)).toBeNull();
  expect(read).not.toHaveBeenCalled();
});

it('discards a request cancelled while its final owner lookup is pending', async () => {
  let current = true;
  vi.spyOn(workspace, 'currentWorkspaceScope').mockImplementation(async () => { current = false; return scope; });
  expect(await reconcileProfileHistory(scope, events(1), () => current)).toBeNull();
});

it('rejects conflicting history before any result can be published', async () => {
  const input = events(1), read = vi.spyOn(workspace, 'currentWorkspaceScope');
  await expect(reconcileProfileHistory(scope, [...input, { ...input[0], itemId: 'conflicting-item' }], () => true)).rejects.toThrow('Conflicting');
  expect(read).not.toHaveBeenCalled();
});
