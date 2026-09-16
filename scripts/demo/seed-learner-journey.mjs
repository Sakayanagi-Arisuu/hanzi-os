/** Explicit local demo scenario. Never a real learner achievement or evaluation. */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMO_USERS, findLocalDemoDatabase, requireDemoAccounts, openDatabase, backupLocalDatabase, d1Adapter, fingerprint } from './local-demo-database.mjs';
import { CONTENT_VERSION, RELEASED_LESSONS, RELEASED_VOCABULARY } from '../../src/data/curriculum.ts';
import { contentReleasePolicyForEnvironment } from '../../src/server/contentReleasePolicy.ts';
import { LessonSessionRepository } from '../../src/server/lessonSessionRepository.ts';
import { LessonSessionSubmissionRepository } from '../../src/server/lessonSessionSubmissionRepository.ts';
import { AttemptRepository } from '../../src/server/attemptRepository.ts';
import { scoreObjectiveAttempt } from '../../src/server/attemptScoring.ts';
import { getAuthoritativeLessonAnswer } from '../../src/server/authoritativeItemBank.ts';
import { LearningProjectionRepository } from '../../src/server/learningProjectionRepository.ts';
import { ReviewRepository } from '../../src/server/reviewRepository.ts';
import { ReviewQueueRepository } from '../../src/server/reviewQueueRepository.ts';
import { READER_SERIES_CATALOG } from '../../src/reader/library/readerManifest.ts';
import { loadReaderChapter } from '../../src/reader/library/readerChapterLoader.ts';
import { AssessmentRepository } from '../../src/server/assessmentRepository.ts';
import { hskMockExamRepositoryOptions } from '../../src/server/hskMockExamRepository.ts';
import { getHskMockExamDefinition } from '../../src/server/hskMockExamBank.ts';
import { evolveSyncDocument, canonicalStringify } from '../../src/sync/document.ts';
import { lessonRewardActivityId } from '../../src/learning/interactionXp.ts';
import { InteractionXpRepository } from '../../src/server/interactionXpRepository.ts';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const USER=DEMO_USERS.learner.id;
const FIXTURE='demo-journey-quarter-v1';
const DAY=86400000;
const policy=contentReleasePolicyForEnvironment('development');
const mode=process.argv[2]??'--rehearse';
if(!['--rehearse','--apply','--finalize'].includes(mode)) throw new Error('Use --rehearse, --apply or --finalize; local only.');

async function finalize(db) {
  requireDemoAccounts(db);
  const marker=db.prepare('SELECT metadata_json FROM audit_events WHERE id=?').get(FIXTURE);
  if(!marker) throw new Error('Journey must be seeded before finalization');
  const row=db.prepare('SELECT document_json,revision FROM learning_documents WHERE user_id=?').get(USER);
  const document=JSON.parse(row.document_json);
  const sessions=db.prepare('SELECT s.lesson_id,s.submitted_at FROM lesson_sessions s JOIN idempotency_records i ON i.id=s.idempotency_record_id WHERE s.user_id=? AND i.idempotency_key LIKE ? AND s.status=\'submitted\' AND s.passed=1').all(USER,`${FIXTURE}:open:%`);
  db.exec('BEGIN IMMEDIATE');
  try {
    for(const session of sessions) await new InteractionXpRepository(d1Adapter(db),()=>session.submitted_at+1000).claimLessonReward(USER,session.lesson_id,document.reset.epoch);
    const now=Date.now();
    db.prepare("INSERT OR IGNORE INTO sync_changes (user_id,entity_type,entity_id,revision,operation_id,operation,payload_json,occurred_at,reset_epoch) VALUES (?,'learning_document',?,?,?,'upsert',?,?,?)").run(USER,USER,row.revision,`${FIXTURE}:finalized`,row.document_json,now,document.reset.epoch);
    const xp=await new InteractionXpRepository(d1Adapter(db)).read(USER,now-now%DAY,now-now%DAY+DAY);
    db.exec('COMMIT');
    return {totalXp:xp.totalXp,rewardedLessons:xp.rewardedLessonCount,rewardedReviews:xp.rewardedReviewCount};
  } catch(error) { db.exec('ROLLBACK'); throw error; }
}

