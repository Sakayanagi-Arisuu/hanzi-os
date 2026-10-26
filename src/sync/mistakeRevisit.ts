import type { RemediationObservatoryItem } from '../mistakes/remediationObservatory';
import type { ActiveOwnerLearningScope } from './indexedDb';
import { saveDescriptiveActivity } from './activityObservations';

export async function saveMistakeRevisit(scope: ActiveOwnerLearningScope, item: RemediationObservatoryItem, operationId: string) {
  if (!item.referenceLessonId) throw new Error('Missing original lesson; retain source.');
  await saveDescriptiveActivity(scope, { operationId, module: 'mistakes', category: 'support',
    sourceId: item.referenceLessonId, sourceLessonIds: [item.referenceLessonId], itemId: item.id,
    contentVersion: item.contentVersion ?? 'unknown', activityVersion: item.activityVersion ?? 'unknown',
    modality: 'text', skill: item.skill, details: { kind: 'origin-revisit', navigation: 'requested', originSource: item.originSource,
      measurementEligible: false } });
}
