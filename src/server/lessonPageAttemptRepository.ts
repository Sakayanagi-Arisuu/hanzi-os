import {randomUUID} from 'node:crypto';
import {canonicalStudioJson,studioSha256} from '../content/studioContent';
import {parsePageAttemptCommand} from '../learning/pageAttemptCommand';
import {ContentStudioRepository} from './contentStudioRepository';
import {publishedLessonPageActivities,checkPublishedPageActivity} from './publishedLessonPageActivities';
import {CURRENT_LEARNING_RESET_EPOCH_SQL,requireCurrentLearningResetEpoch} from './learningResetEpoch';
import type {D1Database} from './d1';
export class PageAttemptConflictError extends Error{}
type Row={id:string;request_hash:string;outcome:'correct'|'incorrect'|'self-review'};
/** Authenticated userId comes from the route, never from the browser command. */
export class LessonPageAttemptRepository{
 constructor(private readonly db:D1Database){}
 async record(userId:string,input:unknown){
  const command=parsePageAttemptCommand(input);if(!command)throw new TypeError('Invalid page attempt');
  await requireCurrentLearningResetEpoch(this.db,userId,command.resetEpoch);
  const hash=await studioSha256(canonicalStudioJson(command));
  const existing=()=>this.db.prepare('SELECT id,request_hash,outcome FROM lesson_page_attempts WHERE user_id=? AND reset_epoch=? AND idempotency_key=?').bind(userId,command.resetEpoch,command.idempotencyKey).first<Row>();
  const receipt=(row:Row,duplicate:boolean)=>{
   if(row.request_hash!==hash)throw new PageAttemptConflictError('Idempotency key reused with another response');
   return {version:1 as const,attemptId:row.id,idempotencyKey:command.idempotencyKey,resetEpoch:command.resetEpoch,activityId:command.activityId,activityVersion:command.activityVersion,outcome:row.outcome,duplicate,masteryEligible:false as const};
  };
  const acknowledge=async(row:Row,duplicate:boolean)=>{
   // Replays also cross asynchronous reads: never acknowledge old-owner/reset
   // work just because its idempotency key was recorded before a reset/lock.
   const available=await this.db.prepare(`SELECT id FROM users WHERE id=? AND status='active' AND ${CURRENT_LEARNING_RESET_EPOCH_SQL}`).bind(userId,userId,command.resetEpoch).first<{id:string}>();
   if(!available){
    await requireCurrentLearningResetEpoch(this.db,userId,command.resetEpoch);
    throw new PageAttemptConflictError('Account unavailable');
   }
   return receipt(row,duplicate);
  };
  const previous=await existing();if(previous)return acknowledge(previous,true);
  const studio=new ContentStudioRepository(this.db);
  const manifest=await studio.publishedRuntime({itemType:'lesson',learnerSafe:true});
  let registry=await publishedLessonPageActivities({...manifest,items:manifest.items.filter(item=>item.content.targetLessonId===command.lessonId)});
  let entry=registry.get(command.activityId);
  if(!entry||entry.activityVersion!==command.activityVersion){
   // The v1 queue has no revisionId. Resolve its exact version from immutable
   // released history without rewriting its command, response or retry key.
   for(const item of await studio.releasedLessonRuntimeRevisions(command.lessonId)){
    const historical=await publishedLessonPageActivities({...manifest,items:[item]});
    const candidate=historical.get(command.activityId);
    if(candidate?.lessonId===command.lessonId&&candidate.activityVersion===command.activityVersion){
     registry=historical;entry=candidate;break;
    }
   }
  }
  if(!entry||entry.lessonId!==command.lessonId)throw new PageAttemptConflictError('Activity is not published for this lesson');
  if(entry.activityVersion!==command.activityVersion)throw new PageAttemptConflictError('Published activity version unavailable');
  const result=checkPublishedPageActivity(registry,{activityId:command.activityId,activityVersion:command.activityVersion,...command.response});
  if(!command.response.text.trim()&&!command.response.answerIds.length)throw new TypeError('An answer is required');
  const id=randomUUID();
  // Both reset and account checks are inside the insert, closing the race after
  // async manifest loading. Only the intended owner/key conflict is ignored.
  await this.db.prepare(`INSERT INTO lesson_page_attempts (id,user_id,reset_epoch,idempotency_key,request_hash,activity_id,activity_version,lesson_id,revision_id,response_json,outcome,occurred_at,created_at)
    SELECT ?,?,?,?,?,?,?,?,?,?,?,?,? WHERE ${CURRENT_LEARNING_RESET_EPOCH_SQL}
    AND EXISTS(SELECT 1 FROM users WHERE id=? AND status='active')
    ON CONFLICT(user_id,reset_epoch,idempotency_key) DO NOTHING`).bind(id,userId,command.resetEpoch,command.idempotencyKey,hash,command.activityId,command.activityVersion,command.lessonId,entry.revisionId,canonicalStudioJson(command.response),result.outcome,command.occurredAt,Date.now(),userId,command.resetEpoch,userId).run();
  const row=await existing();
  if(!row){await requireCurrentLearningResetEpoch(this.db,userId,command.resetEpoch);throw new PageAttemptConflictError('Account unavailable');}
  return acknowledge(row,row.id!==id);
 }
}
