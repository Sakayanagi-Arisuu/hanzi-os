import { createLessonHistoryEvent, lessonHistoryEventId, type HistoryCategory, type HistoryModule, type LessonHistoryEventV1 } from './lessonHistory';
import type { LearningEvidence } from '../types';

export type ActivityHistoryInput = {
  ownerKey: string; resetEpoch: number; operationId: string; module: HistoryModule;
  category: HistoryCategory; sourceId: string; itemId: string; contentVersion: string;
  activityVersion: string; sourceRecordRef: string; occurredAt: string | null;
  sourceLessonIds?: string[]; outcome?: LessonHistoryEventV1['outcome'];
  hint?: boolean | null; reveal?: boolean | null; modality?: LessonHistoryEventV1['modality'];
  details?: Record<string, string | number | boolean | null>;
  skill?: LessonHistoryEventV1['skill'];
};

export function createActivityHistoryEvent(input: ActivityHistoryInput): LessonHistoryEventV1 {
  const base = createLessonHistoryEvent({ ...input, lessonId: input.sourceId,
    activityId: input.itemId, method: 'reading-comprehension', occurredAt: input.occurredAt ?? '' });
  const eventId = lessonHistoryEventId(input.ownerKey, input.resetEpoch, input.operationId, 'business-activity');
  const outcome = input.outcome ?? (input.category === 'self-review' ? 'self-review' : 'unknown');
  return { ...base, eventId, logicalActivityId: eventId, module: input.module, sourceType: 'business-activity',
    business: { version: 1, category: input.category, ...(input.details ? { details: input.details } : {}) }, sourceLessonIds: input.sourceLessonIds ?? [],
    taskType: `record-${input.category}`, itemId: input.itemId, outcome,
    score: outcome === 'correct' ? 100 : outcome === 'incorrect' ? 0 : null,
    firstResponseRef: input.category === 'objective' ? input.sourceRecordRef : null,
    occurredAt: input.occurredAt, clockSource: input.occurredAt ? 'device-reported' : 'unknown',
    modality: input.modality ?? 'unknown', skill: input.skill ?? null, sourceRecordRef: input.sourceRecordRef,
    assistance: { ...base.assistance, hint: input.hint ?? null, reveal: input.reveal ?? null,
      tts: input.details?.syntheticTts === true ? true : null } };
}

export function guestActivityHistoryEvent(input: { ownerKey: string; resetEpoch: number; evidence: LearningEvidence;
  installationId?: string; deviceId?: string }): LessonHistoryEventV1 {
  const evidence = input.evidence;
  const moduleBySource = { mistake: 'mistakes', reader: 'reader', writing: 'writing', pronunciation: 'speech', diagnostic: 'assessment' } as const;
  if (!Object.hasOwn(moduleBySource, evidence.source)) throw new Error('Unsupported business history source; retain evidence.');
  const summary = evidence.source === 'reader' && evidence.activityId.startsWith('reader-library:')
    || evidence.source === 'writing' && evidence.metadata?.sessionSummary === true;
  const objective = !summary && ['meaning-selection', 'phonology-recognition', 'listening-selection', 'typed-character-recall', 'reading-comprehension', 'remediation-recall', 'diagnostic-selection'].includes(evidence.method);
  const metadata = evidence.metadata;
  const detailKeys = ['sourceLessonId', 'assistanceLevel', 'usedPaper', 'needsReplay', 'hanzi', 'sourceWordId', 'scoringMethod',
    'transcriptMatchPercent', 'itemVersion', 'sourceItemVersion', 'syntheticTts', 'construct', 'formVersion', 'presentationVersion', 'sessionSummary'];
  const details = Object.fromEntries(Object.entries(metadata ?? {}).filter(([key]) => detailKeys.includes(key)));
  const event = createActivityHistoryEvent({ ...input, operationId: evidence.idempotencyKey,
    module: moduleBySource[evidence.source as keyof typeof moduleBySource],
    category: summary ? 'session' : objective ? 'objective' : 'self-review', sourceId: evidence.activityId, itemId: evidence.activityId,
    contentVersion: evidence.contentVersion, activityVersion: evidence.activityVersion, sourceRecordRef: evidence.id,
    occurredAt: Number.isFinite(Date.parse(evidence.occurredAt)) ? evidence.occurredAt : null,
    outcome: objective && ['correct', 'incorrect'].includes(evidence.outcome) ? evidence.outcome as 'correct' | 'incorrect' : objective || summary ? 'unknown' : 'self-review',
    skill: evidence.skill,
    hint: typeof metadata?.usedHint === 'boolean' ? metadata.usedHint : null,
    reveal: typeof metadata?.revealed === 'boolean' ? metadata.revealed : null,
    details,
    sourceLessonIds: typeof metadata?.lessonId === 'string' ? [metadata.lessonId] : [],
    modality: evidence.method === 'listening-selection' ? 'audio' : evidence.source === 'pronunciation' ? 'speech' : evidence.source === 'writing' ? 'handwriting' : 'text' });
  return { ...event, authority: 'local-practice', lineage: 'guest-business-commit',
    installationId: input.installationId ?? null, deviceId: input.deviceId ?? null };
}
