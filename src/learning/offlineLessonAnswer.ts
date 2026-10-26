import type { LessonSessionAuthorityBindingV1 } from './lessonSessionProtocol';
import type { LearningCommandOutboxRecord } from '../sync/learningCommandOutbox';

/** Durable pending answers may advance the UI, but never count as a score. */
export function isSavedLessonAnswer(record: LearningCommandOutboxRecord,
  binding: LessonSessionAuthorityBindingV1, commandId: string, sessionAlias: string, position: number) {
  const activity = binding.form.activities[position];
  return Boolean(activity && record.kind === 'objective-attempt' && record.status === 'pending'
    && record.commandId === commandId && record.sessionAlias === sessionAlias
    && record.resetEpoch === binding.resetEpoch && record.command.resetEpoch === binding.resetEpoch
    && record.command.contentVersion === binding.contentVersion && record.command.source === 'lesson'
    && record.command.activityId === activity.activityId && record.command.activityVersion === activity.activityVersion
    && record.command.method === activity.method && record.command.response.kind === 'answer');
}
