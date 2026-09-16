/** Exercise the real local schema/released content, rolling back all writes. */
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {findLocalDemoDatabase,openDatabase,d1Adapter,requireDemoAccounts} from './local-demo-database.mjs';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {LessonPageAttemptRepository} from '../../src/server/lessonPageAttemptRepository.ts';
import {publishedLessonPageActivities} from '../../src/server/publishedLessonPageActivities.ts';
import {readCurrentLearningResetEpoch} from '../../src/server/learningResetEpoch.ts';
import {matchPageAttemptReceipt} from '../../src/learning/pageAttemptCommand.ts';
const db=openDatabase(findLocalDemoDatabase(process.cwd()));
try{
 requireDemoAccounts(db);
 db.exec('BEGIN IMMEDIATE');
 const count=db.prepare('SELECT count(*) n FROM lesson_page_attempts').get().n;
 const api=d1Adapter(db);
 const manifest=await new ContentStudioRepository(api).publishedRuntime({itemType:'lesson',learnerSafe:true});
 const historical=process.argv.includes('--historical');
 const review=historical?JSON.parse(readFileSync('content/review/thien-lo-boot-1-activity-targets-local.json','utf8')):null;
 const oldPackage=historical?await new ContentStudioRepository(api).releasedRuntimeRevision(review.parentRevisionId):null;
 if(historical&&(!oldPackage||manifest.items.some(item=>item.revisionId===oldPackage.revisionId)))throw new Error('Expected released parent behind a newer head');
 const scoped={...manifest,items:historical?[oldPackage]:manifest.items.filter(item=>item.content.targetLessonId==='boot-1')};
 const activities=await publishedLessonPageActivities(scoped);
 const activity=[...activities.values()].find(a=>a.activity.type==='choice');
 if(!activity)throw new Error('Released boot-1 choice not found');
 const command={version:1,idempotencyKey:`rehearsal-${randomUUID()}`,resetEpoch:await readCurrentLearningResetEpoch(api,'local-demo-user-1'),lessonId:'boot-1',activityId:activity.activityId,activityVersion:activity.activityVersion,occurredAt:new Date().toISOString(),response:{text:'',answerIds:activity.activity.answerIds,usedHint:true,priorFeedback:false,priorReveal:false}};
 const repo=new LessonPageAttemptRepository(api);
 const first=await repo.record('local-demo-user-1',command);
 const duplicate=await repo.record('local-demo-user-1',command);
 if(first.outcome!=='correct'||first.masteryEligible!==false||!matchPageAttemptReceipt(first,command)||!duplicate.duplicate||duplicate.attemptId!==first.attemptId)throw new Error('Receipt mismatch');
 if(db.prepare('SELECT count(*) n FROM lesson_page_attempts').get().n!==count+1)throw new Error('Unexpected insert count');
 if(db.prepare('SELECT revision_id FROM lesson_page_attempts WHERE id=?').get(first.attemptId)?.revision_id!==activity.revisionId)throw new Error('Wrong revision recorded');
 if(db.prepare('PRAGMA foreign_key_check').all().length)throw new Error('FK violation');
 db.exec('ROLLBACK');
 if(db.prepare('SELECT count(*) n FROM lesson_page_attempts').get().n!==count)throw new Error('Rollback failed');
 console.log({mode:'rehearsed-rollback',lesson:'boot-1',historical,revisionId:activity.revisionId,outcome:first.outcome,duplicateVerified:true,masteryEligible:false,persistedAttempts:0});
}catch(error){if(db.isTransaction)db.exec('ROLLBACK');throw error;}
finally{db.close();}
