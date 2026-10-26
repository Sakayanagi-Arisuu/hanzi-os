import { createActivityHistoryEvent } from '../learning/activityHistory';
import { activityObservationValue } from './activityObservations';
import { validateAdaptiveSessionSnapshot, type AdaptiveSession } from './adaptiveSession';
import { canonicalStringify, sha256Hex } from './canonicalHash';
import type { ActiveOwnerLearningScope } from './indexedDb';
import { isAdaptiveDraftRecoveryRecordKey } from './immutableActivityRecord';
import { readWorkspace, saveWorkspaceChanges } from './workspaceSync';

export type AdaptiveDraftRecovery = { version: 1; snapshot: AdaptiveSession; draft: { response: string; ime: boolean } };
const recoveryKey = (id: string) => `activity.record:${JSON.stringify(['overview', `adaptive-recovery:${id}`])}`;
async function validate(scope: ActiveOwnerLearningScope, value: AdaptiveDraftRecovery) {
  if (!value || value.version !== 1 || !value.snapshot || !value.draft
    || Object.keys(value.draft).sort().join(',') !== 'ime,response' || typeof value.draft.response !== 'string'
    || value.draft.response.length > 4000 || typeof value.draft.ime !== 'boolean') throw new Error('Unreadable recovery draft; retain original.');
  await validateAdaptiveSessionSnapshot(value.snapshot, scope);
  const step = value.snapshot.manifest.steps[value.snapshot.cursor];
  if (step?.kind !== 'unit' || step.modality !== 'text' || step.receiptKind !== 'self-review'
    || value.snapshot.receipts.length !== value.snapshot.cursor) throw new Error('Recovery draft does not match its original step.');
  return step;
}

/** Detached learner text, never a receipt or a rebase onto another device's answer. */
export async function saveAdaptiveDraftRecovery(scope: ActiveOwnerLearningScope, snapshot: AdaptiveSession, draft: AdaptiveDraftRecovery['draft']) {
  const recovery: AdaptiveDraftRecovery = { version: 1, snapshot: structuredClone(snapshot), draft: { ...draft } };
  const step = await validate(scope, recovery), id = await sha256Hex(recovery);
  const operationId = `adaptive-recovery:${id}`;
  const event = createActivityHistoryEvent({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: scope.resetEpoch,
    operationId, sourceRecordRef: operationId, module: 'overview', category: 'session',
    sourceId: snapshot.manifest.manifestId, itemId: step.unitId, contentVersion: step.contentVersion,
    activityVersion: snapshot.manifest.binding, sourceLessonIds: [step.sourceLessonId], modality: 'text',
    occurredAt: new Date().toISOString(), details: { domain: 'adaptive-session', action: 'draft-recovery',
      sessionId: snapshot.id, revision: snapshot.revision, cursor: snapshot.cursor, measurementEligible: false } });
  const value = { ...activityObservationValue(event), adaptiveDraftRecovery: recovery };
  await saveWorkspaceChanges(scope, [{ key: recoveryKey(id), value }], existing => {
    if (!existing) return true;
    if (canonicalStringify({ ...existing.value as object, occurredAt: null }) !== canonicalStringify({ ...value, occurredAt: null })) {
      throw new Error('Conflicting recovery draft; retain the original.');
    }
    return false;
  });
}

export async function readAdaptiveDraftRecoveries(scope: ActiveOwnerLearningScope) {
  const workspace = await readWorkspace(scope);
  const result: AdaptiveDraftRecovery[] = [];
  for (const entry of workspace.entries.filter(entry => isAdaptiveDraftRecoveryRecordKey(entry.key))
    .sort((a, b) => b.changedAt - a.changedAt || b.changeId.localeCompare(a.changeId))) {
    const value = (entry.value as { adaptiveDraftRecovery?: AdaptiveDraftRecovery } | null)?.adaptiveDraftRecovery;
    if (!value) throw new Error('Unreadable recovery draft; retain original.');
    await validate(scope, value);
    if (entry.key !== recoveryKey(await sha256Hex(value))) throw new Error('Recovery draft binding changed; retain original.');
    result.push(value);
  }
  return result;
}
