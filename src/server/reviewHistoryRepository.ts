import {createReviewHistoryEvent} from '../learning/reviewHistory';
import {projectLessonHistory,type LessonHistoryPageV1} from '../learning/lessonHistory';
import {isReviewHistoryContext} from '../learning/reviewProtocol';
import {requireCurrentLearningResetEpoch} from './learningResetEpoch';
import type {D1Database} from './d1';

type Row={id:string;operationId:string|null;cardId:string;wordId:string|null;wordVersion:string|null;contentVersion:string|null;
  modality:string|null;rating:number|null;schedulerVersion:string|null;scheduledAt:number|null;reviewedAt:number|null;
  receivedAt:number;durationMs:number|null;preJson:string;postJson:string;responseJson:string|null;installationId:string|null;lessonId:string|null};
const iso=(value:number|null)=>value!==null&&Number.isSafeInteger(value)&&value>=0?new Date(value).toISOString():null;
const revision=(value:unknown)=>Number.isSafeInteger(value)&&Number(value)>=1?Number(value):null;

export class ReviewHistoryRepository{
  constructor(private database:D1Database){}
  async readPage(userId:string,ownerKey:string,resetEpoch:number,options:{limit?:number;cursor?:LessonHistoryPageV1['nextCursor']}={}):Promise<LessonHistoryPageV1>{
    const limit=options.limit??50,cursor=options.cursor;
    if(!Number.isInteger(limit)||limit<1||limit>100||cursor&&(!Number.isSafeInteger(cursor.receivedAt)||cursor.receivedAt<0
      ||typeof cursor.attemptId!=='string'||!cursor.attemptId||cursor.attemptId.length>160))throw new TypeError('Invalid review history cursor or limit');
    await requireCurrentLearningResetEpoch(this.database,userId,resetEpoch);
    const result=await this.database.prepare(`SELECT log.id,log.card_id AS cardId,log.rating,log.scheduler_version AS schedulerVersion,
      log.scheduled_at AS scheduledAt,log.reviewed_at AS reviewedAt,log.received_at AS receivedAt,log.duration_ms AS durationMs,
      log.pre_card_json AS preJson,log.post_card_json AS postJson,attempt.response_json AS responseJson,
      attempt.content_version AS contentVersion,attempt.activity_version AS wordVersion,
      card.knowledge_item_id AS wordId,card.modality,activation.lesson_id AS lessonId,
      idempotency.idempotency_key AS operationId,device.installation_id AS installationId
      FROM review_logs log
      LEFT JOIN learning_attempts attempt ON attempt.id=log.attempt_id AND attempt.user_id=log.user_id AND attempt.reset_epoch=log.reset_epoch
      LEFT JOIN fsrs_cards card ON card.id=log.card_id AND card.user_id=log.user_id AND card.reset_epoch=log.reset_epoch
      LEFT JOIN lesson_sessions activation ON activation.id=card.activation_session_id AND activation.user_id=log.user_id AND activation.reset_epoch=log.reset_epoch
      LEFT JOIN idempotency_records idempotency ON idempotency.id=log.idempotency_record_id AND idempotency.user_id=log.user_id AND idempotency.reset_epoch=log.reset_epoch
      LEFT JOIN devices device ON device.id=attempt.device_id AND device.user_id=log.user_id
      WHERE log.user_id=? AND log.reset_epoch=?
      ${cursor?'AND (log.received_at<? OR (log.received_at=? AND log.id<?))':''}
      ORDER BY log.received_at DESC,log.id DESC LIMIT ?`).bind(userId,resetEpoch,
        ...(cursor?[cursor.receivedAt,cursor.receivedAt,cursor.attemptId]:[]),limit+1).all<Row>();
    if(!result.success||!Array.isArray(result.results))throw new Error('Review history unavailable; retain source.');
    const rows=result.results.slice(0,limit);
    const events=rows.map(row=>{
      const response=row.responseJson?JSON.parse(row.responseJson):{},before=JSON.parse(row.preJson),after=JSON.parse(row.postJson);
      if(response.historyContext!==undefined&&!isReviewHistoryContext(response.historyContext))throw new Error('Unsupported review context; retain source.');
      const context=response.historyContext;
      const event=createReviewHistoryEvent({ownerKey,resetEpoch,operationId:row.operationId??`legacy-review-log:${row.id}`,
        contentVersion:row.contentVersion??'unknown',activityVersion:row.wordVersion??'unknown',occurredAt:context?.occurredAt??iso(row.reviewedAt),
        context,sourceRecordRef:row.id,details:{cardId:row.cardId,wordId:row.wordId??'unknown',wordVersion:row.wordVersion,
          cardRevision:revision(before.revision),nextCardRevision:revision(after.revision),schedulerVersion:row.schedulerVersion,
          rating:row.rating!==null&&[1,2,3,4].includes(row.rating)?row.rating as 1|2|3|4:null,ratingKind:'self-reported',reviewModality:row.modality,
          scheduledAt:iso(row.scheduledAt),nextDueAt:iso(after.dueAt??null),reportedDurationMs:row.durationMs}});
      return {...event,installationId:row.installationId,sourceLessonIds:row.lessonId?[row.lessonId]:[],clockSource:context?'device-reported' as const:event.occurredAt?'server-received' as const:'unknown' as const,
        receivedAt:iso(row.receivedAt),receiptRef:row.id,confirmationState:'confirmed' as const,authority:'server-recorded' as const,lineage:'server-business-record' as const};
    });
    projectLessonHistory({ownerKey,resetEpoch},events);
    await requireCurrentLearningResetEpoch(this.database,userId,resetEpoch);
    const last=rows.at(-1);
    return {schemaVersion:1,ownerKey,resetEpoch,events,nextCursor:result.results.length>limit&&last?{receivedAt:last.receivedAt,attemptId:last.id}:null};
  }
}
