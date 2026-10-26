import type { OfflineMockRun } from '../assessment/offlineMockPractice';
import { createActivityHistoryEvent } from './activityHistory';
import type { LessonHistoryEventV1 } from './lessonHistory';

export function mockPracticeHistoryEvents(ownerKey: string, resetEpoch: number, runs: readonly OfflineMockRun[]): LessonHistoryEventV1[] {
  return runs.flatMap(run => {
    const make = (stage: 'started' | 'submitted', occurredAt: string) => {
      if (!Number.isFinite(Date.parse(occurredAt))) throw new Error('Unreadable mock activity time; retain run.');
      const confirmed = stage === 'submitted' && Boolean(run.result);
      const operationId = `mock-session:${run.id}:${stage}`;
      const event = createActivityHistoryEvent({ ownerKey, resetEpoch, operationId, module: 'assessment', category: 'session',
        sourceId: run.id, itemId: run.id, contentVersion: run.package.contentVersion, activityVersion: 'mock-practice-session-v1',
        occurredAt, sourceRecordRef: `offline-mock:${run.id}`, details: { status: stage === 'submitted' && !confirmed ? 'pending' : stage,
          scoring: confirmed ? 'server-recorded-practice' : 'unknown', measurementEligible: false } });
      return { ...event, sessionId: run.id, formHash: run.package.formHash, revisionId: run.package.form.formVersion,
        confirmationState: confirmed ? 'confirmed' as const : 'provisional' as const,
        authority: confirmed ? 'server-recorded' as const : 'unknown' as const,
        receiptRef: confirmed ? operationId : null };
    };
    const events: LessonHistoryEventV1[] = [make('started', run.startedAt)];
    if (run.submittedAt) events.push(make('submitted', run.submittedAt));
    for (const answer of run.answers) {
      const item = run.package.form.items[answer.position];
      if (!item || item.itemId !== answer.itemId || item.itemVersion !== answer.itemVersion) throw new Error('Unreadable mock answer binding; retain run.');
      const result = run.result?.review.find(candidate => candidate.position === answer.position && candidate.itemId === answer.itemId && candidate.itemVersion === answer.itemVersion);
      const event = createActivityHistoryEvent({ ownerKey, resetEpoch, operationId: `mock-answer:${run.id}:${answer.position}`,
        module: 'assessment', category: 'objective', sourceId: run.id, itemId: item.itemId, contentVersion: run.package.contentVersion,
        activityVersion: item.itemVersion, occurredAt: answer.occurredAt, sourceRecordRef: `offline-mock:${run.id}:${answer.position}`,
        outcome: result ? result.correct ? 'correct' : 'incorrect' : 'unknown', modality: item.modality === 'synthetic-tts-selection' ? 'audio' : 'text',
        details: { deviceTimed: true, measurementEligible: false, syntheticTts: item.modality === 'synthetic-tts-selection' } });
      events.push({ ...event, sessionId: run.id, formHash: run.package.formHash, skill: item.skill,
        confirmationState: result ? 'confirmed' : 'provisional', authority: result ? 'server-recorded' : 'unknown',
        receiptRef: result ? `mock-answer:${run.id}:${answer.position}` : null });
    }
    return events;
  });
}
