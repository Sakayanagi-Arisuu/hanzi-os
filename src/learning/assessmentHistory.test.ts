import { expect, it } from 'vitest';
import { assessmentSessionHistoryEvent, type AssessmentHistoryAction } from './assessmentHistory';
import { isLessonHistoryEvent, projectLessonHistory } from './lessonHistory';

for (const action of ['open', 'submit', 'abandon'] as AssessmentHistoryAction[]) {
  it(`reconciles pending/rejected and confirmed assessment ${action} without turning a session into answer evidence`, () => {
    const input = { ownerKey: 'account:one', resetEpoch: 3, contentVersion: 'old-content', operationId: `session-${action}`,
      action, sourceRecordRef: 'real-journal', sessionAlias: 'local-alias' };
    const pending = assessmentSessionHistoryEvent(input);
    const rejected = assessmentSessionHistoryEvent({ ...input, quarantined: true });
    expect(isLessonHistoryEvent(pending)).toBe(true);
    expect(rejected.confirmationState).toBe('quarantined');
    const receipt = { protocolVersion: 1, idempotencyKey: input.operationId, resetEpoch: 3, contentVersion: 'old-content',
      sessionId: 'server-session', formVersion: 'old-form', formHash: 'sha256:old-hash',
      status: { open: 'started', submit: 'submitted', abandon: 'abandoned' }[action],
      [{ open: 'startedAt', submit: 'submittedAt', abandon: 'abandonedAt' }[action]]: '2026-10-19T00:00:00Z' };
    const confirmed = assessmentSessionHistoryEvent({ ...input, receipt });
    expect(isLessonHistoryEvent(confirmed)).toBe(true);
    expect(confirmed).toMatchObject({ score: null, outcome: 'unknown', masteryEligible: false, confirmationState: 'confirmed',
      authority: 'server-recorded', revisionId: 'old-form', sessionId: 'server-session', business: { category: 'session' } });
    expect(projectLessonHistory({ ownerKey: input.ownerKey, resetEpoch: 3 }, [pending, confirmed, confirmed])).toEqual([confirmed]);
    expect(() => assessmentSessionHistoryEvent({ ...input, receipt: { ...receipt, resetEpoch: 2 } })).toThrow('retain');
    expect(() => assessmentSessionHistoryEvent({ ...input, receipt: { ...receipt, idempotencyKey: 'other' } })).toThrow('retain');
  });
}