async function seed(db) {
  requireDemoAccounts(db);
  const api=d1Adapter(db);
  const protectedTables=['users','hanzi_password_credentials','user_roles','auth_sessions'];
  const before=protectedTables.map(t=>fingerprint(db,t));
  const oldSessions=fingerprint(db,'lesson_sessions',`WHERE user_id <> '${USER}' OR idempotency_record_id NOT IN (SELECT id FROM idempotency_records WHERE idempotency_key LIKE '${FIXTURE}%')`);
  if(db.prepare('SELECT 1 FROM audit_events WHERE id=?').get(FIXTURE)) return {alreadyApplied:true};
  const row=db.prepare('SELECT * FROM learning_documents WHERE user_id=?').get(USER);
  const previous=JSON.parse(row.document_json);
  const enrollment=db.prepare("SELECT * FROM enrollments WHERE user_id=? AND status='active' AND course_version_id=?").get(USER,CONTENT_VERSION);
  if(!enrollment) throw new Error('Missing active demo enrollment');
  let seq=0;
  const command=key=>({protocolVersion:1,idempotencyKey:`${FIXTURE}:${key}`,installationId:FIXTURE,deviceId:FIXTURE,deviceSequence:++seq,resetEpoch:previous.reset.epoch,contentVersion:CONTENT_VERSION});
  const now=Date.now();
  const open=new LessonSessionRepository(api,policy,()=>0.43);
  const attempts=new AttemptRepository(api,policy);
  const submit=new LessonSessionSubmissionRepository(api,policy);
  db.exec('BEGIN IMMEDIATE');
  try {
    const completed=new Set(db.prepare("SELECT DISTINCT lesson_id FROM lesson_sessions WHERE user_id=? AND reset_epoch=? AND status='submitted' AND passed=1 AND content_version=?").all(USER,previous.reset.epoch,CONTENT_VERSION).map(x=>x.lesson_id));
    const target=Math.round(RELEASED_LESSONS.length/4);
    const todo=RELEASED_LESSONS.filter(x=>!completed.has(x.id));
    const newSessions=[];
    for(let pass=0;completed.size<target && pass<RELEASED_LESSONS.length;pass++) {
      let advanced=false;
      for(const lesson of todo) {
        if(completed.has(lesson.id)||completed.size>=target) continue;
        let receipt;
        try { receipt=await open.open(USER,{...command(`open:${lesson.id}`),enrollmentId:enrollment.id,lessonId:lesson.id}); }
        catch(error) { if(error.code==='LESSON_SESSION_PREREQUISITE_UNAVAILABLE') continue; throw error; }
        for(const item of receipt.form.activities) {
          const answer=getAuthoritativeLessonAnswer(lesson.id,item.activityId.slice(lesson.id.length+1));
          if(!answer) throw new Error(`Missing answer for ${item.activityId}`);
          const cmd={...command(`attempt:${lesson.id}:${item.position}`),activityId:item.activityId,activityVersion:item.activityVersion,source:'lesson',method:item.method,sessionId:receipt.sessionId,occurredAt:new Date().toISOString(),response:{kind:'answer',answer:!item.requiredForPass&&item.position%11===8?'示例错误':answer.answers[0],usedHint:false,durationMs:18000+item.position*800}};
          const score=scoreObjectiveAttempt(cmd);
          score.baseMasteryEligible=false;
          score.metadata={...score.metadata,fixture:FIXTURE,synthetic:true};
          await attempts.commitObjectiveAttempt(USER,cmd,score);
        }
        const result=await submit.submit(USER,{...command(`submit:${lesson.id}`),sessionId:receipt.sessionId,formHash:receipt.formHash});
        if(!result.passed) throw new Error(`Scenario did not pass ${lesson.id}`);
        newSessions.push({id:receipt.sessionId,lessonId:lesson.id});
        completed.add(lesson.id); advanced=true;
      }
      if(!advanced) break;
    }
    if(completed.size<target) throw new Error(`Only ${completed.size}/${target} lessons reachable`);
    // Date only newly-created scenario rows; preserve every pre-existing session.
    for(const [index,session] of newSessions.entries()) {
      const date=now-(28-Math.floor(index*27/newSessions.length))*DAY;
      db.prepare('UPDATE lesson_sessions SET started_at=?,submitted_at=?,created_at=? WHERE id=?').run(date,date+900000,date,session.id);
      db.prepare('UPDATE learning_attempts SET occurred_at=?,received_at=? WHERE session_id=?').run(date+450000,date+450000,session.id);
      db.prepare("UPDATE learning_evidence SET occurred_at=?,recorded_at=?,mastery_eligible=0,metadata_json=json_set(metadata_json,'$.fixture',?,'$.synthetic',json('true')) WHERE session_id=?").run(date+450000,date+450000,FIXTURE,session.id);
    }
    // Real scheduler produces coherent card states and review logs, no mastery.
    const reviews=new ReviewRepository(api,policy);
    const queue=new ReviewQueueRepository(api,policy);
    let reviewCount=0;
    for(let batch=0;batch<8;batch++) {
      const cards=(await queue.read(USER)).cards;
      if(!cards.length) break;
      for(const card of cards) {
        await reviews.grade(USER,{...command(`review:${reviewCount}`),schedulerVersion:card.schedulerVersion,cardId:card.cardId,wordId:card.wordId,wordVersion:card.wordVersion,expectedCardRevision:card.cardRevision,rating:reviewCount%4===0?2:reviewCount%3===0?4:3,durationMs:9000});
        reviewCount++;
      }
    }
    // The learner-visible library uses owner-scoped chapter progress, not
    // legacy story sessions. Keep those older sessions and exposures intact.
    const readerChapters={};
    const eligibleBooks=READER_SERIES_CATALOG.filter(x=>x.discoverable&&['HSK0','HSK1'].includes(x.levelBand.min)).slice(0,3);
    for(const book of eligibleBooks) for(const summary of book.volumes.flatMap(volume=>volume.chapters).slice(0,3)) {
      const chapter=await loadReaderChapter(book.seriesId,summary.chapterId);
      if(!chapter) throw new Error(`Missing chapter ${summary.chapterId}`);
      const index=Object.keys(readerChapters).length;
      const timestamp=new Date(now-(9-index)*DAY).toISOString();
      readerChapters[chapter.chapterId]={seriesId:book.seriesId,chapterId:chapter.chapterId,paragraphId:chapter.paragraphs.at(-1).paragraphId,readingMode:'bilingual',lastReadAt:timestamp,completedAt:index===8?null:timestamp,bookmarked:index%3===0};
    }
    const readerCount=Object.keys(readerChapters).length;
    const lastReader=Object.values(readerChapters).at(-1);
    const readerProgress={schemaVersion:2,ownerKey:`account:${USER}`,ownerGeneration:0,resetEpoch:previous.reset.epoch,updatedAt:new Date(now).toISOString(),lastSeriesId:lastReader?.seriesId??null,lastChapterId:lastReader?.chapterId??null,bookmarkedSeriesIds:eligibleBooks.map(x=>x.seriesId),chapters:readerChapters,supportEvents:[],savedEntries:{}};
    const examDefinition=getHskMockExamDefinition('hsk1','a');
    const assessment=new AssessmentRepository(api,{...hskMockExamRepositoryOptions(examDefinition),publicationPolicy:policy,excludePreviouslyExposedItems:false});
    const exam=await assessment.openSession(USER,{...command('assessment-open'),enrollmentId:enrollment.id});
    for(const item of exam.form.items) {
      const correct=examDefinition.bank.find(x=>x.id===item.itemId).correctAnswer;
      await assessment.recordAttempt(USER,{...command(`assessment-answer:${item.position}`),sessionId:exam.sessionId,formHash:exam.formHash,itemId:item.itemId,itemVersion:item.itemVersion,occurredAt:new Date().toISOString(),response:{kind:'selection',answer:item.position%5===0?item.options.find(x=>x!==correct):correct,durationMs:22000}});
    }
    await assessment.submitSession(USER,{...command('assessment-submit'),sessionId:exam.sessionId,formHash:exam.formHash});
    const state=structuredClone(previous.state);
    state.profile.name='Minh An';
    const learnedWords=new Set(RELEASED_LESSONS.filter(x=>completed.has(x.id)).flatMap(x=>x.wordIds));
    state.savedWords=[...new Set([...state.savedWords,...RELEASED_VOCABULARY.filter(x=>learnedWords.has(x.id)).slice(0,100).map(x=>x.id)])];
    state.activityLog=state.activityLog.map(item=>({...item,label:item.label.replace(/ · (Demo|dữ liệu mẫu)$/u,'').replace('Khởi tạo hồ sơ trình diễn','Thiết lập hồ sơ')}));
    for(let day=0;day<28;day++) state.activityLog.push({id:`${FIXTURE}:day:${day}`,type:'practice',label:'Học, ôn và luyện kỹ năng',xp:0,occurredAt:new Date(now-day*DAY).toISOString()});
    for(const session of newSessions) {
      const lesson=RELEASED_LESSONS.find(x=>x.id===session.lessonId);
      const stored=db.prepare('SELECT submitted_at,raw_score FROM lesson_sessions WHERE id=?').get(session.id);
      state.activityLog.push({id:lessonRewardActivityId(lesson.id),type:'lesson',label:lesson.title,xp:lesson.xp,occurredAt:new Date(stored.submitted_at).toISOString()});
    }
    state.activityLog.push({id:`${FIXTURE}:reviews`,type:'review',label:`Ôn ${reviewCount} lượt từ vựng`,xp:reviewCount*5,occurredAt:new Date(now).toISOString()});
    state.xp=previous.state.xp+state.activityLog.filter(x=>!previous.state.activityLog.some(y=>y.id===x.id)).reduce((n,x)=>n+x.xp,0);
    const next=evolveSyncDocument(previous,previous.state,state,new Date(now),FIXTURE);
    db.prepare('UPDATE learning_documents SET document_json=?,revision=revision+1,updated_at=? WHERE user_id=?').run(canonicalStringify(next),now,USER);
    db.prepare('UPDATE profiles SET display_name=?,revision=revision+1,updated_at=? WHERE user_id=?').run(state.profile.name,now,USER);
    db.prepare("INSERT INTO audit_events (id,category,action,outcome,actor_user_id,target_type,target_id,metadata_json,created_at,request_id) VALUES (?,'account','demo.journey.seeded','success',?,'user',?,?,?,?)").run(FIXTURE,DEMO_USERS.admin.id,USER,JSON.stringify({fixture:FIXTURE,synthetic:true,lessons:completed.size,reviewCount,readerCount,readerProgress}),now,FIXTURE);
    const projection=await new LearningProjectionRepository(api,policy).readV4(USER);
    if(db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Foreign key failure');
    if(JSON.stringify(protectedTables.map(t=>fingerprint(db,t)))!==JSON.stringify(before)) throw new Error('Protected credentials changed');
    if(fingerprint(db,'lesson_sessions',`WHERE user_id <> '${USER}' OR idempotency_record_id NOT IN (SELECT id FROM idempotency_records WHERE idempotency_key LIKE '${FIXTURE}%')`)!==oldSessions) throw new Error('Existing sessions changed');
    db.exec('COMMIT');
    return {completedLessons:completed.size,totalLessons:RELEASED_LESSONS.length,newSessions:newSessions.length,reviewCount,readerCount,assessmentSessions:1,projectionVersion:projection.protocolVersion};
  } catch(error) { db.exec('ROLLBACK'); throw error; }
}

const live=openDatabase(findLocalDemoDatabase(ROOT),mode==='--rehearse');
try {
  requireDemoAccounts(live);
  console.log('Backup:',await backupLocalDatabase(live,ROOT,'before-learner-quarter'));
  const rehearsal=openDatabase(await backupLocalDatabase(live,ROOT,'rehearsal-learner-quarter'));
  try {
    if(mode!=='--finalize') { console.log('Rehearsal:',await seed(rehearsal)); console.log('Repeat:',await seed(rehearsal)); }
    console.log('Rewards:',await finalize(rehearsal));
  }
  finally { rehearsal.close(); }
  if(mode==='--apply') console.log('Applied:',await seed(live));
  if(mode!=='--rehearse') console.log('Finalized:',await finalize(live));
} finally { live.close(); }
