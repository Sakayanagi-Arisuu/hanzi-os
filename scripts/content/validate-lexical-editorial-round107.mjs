import {readFileSync,writeFileSync,existsSync,unlinkSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {RELEASED_LESSONS,CONTENT_VERSION} from '../../src/data/curriculum.ts';
import {buildExercises,buildExerciseCatalog} from '../../src/lib/exerciseGeneration.ts';
import {getAuthoritativeLessonAnswer} from '../../src/server/authoritativeItemBank.ts';
import {parseLessonResume,buildLessonResumeExercises} from '../../src/learning/resumeProtocol.ts';
import {LEXICAL_SESSION_MARKER,LEXICAL_EXERCISE_SUFFIX,EDITORIAL_WORD_BY_ID} from '../../src/content/lexicalEditorialCatalog.ts';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {validateStoredLessonSessionForm} from '../../src/server/lessonSessionFormValidation.ts';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';

// Intrinsic validation for this immutable content derivative; no learner
// sessions, cards, outbox, Studio drafts or release heads are changed.
const directory='content/packages/lexical-editorial-2026.10.5';
const bytes=readFileSync(directory+'/word-catalog.json');
const manifest=JSON.parse(readFileSync(directory+'/manifest.json','utf8'));
const snapshot=JSON.parse(bytes);
const sha='sha256:'+createHash('sha256').update(bytes).digest('hex');
if(sha!==manifest.wordCatalogSha256||snapshot.words.length!==manifest.wordCount)throw Error('Snapshot integrity mismatch');
const temporary=resolve('.wrangler/demo-backups/legacy-exercise-round107-'+randomUUID()+'.ts');
if(existsSync(temporary))throw Error('Temporary baseline already exists');
const oldSource=execFileSync('git',['show','HEAD:src/lib/exerciseGeneration.ts'],{encoding:'utf8'})
 .replaceAll('"../data/curriculum"','"../../src/data/curriculum.ts"')
 .replaceAll('"../types"','"../../src/types.ts"')
 .replaceAll('"./pinyin"','"../../src/lib/pinyin.ts"');
writeFileSync(temporary,oldSource);
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
let candidates=0,localResumes=0,storedForms=0;
try{
 const legacy=await import(pathToFileURL(temporary).href);
 const repo=new ContentStudioRepository(d1Adapter(db));
 for(const patch of snapshot.words){
  const source=await repo.getRevision(patch.sourceRevisionId);
  const released=await repo.releasedRuntimeRevision(patch.sourceRevisionId);
  if(!source||!released||source.contentSha256!==patch.sourceContentSha256)throw Error('Unreleased or changed source: '+patch.id);
  const c=source.content,e=c.examples[0],w=EDITORIAL_WORD_BY_ID.get(patch.id);
  if(c.sourceVocabularyIds[0]!==patch.id||w.meaning!==c.meaningVi||w.example!==e.hanzi||w.examplePinyin!==e.pinyin||w.exampleMeaning!==e.meaningVi)throw Error('Derivative/source drift: '+patch.id);
 }
 for(const lesson of RELEASED_LESSONS)for(const script of ['simplified','traditional']){
  const before=legacy.buildExerciseCatalog(lesson,script,()=>0.5),catalog=buildExerciseCatalog(lesson,script,()=>0.5);
  if(JSON.stringify(before)!==JSON.stringify(catalog.slice(0,before.length)))throw Error('Legacy catalog drift: '+lesson.id);
  if(JSON.stringify(legacy.buildExercises(lesson,script,()=>0.5))!==JSON.stringify(buildExercises(lesson,script,()=>0.5)))throw Error('Legacy selection drift: '+lesson.id);
  if(new Set(catalog.map(x=>x.id)).size!==catalog.length)throw Error('Duplicate activity IDs');
  for(const e of catalog){
   const a=getAuthoritativeLessonAnswer(lesson.id,e.id);
   if(!a||a.activityVersion!==e.activityVersion||a.skill!==e.skill||a.requiredForPass!==Boolean(e.requiredForPass)||!a.answers.includes(e.correct))throw Error('Answer/presentation mismatch: '+lesson.id+':'+e.id);
   if(e.kind!=='recall'&&(!e.options.includes(e.correct)||new Set(e.options).size!==e.options.length))throw Error('Invalid choices');
   candidates++;
  }
  for(const marker of ['',LEXICAL_SESSION_MARKER+':']){
   const sessionId=`lesson-session:${lesson.id}:${marker}round107-validation`,exercises=buildLessonResumeExercises(lesson,script,sessionId);
   const resume={version:5,contentVersion:CONTENT_VERSION,sessionId,lessonId:lesson.id,script,phase:'briefing',exercises,index:0,selected:null,checked:false,answers:[],finished:false,earnedXp:0};
   if(!parseLessonResume(resume,lesson,script))throw Error('Resume binding mismatch: '+lesson.id);
   if(marker&&!exercises.some(e=>e.id.endsWith(LEXICAL_EXERCISE_SUFFIX)))throw Error('Future session uses only old catalog');
   localResumes++;
  }
 }
 for(const row of db.prepare(`SELECT lesson_id AS lessonId,lesson_version AS lessonVersion,
  expected_evidence_count AS expectedEvidenceCount,form_schema_version AS formSchemaVersion,
  form_script AS formScript,form_manifest_json AS formManifestJson,form_manifest_hash AS formManifestHash
  FROM lesson_sessions WHERE status='started' AND content_version=? AND form_manifest_json IS NOT NULL`).all(CONTENT_VERSION)){
  await validateStoredLessonSessionForm(row);storedForms++;
 }
 if(db.prepare('PRAGMA foreign_key_check').all().length)throw Error('Foreign key violation');
 const olderPackageForms=db.prepare("SELECT count(*) n FROM lesson_sessions WHERE status='started' AND content_version<>?").get(CONTENT_VERSION).n;
 console.log({mode:'read-only-intrinsic-validation',words:snapshot.words.length,lessons:RELEASED_LESSONS.length,scripts:2,candidates,localResumes,storedForms,olderPackageFormsUntouched:olderPackageForms,legacyCatalogPreserved:true,persistedChanges:0,sha});
}finally{db.close();unlinkSync(temporary);}
