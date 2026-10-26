import { createActivityHistoryEvent } from '../learning/activityHistory';
import { assessmentSessionHistoryEvent, type AssessmentHistoryAction } from '../learning/assessmentHistory';
import { projectLessonHistory, type HistoryModule, type LessonHistoryPageV1, type LessonHistoryEventV1 } from '../learning/lessonHistory';
import { isWorkspaceHistoryDescriptor, workspaceHistoryEvent, workspaceHistoryReceiptRef } from '../sync/workspaceHistory';
import { workspaceHistoryEntry } from '../sync/workspaceHistory';
import type { Skill } from '../types';
import type { D1Database } from './d1';
import { requireCurrentLearningResetEpoch } from './learningResetEpoch';

type Row = { id: string; operationId: string | null; contentVersion: string; activityId: string; activityVersion: string;
  source: string; method: string; skill: Skill | null; outcome: string; usedHint: number | null; priorExposure: number | null;
  occurredAt: number | null; receivedAt: number; valueJson: string | null };
const moduleBySource: Record<string, HistoryModule> = { mistake: 'mistakes', reader: 'reader', diagnostic: 'assessment', writing: 'writing', pronunciation: 'speech' };

export class ActivityHistoryRepository {
  constructor(private database: D1Database) {}
  async readPage(userId: string, ownerKey: string, resetEpoch: number,
    options: { limit?: number; cursor?: LessonHistoryPageV1['nextCursor'] } = {}): Promise<LessonHistoryPageV1> {
    const limit = options.limit ?? 50, cursor = options.cursor;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 || cursor && (!Number.isSafeInteger(cursor.receivedAt)
      || cursor.receivedAt < 0 || typeof cursor.attemptId !== 'string' || !cursor.attemptId || cursor.attemptId.length > 500)) throw new TypeError('Invalid history cursor or limit');
    await requireCurrentLearningResetEpoch(this.database, userId, resetEpoch);
    const result = await this.database.prepare(`SELECT * FROM (
      SELECT attempt.id,idempotency.idempotency_key AS operationId,attempt.content_version AS contentVersion,
      attempt.activity_id AS activityId,attempt.activity_version AS activityVersion,attempt.source,attempt.method,attempt.skill,
      attempt.outcome,attempt.used_hint AS usedHint,attempt.prior_exposure AS priorExposure,attempt.occurred_at AS occurredAt,
      attempt.received_at AS receivedAt,NULL AS valueJson FROM learning_attempts attempt
      LEFT JOIN idempotency_records idempotency ON idempotency.id=attempt.idempotency_record_id
        AND idempotency.user_id=attempt.user_id AND idempotency.reset_epoch=attempt.reset_epoch
      WHERE attempt.user_id=? AND attempt.reset_epoch=? AND attempt.source NOT IN ('lesson','review')
      UNION ALL SELECT attempt.id,idempotency.idempotency_key,attempt.content_version,attempt.item_id,attempt.item_version,
      'diagnostic','diagnostic-selection',attempt.skill,CASE WHEN session.status='submitted' THEN attempt.outcome ELSE 'unknown' END,
      NULL,NULL,attempt.occurred_at,attempt.received_at,NULL FROM assessment_attempts attempt
      JOIN assessment_sessions session ON session.id=attempt.session_id AND session.user_id=attempt.user_id AND session.reset_epoch=attempt.reset_epoch
      LEFT JOIN idempotency_records idempotency ON idempotency.id=attempt.idempotency_record_id
        AND idempotency.user_id=attempt.user_id AND idempotency.reset_epoch=attempt.reset_epoch
      WHERE attempt.user_id=? AND attempt.reset_epoch=?
      UNION ALL SELECT id,idempotency_key,json_extract(response_json,'$.contentVersion'),idempotency_key,'assessment-session-v1',
      'assessment-session-receipt',scope,NULL,'unknown',NULL,NULL,NULL,COALESCE(completed_at,updated_at),response_json
      FROM idempotency_records WHERE user_id=? AND reset_epoch=? AND status='completed' AND response_json IS NOT NULL
      AND scope IN ('assessment-session-open-v1','assessment-session-submit-v1','assessment-session-abandon-v1')
      UNION ALL SELECT entry_key,NULL,'unknown',entry_key,'unknown','workspace','unknown',NULL,'unknown',NULL,NULL,NULL,
      changed_at,value_json FROM learner_workspace_entries WHERE user_id=? AND reset_epoch=? AND entry_key LIKE 'history.activity:%'
      UNION ALL SELECT entry_key,change_id,'unknown',entry_key,'unknown','workspace-source','unknown',NULL,'unknown',NULL,NULL,NULL,
      changed_at,value_json FROM learner_workspace_entries source WHERE user_id=? AND reset_epoch=?
      AND (entry_key LIKE 'reader.answer:%' OR entry_key LIKE 'reader.support:%' OR entry_key LIKE 'reader.saved:%'
        OR entry_key LIKE 'reader.bookmark:%' OR entry_key LIKE 'practice.correction:%' OR entry_key LIKE 'access:%' OR entry_key LIKE 'exam.practice:%')
      AND NOT EXISTS (SELECT 1 FROM learner_workspace_entries history WHERE history.user_id=source.user_id AND history.reset_epoch=source.reset_epoch
        AND history.entry_key=CASE WHEN source.entry_key LIKE 'exam.practice:%'
          THEN 'history.activity:mock-result:' || substr(source.entry_key,length('exam.practice:')+1)
          ELSE 'history.activity:' || source.change_id END)
      ) ${cursor ? 'WHERE (receivedAt<? OR (receivedAt=? AND id<?))' : ''}
      ORDER BY receivedAt DESC,id DESC LIMIT ?`).bind(userId, resetEpoch, userId, resetEpoch, userId, resetEpoch, userId, resetEpoch, userId, resetEpoch,
      ...(cursor ? [cursor.receivedAt, cursor.receivedAt, cursor.attemptId] : []), limit + 1).all<Row>();
    if (!result.success || !Array.isArray(result.results)) throw new Error('History unavailable; retain source.');
    const rows = result.results.slice(0, limit);
    const events = rows.map((row): LessonHistoryEventV1 => {
      if (row.source === 'assessment-session-receipt') {
        const action = row.method.slice('assessment-session-'.length, -'-v1'.length) as AssessmentHistoryAction;
        return { ...assessmentSessionHistoryEvent({ ownerKey, resetEpoch, operationId: row.operationId!, contentVersion: row.contentVersion,
          action, sourceRecordRef: row.id, receipt: JSON.parse(row.valueJson!) }),
          lineage: 'server-business-record', receivedAt: new Date(row.receivedAt).toISOString() };
      }
      if (row.source === 'workspace' || row.source === 'workspace-source') {
        const source = JSON.parse(row.valueJson!);
        const value: unknown = row.source === 'workspace' ? source : workspaceHistoryEntry({ key: row.id,
          value: source, changedAt: row.receivedAt, changeId: row.operationId! })?.value;
        if (!isWorkspaceHistoryDescriptor(value)) throw new Error('Unsupported history descriptor; retain source.');
        return { ...workspaceHistoryEvent(ownerKey, resetEpoch, value), authority: 'server-recorded',
          confirmationState: 'confirmed', receiptRef: workspaceHistoryReceiptRef(value), lineage: 'server-business-record' };
      }
      const module = moduleBySource[row.source];
      if (!module) throw new Error('Unknown business source; retain records.');
      const objective = ['correct', 'incorrect'].includes(row.outcome);
      const event = createActivityHistoryEvent({ ownerKey, resetEpoch, operationId: row.operationId ?? `legacy-attempt:${row.id}`,
        module, category: 'objective', sourceId: row.activityId, itemId: row.activityId, contentVersion: row.contentVersion,
        activityVersion: row.activityVersion, occurredAt: row.occurredAt === null ? null : new Date(row.occurredAt).toISOString(),
        sourceRecordRef: row.id, outcome: objective ? row.outcome as 'correct' | 'incorrect' : 'unknown',
        hint: row.usedHint === null ? null : row.usedHint === 1, modality: row.method === 'listening-selection' ? 'audio' : 'text' });
      return { ...event, skill: row.skill, attemptId: row.id, receiptRef: row.id,
        assistance: { ...event.assistance, priorExposure: row.priorExposure === null ? null : row.priorExposure === 1 },
        receivedAt: new Date(row.receivedAt).toISOString(), authority: objective ? 'server-verified' : 'server-recorded',
        lineage: 'server-business-record', confirmationState: 'confirmed' };
    });
    projectLessonHistory({ ownerKey, resetEpoch }, events);
    await requireCurrentLearningResetEpoch(this.database, userId, resetEpoch);
    const last = rows.at(-1);
    return { schemaVersion: 1, ownerKey, resetEpoch, events,
      nextCursor: result.results.length > limit && last ? { receivedAt: last.receivedAt, attemptId: last.id } : null };
  }
}
