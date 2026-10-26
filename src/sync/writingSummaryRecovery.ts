import type { PracticeEvidenceInput } from '../types';
import { readLocalActivityHistory } from './activityHistory';
import type { ActiveOwnerLearningScope } from './indexedDb';

export async function retainedWritingSummaryTime(scope: ActiveOwnerLearningScope, input: PracticeEvidenceInput) {
  if (input.source !== 'writing' || input.metadata?.sessionSummary !== true) return undefined;
  const retained = (await readLocalActivityHistory(scope)).find(event => event.operationId === input.idempotencyKey);
  if (!retained) return undefined;
  if (retained.module !== 'writing' || retained.sourceType !== 'business-activity' || retained.business?.category !== 'session'
    || retained.itemId !== input.activityId || retained.activityVersion !== input.activityVersion
    || retained.outcome !== 'unknown' || retained.occurredAt === null || retained.masteryEligible) {
    throw new Error('Conflicting retained writing summary; keep original history.');
  }
  return retained.occurredAt;
}
