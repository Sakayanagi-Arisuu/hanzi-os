import { createActivityHistoryEvent } from '../learning/activityHistory';
import { isLessonHistoryEvent, projectLessonHistory, type LessonHistoryEventV1 } from '../learning/lessonHistory';
import type { LocalPageCorrection } from '../mistakes/localPageMistakes';
import { updateLessonResume, type OwnerScopedCacheScope } from './indexedDb';

export const PAGE_CORRECTION_HISTORY_PREFIX = 'page-correction-history:v1:';
export async function persistPageCorrectionHistory(scope: OwnerScopedCacheScope, correction: LocalPageCorrection,
  operationId: string, lessonId: string, itemId: string, contentVersion: string) {
  const owner = { ownerKey: scope.expectedOwnerGeneration.ownerKey, resetEpoch: scope.resetEpoch };
  const event = createActivityHistoryEvent({ ...owner, operationId, module: 'mistakes', category: 'objective',
    sourceId: lessonId, sourceLessonIds: [lessonId], itemId, contentVersion, activityVersion: contentVersion,
    occurredAt: new Date(correction.occurredAt).toISOString(), sourceRecordRef: scope.entryKey,
    outcome: correction.correct ? 'correct' : 'incorrect', hint: correction.usedHint, modality: 'text' });
  const committed = { ...event, authority: 'local-practice' as const, lineage: 'guest-business-commit' as const };
  return updateLessonResume(scope, previous => {
    const saved = previous as Partial<LocalPageCorrection> | undefined;
    if (saved !== undefined && (saved?.version !== 1 || typeof saved.originAt !== 'number' || typeof saved.occurredAt !== 'number')) throw new Error('Unreadable correction; retain source.');
    if (saved?.originAt === correction.originAt && saved.occurredAt! > correction.occurredAt) throw new Error('Correction changed in another tab.');
    return correction;
  }, { entryKey: `${PAGE_CORRECTION_HISTORY_PREFIX}${scope.entryKey}`, update: previous => {
    if (previous !== undefined && (!Array.isArray(previous) || !previous.every(isLessonHistoryEvent))) throw new Error('Unreadable correction journal; retain source.');
    return projectLessonHistory(owner, [...(previous as LessonHistoryEventV1[] | undefined ?? []), committed]);
  } });
}
