import { isLessonHistoryEvent, type LessonHistoryEventV1 } from '../learning/lessonHistory';

const fields = ['schemaVersion', 'eventId', 'logicalActivityId', 'operationId', 'eventKind', 'ownerKey', 'resetEpoch', 'installationId', 'deviceId',
  'module', 'sourceType', 'business', 'review', 'sourceId', 'sourceLessonIds', 'contentVersion', 'activityVersion', 'itemId', 'sessionId', 'formHash',
  'revisionId', 'contextRef', 'attemptId', 'parentEventId', 'skill', 'modality', 'taskType', 'outcome', 'score', 'firstResponseRef', 'assistance',
  'occurredAt', 'receivedAt', 'timezone', 'clockSource', 'duration', 'producerVersion', 'sourceRecordRef', 'lineage', 'humanReviewed', 'measurementPolicyId',
  'authority', 'confirmationState', 'receiptRef', 'masteryEligible'] as const satisfies readonly (keyof LessonHistoryEventV1)[];
// A new domain field must be accounted for before a view can discard extras.
const complete: Exclude<keyof LessonHistoryEventV1, typeof fields[number]> extends never ? true : never = true;
const scalar = (value: unknown) => value === undefined || value === null || typeof value === 'string' || typeof value === 'boolean'
  || typeof value === 'number' && Number.isFinite(value);

/** Unknown raw metadata remains in its source journal. A display projection
 * must not duplicate unknown Blob/buffer properties or array metadata. */
export function historyViewEvent(event: LessonHistoryEventV1): LessonHistoryEventV1 {
  if (!complete || !isLessonHistoryEvent(event)) throw Error('Unsupported history event; retain original journal.');
  const result = Object.fromEntries(fields.filter(key => Object.hasOwn(event, key)).map(key => [key, event[key]])) as LessonHistoryEventV1;
  result.sourceLessonIds = event.sourceLessonIds.map(id => id);
  const { hint, reveal, translation, pinyin, ime, tts, priorExposure } = event.assistance;
  result.assistance = { hint, reveal, translation, pinyin, ime, tts, priorExposure };
  if (event.business) {
    if (!scalar(event.business.version) || !scalar(event.business.category)
      || event.business.details !== undefined && (!event.business.details || typeof event.business.details !== 'object'
        || Object.values(event.business.details).some(value => value === undefined || !scalar(value)))) throw Error('Unsupported history metadata; retain original journal.');
    result.business = { version: event.business.version, category: event.business.category,
      ...(event.business.details === undefined ? {} : { details: Object.fromEntries(Object.entries(event.business.details)) }) };
  }
  if (event.review) {
    const { cardId, wordId, wordVersion, cardRevision, nextCardRevision, schedulerVersion, rating, ratingKind,
      reviewModality, scheduledAt, nextDueAt, reportedDurationMs } = event.review;
    result.review = { cardId, wordId, wordVersion, cardRevision, nextCardRevision, schedulerVersion, rating, ratingKind,
      reviewModality, scheduledAt, nextDueAt, reportedDurationMs };
    if (!Object.values(result.review).every(scalar)) throw Error('Unsupported review metadata; retain original journal.');
  }
  return result;
}
