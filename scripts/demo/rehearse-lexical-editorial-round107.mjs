import {randomUUID} from 'node:crypto';
import {findLocalDemoDatabase,openDatabase,d1Adapter,backupLocalDatabase,fingerprint,requireDemoAccounts} from './local-demo-database.mjs';
import {CONTENT_VERSION} from '../../src/data/curriculum.ts';
import {LessonSessionRepository} from '../../src/server/lessonSessionRepository.ts';
import {LessonSessionSubmissionRepository} from '../../src/server/lessonSessionSubmissionRepository.ts';
import {AttemptRepository} from '../../src/server/attemptRepository.ts';
import {scoreObjectiveAttempt} from '../../src/server/attemptScoring.ts';
import {getAuthoritativeLessonAnswer} from '../../src/server/authoritativeItemBank.ts';
import {contentReleasePolicyForEnvironment} from '../../src/server/contentReleasePolicy.ts';
import {readCurrentLearningResetEpoch} from '../../src/server/learningResetEpoch.ts';
import {ReviewQueueRepository} from '../../src/server/reviewQueueRepository.ts';
import {ReviewRepository} from '../../src/server/reviewRepository.ts';
import {parseReviewQueue,parseGradeReviewCommand,editorialReviewWordVersion,REVIEW_SCHEDULER_VERSION} from '../../src/learning/reviewProtocol.ts';

const db=openDatabase(findLocalDemoDatabase(process.cwd()));
try{
 requireDemoAccounts(db);
 const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(x=>x.name).filter(name=>/^[a-z_]+$/.test(name));
 const before=new Map(tables.map(t=>[t,fingerprint(db,t)]));
 const backup=await backupLocalDatabase(db,process.cwd(),'before-lexical-editorial-round107-rehearsal');
 db.exec('BEGIN IMMEDIATE');
 const api=d1Adapter(db),user='local-demo-user-1',policy=contentReleasePolicyForEnvironment('development');
 const resetEpoch=await readCurrentLearningResetEpoch(api,user);
 const enrollmentId=db.prepare("SELECT id FROM enrollments WHERE user_id=? AND status='active' AND course_version_id=?").get(user,CONTENT_VERSION).id;
 const device={installationId:'lexical-rehearsal-'+randomUUID(),deviceId:'lexical-rehearsal',resetEpoch,contentVersion:CONTENT_VERSION,protocolVersion:1};
 let sequence=0;
 const command=extra=>({...device,idempotencyKey:'lexical-rehearsal-'+randomUUID(),deviceSequence:++sequence,...extra});
 const originalCards=db.prepare('SELECT * FROM fsrs_cards WHERE user_id=?').all(user);
 let sessions=0;
 for(const lessonId of ['boot-1','boot-2','boot-3','boot-4','survival-1','hsk2-travel-leisure-lesson-01']){
  const opened=await new LessonSessionRepository(api,policy,()=>0.5).open(user,command({enrollmentId,lessonId}));
  for(const activity of opened.form.activities){
   const answer=getAuthoritativeLessonAnswer(lessonId,activity.activityId.slice(lessonId.length+1));
   const attempt=command({sessionId:opened.sessionId,source:'lesson',activityId:activity.activityId,activityVersion:activity.activityVersion,method:activity.method,occurredAt:new Date().toISOString(),response:{kind:'answer',answer:answer.answers[0],usedHint:false}});
   const receipt=await new AttemptRepository(api,policy).commitObjectiveAttempt(user,attempt,scoreObjectiveAttempt(attempt));
   if(receipt.outcome!=='correct')throw Error('Future catalog answer failed');
  }
  const submitted=await new LessonSessionSubmissionRepository(api,policy).submit(user,command({sessionId:opened.sessionId,formHash:opened.formHash}));
  if(!submitted.passed)throw Error('Frozen future form did not finalize');sessions++;
 }
 for(const card of originalCards){
  const current=db.prepare('SELECT * FROM fsrs_cards WHERE id=?').get(card.id);
  if(JSON.stringify(current)!==JSON.stringify(card))throw Error('Existing FSRS card changed');
 }
 const duplicates=db.prepare(`SELECT knowledge_item_id,count(*) n FROM fsrs_cards WHERE user_id=? AND enrollment_id=? AND reset_epoch=? AND activation_session_id IS NOT NULL GROUP BY knowledge_item_id,modality,scheduler_version HAVING count(*)>1`).all(user,enrollmentId,resetEpoch);
 if(duplicates.length)throw Error('Duplicate lexical cards');
 const queue=await new ReviewQueueRepository(api,policy).read(user);
 if(!parseReviewQueue(queue).ok)throw Error('New review queue failed protocol validation');
 // Older due cards can fill the twelve-offer limit. Resolve a new due card
 // directly for the grade rehearsal without changing the older cards' dates.
 const fresh=queue.cards.find(c=>c.wordVersion===editorialReviewWordVersion(c.wordId))
  ?? db.prepare(`SELECT id AS cardId,knowledge_item_id AS wordId,knowledge_item_version AS wordVersion,revision AS cardRevision
    FROM fsrs_cards WHERE user_id=? AND enrollment_id=? AND knowledge_item_version LIKE ? AND due_at<=? LIMIT 1`)
   .get(user,enrollmentId,'%:lexical-editorial-2026.10.5',Date.now());
 if(!fresh)throw Error('No newly versioned card in queue');
 const grade=command({cardId:fresh.cardId,wordId:fresh.wordId,wordVersion:fresh.wordVersion,expectedCardRevision:fresh.cardRevision,schedulerVersion:REVIEW_SCHEDULER_VERSION,rating:3});
 if(!parseGradeReviewCommand(grade).ok)throw Error('New review command failed protocol validation');
 await new ReviewRepository(api,policy).grade(user,grade);
 if(db.prepare('PRAGMA foreign_key_check').all().length)throw Error('Foreign key violation');
 db.exec('ROLLBACK');
 for(const [table,sha] of before)if(fingerprint(db,table)!==sha)throw Error('Rollback did not preserve '+table);
 console.log({mode:'rehearsed-rollback',sessions,newCardGrade:true,existingCardsPreserved:originalCards.length,duplicateCards:0,tablesPreserved:tables.length,persistedChanges:0,backup});
}catch(error){if(db.isTransaction)db.exec('ROLLBACK');throw error;}
finally{db.close();}
