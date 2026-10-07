/** Test-only deterministic completed forms for isolated browser navigation. Never import into learner accounts. */
import {readFileSync,writeFileSync} from 'node:fs';
import {LESSON_BY_ID} from '../../src/data/curriculum';
import {buildLessonResumeExercises} from '../../src/learning/resumeProtocol';
import {isLocallyVerifiedEvidence,isPolicyMasteryEligible} from '../../src/lib/evidencePolicy';

const nature=JSON.parse(readFileSync('e2e/fixtures/hsk3-nature-prerequisite-evidence.json','utf8'));
const batch=JSON.parse(readFileSync('content/drafts/thien-lo-hsk3-society-v2.json','utf8'));
const ids=['hsk3-nature-environment-explanations-environment-protection',...batch.items.slice(0,-1).map((item:{lessonId:string})=>item.lessonId)];
const method=(kind:string)=>kind==='meaning'?'meaning-selection':kind==='listening'?'listening-selection':kind==='sentence'?'reading-comprehension':kind==='recall'?'typed-character-recall':'phonology-recognition';
const additions=ids.flatMap((lessonId:string,index:number)=>{
  const lesson=LESSON_BY_ID.get(lessonId);
  if(!lesson)throw Error(`Missing prerequisite: ${lessonId}`);
  const sessionId=`lesson-session:${lessonId}:society-browser-fixture`;
  const exercises=buildLessonResumeExercises(lesson,'simplified',sessionId);
  if(exercises.length!==10)throw Error(`Unexpected form length: ${lessonId}`);
  const answers=exercises.map((exercise,position)=>{
    const idempotencyKey=`${sessionId}:answer:${exercise.id}`;
    const evidenceMethod=method(exercise.kind) as Parameters<typeof isLocallyVerifiedEvidence>[1];
    const verified=isLocallyVerifiedEvidence('lesson',evidenceMethod,exercise.skill);
    return {id:`evidence:${idempotencyKey}`,idempotencyKey,schemaVersion:1,contentVersion:lesson.contentVersion,activityVersion:exercise.activityVersion,source:'lesson',method:evidenceMethod,activityId:`${lessonId}:${exercise.id}`,skill:exercise.skill,outcome:'correct',score:100,verified,masteryEligible:verified&&isPolicyMasteryEligible(evidenceMethod,exercise.skill),occurredAt:new Date(Date.UTC(2026,7,1,1,index,position)).toISOString(),metadata:{questionId:exercise.id,wordId:exercise.wordId??null,correctAnswer:exercise.correct,selectedAnswer:exercise.correct,requiredForPass:exercise.requiredForPass??false,priorExposure:false}};
  });
  const required=exercises.filter(exercise=>exercise.requiredForPass).length;
  const idempotencyKey=`${sessionId}:complete`;
  const completion={id:`evidence:${idempotencyKey}`,idempotencyKey,schemaVersion:1,contentVersion:lesson.contentVersion,activityVersion:`${lesson.contentVersion}:${lessonId}:1`,source:'lesson',method:'lesson-completion',activityId:lessonId,skill:lesson.skills[0]??'vocabulary',outcome:'completed',score:100,verified:true,masteryEligible:false,occurredAt:new Date(Date.UTC(2026,7,1,2,index)).toISOString(),metadata:{passed:true,clientScore:100,rawScore:100,evidenceCount:exercises.length,requiredEvidenceCount:required,requiredCorrect:required}};
  return [...answers,completion];
});
const evidence=[...nature,...additions];
if(new Set(evidence.map((item:{idempotencyKey:string})=>item.idempotencyKey)).size!==evidence.length)throw Error('Duplicate fixture key');
writeFileSync('e2e/fixtures/hsk3-society-prerequisite-evidence.json',JSON.stringify(evidence,null,2)+'\n');
console.log({prerequisites:ids.length,events:evidence.length});
