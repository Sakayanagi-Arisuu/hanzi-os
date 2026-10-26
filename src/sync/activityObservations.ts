import { createActivityHistoryEvent, guestActivityHistoryEvent, type ActivityHistoryInput } from '../learning/activityHistory';
import { isLessonHistoryEvent, type LessonHistoryEventV1 } from '../learning/lessonHistory';
import { CONTENT_VERSION } from '../data/contentIdentity';
import type { PracticeEvidenceInput } from '../types';
import type { ActiveOwnerLearningScope } from './indexedDb';
import { canonicalStringify } from './canonicalHash';
import { saveWorkspaceChanges } from './workspaceSync';

export async function savePracticeObservation(scope: ActiveOwnerLearningScope, input: PracticeEvidenceInput) {
  const occurredAt = new Date().toISOString();
  const event = guestActivityHistoryEvent({ ownerKey: scope.ownerGeneration.ownerKey, resetEpoch: scope.resetEpoch,
    evidence: { ...input, schemaVersion: 1, id: input.idempotencyKey, contentVersion: input.contentVersion ?? CONTENT_VERSION,
      occurredAt, verified: false, masteryEligible: false } });
  await saveActivityObservation(scope, event);
}

export async function saveDescriptiveActivity(scope: ActiveOwnerLearningScope,
  input: Omit<ActivityHistoryInput, 'ownerKey' | 'resetEpoch' | 'sourceRecordRef' | 'occurredAt'>) {
  await saveActivityObservation(scope, createActivityHistoryEvent({ ...input, ownerKey: scope.ownerGeneration.ownerKey,
    resetEpoch: scope.resetEpoch, occurredAt: new Date().toISOString(), sourceRecordRef: input.operationId }));
}

async function saveActivityObservation(scope: ActiveOwnerLearningScope, event: LessonHistoryEventV1) {
  const value = activityObservationValue(event);
  await saveWorkspaceChanges(scope, [{ key: `activity.record:${JSON.stringify([event.module, event.operationId])}`, value }], (existing, next) => {
    if (!existing) return true;
    const saved = existing.value as typeof value;
    const comparable = { ...next as typeof value, occurredAt: null };
    if (saved?.skill === undefined) delete comparable.skill;
    if (!saved || saved.version !== 1 || canonicalStringify({ ...saved, occurredAt: null }) !== canonicalStringify(comparable)) throw new Error('Conflicting practice observation; retain first activity.');
    return false;
  });
}

export function activityObservationValue(event: LessonHistoryEventV1) {
  const value = { version: 1, operationId: event.operationId, module: event.module,
    category: event.business!.category, sourceId: event.sourceId, itemId: event.itemId,
    contentVersion: event.contentVersion, activityVersion: event.activityVersion, occurredAt: event.occurredAt,
    ...(event.sourceLessonIds.length ? { sourceLessonIds: event.sourceLessonIds } : {}),
    outcome: event.outcome, hint: event.assistance.hint, reveal: event.assistance.reveal, modality: event.modality,
    ...(event.skill !== null ? { skill: event.skill } : {}), details: event.business!.details ?? {} };
  if (!isLessonHistoryEvent(event)) throw new Error('Unsupported practice observation; retain source.');
  return value;
}
