import {
  createLessonHistoryEvent, projectLessonHistory, type LessonHistoryEventV1, type LessonHistoryPageV1,
} from "../learning/lessonHistory";
import type { EvidenceMethod, Skill } from "../types";
import type { D1Database } from "./d1";
import { requireCurrentLearningResetEpoch } from "./learningResetEpoch";
import {pageCommandHistoryEvent} from '../learning/lessonPageHistory';
import {isPageObservation,type PageAttemptCommand} from '../learning/pageAttemptCommand';

type HistoryRow = {
  attemptId: string; operationId: string | null; lessonId: string | null; sessionId: string | null; formHash: string | null;
  installationId: string | null; contentVersion: string; activityId: string; activityVersion: string;
  method: EvidenceMethod; skill: Skill; outcome: "correct" | "incorrect"; score: number;
  usedHint: number; priorExposure: number; occurredAt: number; receivedAt: number;
  pageSource: number; responseJson:string|null; revisionId:string|null;
};

export class LessonHistoryRepository {
  constructor(private database: D1Database) {}

  async readPage(userId: string, ownerKey: string, resetEpoch: number, options: {
    limit?: number; cursor?: LessonHistoryPageV1["nextCursor"];
  } = {}): Promise<LessonHistoryPageV1> {
    const limit = options.limit ?? 50;
    const cursor = options.cursor;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100
      || (cursor && (!Number.isSafeInteger(cursor.receivedAt) || cursor.receivedAt < 0
        || typeof cursor.attemptId !== "string" || !cursor.attemptId || cursor.attemptId.length > 160)))
      throw new TypeError("Invalid lesson history page cursor or limit.");
    await requireCurrentLearningResetEpoch(this.database, userId, resetEpoch);
    const result = await this.database.prepare(`SELECT * FROM (SELECT a.id AS attemptId, i.idempotency_key AS operationId,
      s.lesson_id AS lessonId, a.session_id AS sessionId, s.form_manifest_hash AS formHash,
      d.installation_id AS installationId, a.content_version AS contentVersion, a.activity_id AS activityId,
      a.activity_version AS activityVersion, a.method, a.skill, a.outcome, a.score,
      a.used_hint AS usedHint, a.prior_exposure AS priorExposure, a.occurred_at AS occurredAt, a.received_at AS receivedAt,
      0 AS pageSource,NULL AS responseJson,NULL AS revisionId
      FROM learning_attempts a
      LEFT JOIN idempotency_records i ON i.id=a.idempotency_record_id AND i.user_id=a.user_id AND i.reset_epoch=a.reset_epoch
      LEFT JOIN lesson_sessions s ON s.id=a.session_id AND s.user_id=a.user_id AND s.reset_epoch=a.reset_epoch
      LEFT JOIN devices d ON d.id=a.device_id AND d.user_id=a.user_id
      WHERE a.user_id=? AND a.reset_epoch=? AND a.source='lesson'
      UNION ALL SELECT p.id,p.idempotency_key,p.lesson_id,NULL,NULL,NULL,p.activity_version,p.activity_id,p.activity_version,
      NULL,NULL,p.outcome,NULL,NULL,NULL,p.occurred_at,p.created_at,1,p.response_json,p.revision_id
      FROM lesson_page_attempts p WHERE p.user_id=? AND p.reset_epoch=?)
      ${cursor ? "WHERE (receivedAt < ? OR (receivedAt = ? AND attemptId < ?))" : ""}
      ORDER BY receivedAt DESC,attemptId DESC LIMIT ?`).bind(userId, resetEpoch,userId,resetEpoch,
        ...(cursor ? [cursor.receivedAt, cursor.receivedAt, cursor.attemptId] : []), limit + 1).all<HistoryRow>();
    if (!result.success || !Array.isArray(result.results)) throw new Error("Lesson history read failed.");
    await requireCurrentLearningResetEpoch(this.database, userId, resetEpoch);
    const rows = result.results.slice(0, limit);
    const events = rows.map((row): LessonHistoryEventV1 => {
      if(row.pageSource){
        if(!row.operationId||!row.lessonId||!row.responseJson)throw new Error('Page business source is incomplete; retain it.');
        const response=JSON.parse(row.responseJson);
        if(response.observation!==undefined&&!isPageObservation(response.observation))throw new Error('Unsupported page business version; retain it.');
        if(typeof response.text!=='string'||!Array.isArray(response.answerIds)
          ||['usedHint','priorFeedback','priorReveal'].some(key=>typeof response[key]!=='boolean'))throw new Error('Invalid page business response; retain it.');
        const command:PageAttemptCommand={version:1,idempotencyKey:row.operationId,resetEpoch,lessonId:row.lessonId,
          activityId:row.activityId,activityVersion:row.activityVersion,occurredAt:String(row.occurredAt),response,
          ...(response.observation?{observation:response.observation}:{})};
        const base=pageCommandHistoryEvent(ownerKey,command);
        const observation=command.observation;
        return {...base,taskType:!observation&&String(row.outcome)==='self-review'?'page-self-review':base.taskType,
          outcome:observation?base.outcome:row.outcome,score:observation?null:row.outcome==='correct'?100:row.outcome==='incorrect'?0:null,
          attemptId:row.attemptId,receiptRef:row.attemptId,revisionId:row.revisionId==='unknown'?null:row.revisionId,
          receivedAt:new Date(row.receivedAt).toISOString(),sourceRecordRef:row.attemptId,lineage:'server-business-record',
          authority:observation?'server-recorded':'server-verified',confirmationState:'confirmed'};
      }
      if (!row.operationId || !row.lessonId || !row.sessionId)
        throw new Error("Legacy lesson attempt lacks its source binding; retain business records.");
      const event = createLessonHistoryEvent({ ownerKey, resetEpoch, operationId: row.operationId,
        lessonId: row.lessonId, contentVersion: row.contentVersion, activityId: row.activityId,
        activityVersion: row.activityVersion, method: row.method, occurredAt: new Date(row.occurredAt).toISOString() });
      return { ...event, installationId: row.installationId, sessionId: row.sessionId, formHash: row.formHash,
        contextRef: row.sessionId, attemptId: row.attemptId, skill: row.skill, outcome: row.outcome, score: row.score,
        assistance: { ...event.assistance, hint: row.usedHint === 1, priorExposure: row.priorExposure === 1 },
        receivedAt: new Date(row.receivedAt).toISOString(), sourceRecordRef: row.attemptId,
        lineage: "server-business-record", authority: "server-verified", confirmationState: "confirmed", receiptRef: row.attemptId };
    });
    projectLessonHistory({ ownerKey, resetEpoch }, events);
    const last = rows.at(-1);
    return { schemaVersion: 1, ownerKey, resetEpoch, events,
      nextCursor: result.results.length > limit && last ? { receivedAt: last.receivedAt, attemptId: last.attemptId } : null };
  }
}
