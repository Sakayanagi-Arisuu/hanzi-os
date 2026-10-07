/** Bounded local correction of four examples already reviewed in authored lessons. */
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {canonicalStudioJson,validateStudioContent} from '../../src/content/studioContent.ts';
import {parsePublishedStudioVocabulary} from '../../src/content/publishedStudioVocabulary.ts';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {ContentReleaseWorker,ContentReleaseWorkerRepository} from '../../src/server/contentReleaseWorker.ts';
import {backupLocalDatabase,findLocalDemoDatabase,openDatabase,requireDemoAccounts,fingerprint,d1Adapter} from './local-demo-database.mjs';

const draft=JSON.parse(readFileSync(new URL('../../content/drafts/thien-lo-vocabulary-example-corrections-v2.json',import.meta.url),'utf8'));
const expected=['hsk-vocab-00480','hsk-vocab-00351','hsk-vocab-00490','hsk-vocab-00477'];
if(draft.humanReviewed!==false||JSON.stringify(draft.items.map(i=>i.stableKey))!==JSON.stringify(expected.map(id=>`curriculum-word-${id}`)))throw Error('Unexpected correction inventory');
const apply=process.argv.includes('--apply');
const db=openDatabase(findLocalDemoDatabase(process.cwd()));
try{
 requireDemoAccounts(db);
 const api=d1Adapter(db),repo=new ContentStudioRepository(api);
 const author={actorUserId:'local-demo-user-2',actorSessionId:null},admin={actorUserId:'local-demo-user-3',actorSessionId:null};
 if(apply)await backupLocalDatabase(db,process.cwd(),'before-vocabulary-example-corrections');
 db.exec('BEGIN IMMEDIATE');
 if(db.prepare("SELECT count(*) n FROM content_release_outbox_events WHERE status IN ('pending','processing')").get().n)throw Error('Pending release jobs must remain untouched');
 const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'content_%' AND name NOT LIKE 'sqlite_%' AND name NOT GLOB '_*'").all().map(r=>r.name).filter(n=>/^[a-z_]+$/.test(n)&&n!=='audit_events');
 const before=tables.map(t=>fingerprint(db,t));
 for(const entry of draft.items){
  // Only the example may change; identity, meaning, pronunciation and links stay fixed.
  const source={...entry.expectedSourceContent,examples:entry.content.examples};
  if(canonicalStudioJson(source)!==canonicalStudioJson(entry.content))throw Error('Correction changes more than examples');
  const content={...entry.content,review:{humanReviewed:false,aiSelfReview:{accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true}},localReview:{humanReviewed:false,reviewedAt:'2026-09-20',evidenceDocument:'docs/thien-lo-redesign-review/27-REVIEW-VOCABULARY-EXAMPLES.md'}};
  const validation=await validateStudioContent('vocabulary',content);
  if(!validation.result.valid)throw Error(JSON.stringify(validation.result.errors));
  const row=db.prepare('SELECT r.id FROM content_revisions r JOIN content_items i ON i.id=r.item_id WHERE i.stable_key=? ORDER BY r.revision DESC LIMIT 1').get(entry.stableKey);
  if(!row)throw Error('Expected imported draft missing');
  let revision=await repo.getRevision(row.id);
  if(revision.workflowState==='published'){
   if(canonicalStudioJson(revision.content)!==canonicalStudioJson(content))throw Error('Published correction differs');
   continue;
  }
  if(revision.workflowState!=='draft'||canonicalStudioJson(revision.content)!==canonicalStudioJson(entry.expectedSourceContent))throw Error('Preserve editor changes');
  revision=await repo.updateDraft({...author,revisionId:revision.id,expectedRowVersion:revision.rowVersion,title:revision.title,level:revision.level,content,idempotencyKey:`${entry.stableKey}:examples-v2`});
  revision=await repo.validateRevision({...author,revisionId:revision.id,expectedRowVersion:revision.rowVersion,idempotencyKey:`${entry.stableKey}:examples-v2-validate`});
  for(const toState of ['submitted','approved','published'])revision=await repo.transition({...(toState==='submitted'?author:admin),revisionId:revision.id,expectedRowVersion:revision.rowVersion,toState,idempotencyKey:`${entry.stableKey}:examples-v2-${toState}`,requestId:randomUUID(),note:'Sửa ví dụ theo bài Thiên Lộ đã rà; local AI-assisted, humanReviewed:false.'});
 }
 const worker=new ContentReleaseWorker(new ContentReleaseWorkerRepository(api),{policy:{batchSize:8,maximumAttempts:5,initialRetryDelayMs:1000,maximumRetryDelayMs:300000}});
 const result=await worker.drain();
 if(result.retried||result.deadLettered)throw Error(JSON.stringify(result));
 const runtime=await repo.publishedRuntime({itemType:'vocabulary',learnerSafe:true});
 const words=parsePublishedStudioVocabulary(runtime);
 for(const [index,entry] of draft.items.entries()){
  const word=words.find(w=>w.id===entry.stableKey);
  if(word?.sourceVocabularyId!==expected[index]||word.example!==entry.content.examples[0].hanzi)throw Error('Runtime correction mismatch');
 }
 tables.forEach((t,i)=>{if(fingerprint(db,t)!==before[i])throw Error(`Protected data changed: ${t}`);});
 if(db.prepare('PRAGMA foreign_key_check').all().length)throw Error('Foreign key failure');
 db.exec(apply?'COMMIT':'ROLLBACK');
 console.log({mode:apply?'apply':'rehearse-rollback',words:4,protectedTables:tables.length,completed:result.completed});
}catch(error){if(db.isTransaction)db.exec('ROLLBACK');throw error;}finally{db.close();}
