import { createActivityHistoryEvent } from './activityHistory';
import type { LessonHistoryEventV1 } from './lessonHistory';

export type AssessmentHistoryAction = 'open' | 'submit' | 'abandon';
export function assessmentSessionHistoryEvent(input: { ownerKey: string; resetEpoch: number; operationId: string;
  contentVersion: string; action: AssessmentHistoryAction; sourceRecordRef: string; receipt?: unknown;
  quarantined?: boolean; sessionAlias?: string }): LessonHistoryEventV1 {
  const receipt = input.receipt as Record<string, unknown> | undefined;
  const status = { open: 'started', submit: 'submitted', abandon: 'abandoned' }[input.action];
  const timeKey = { open: 'startedAt', submit: 'submittedAt', abandon: 'abandonedAt' }[input.action];
  if (receipt && (receipt.protocolVersion !== 1 || receipt.idempotencyKey !== input.operationId
    || receipt.contentVersion !== input.contentVersion || receipt.resetEpoch !== input.resetEpoch || receipt.status !== status
    || typeof receipt.sessionId !== 'string' || !receipt.sessionId || typeof receipt.formVersion !== 'string'
    || typeof receipt.formHash !== 'string' || typeof receipt[timeKey] !== 'string' || !Number.isFinite(Date.parse(receipt[timeKey] as string)))) {
    throw new Error('Unsupported assessment session receipt; retain source.');
  }
  const event = createActivityHistoryEvent({ ...input, module: 'assessment', category: 'session',
    sourceId: `assessment-session:${input.operationId}`, itemId: input.operationId, activityVersion: 'assessment-session-v1',
    occurredAt: receipt ? receipt[timeKey] as string : null,
    details: { requestedAction: input.action, status: receipt ? status : input.quarantined ? 'rejected' : 'pending',
      formVersion: receipt ? receipt.formVersion as string : null, scoringPolicyVersion: receipt?.scoringPolicyVersion as string ?? null } });
  return { ...event, sessionId: receipt ? receipt.sessionId as string : input.sessionAlias ?? null,
    formHash: receipt ? receipt.formHash as string : null, revisionId: receipt ? receipt.formVersion as string : null,
    confirmationState: receipt ? 'confirmed' : input.quarantined ? 'quarantined' : 'provisional',
    authority: receipt ? 'server-recorded' : 'unknown', clockSource: receipt ? 'server-received' : 'unknown',
    receiptRef: receipt ? `assessment-session:${receipt.sessionId}:${input.operationId}` : null };
}
