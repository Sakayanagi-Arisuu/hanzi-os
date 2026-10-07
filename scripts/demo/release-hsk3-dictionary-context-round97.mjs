/** Pinned local content release. Backup, validation and data preservation remain mandatory. */
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {contextualizeHsk3Dictionary97} from '../content/hsk3-dictionary-context-round97.mjs';
import {randomUUID} from 'node:crypto';
import {canonicalStudioJson,studioSha256} from '../../src/content/studioContent.ts';
import {parsePublishedStudioVocabulary} from '../../src/content/publishedStudioVocabulary.ts';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {ContentReleaseWorker,ContentReleaseWorkerRepository} from '../../src/server/contentReleaseWorker.ts';
import {backupLocalDatabase,findLocalDemoDatabase,openDatabase,requireDemoAccounts,fingerprint,d1Adapter} from './local-demo-database.mjs';
const EXPECTED_ENTRIES=35;
const plan=JSON.parse(readFileSync('content/drafts/thien-lo-hsk3-dictionary-context-round97.json','utf8'));
if(plan.humanReviewed!==false||plan.entries.length!==EXPECTED_ENTRIES)throw Error('Unexpected plan');
const db=openDatabase(findLocalDemoDatabase(process.cwd())); const apply=process.argv.includes('--apply');
try{
 if(apply&&existsSync(plan.evidenceDocument.replace('.md','.json')))throw Error('Preserve existing receipt');
 requireDemoAccounts(db);
 const backup=apply?await backupLocalDatabase(db,process.cwd(),'before-hsk3-dictionary-context-round97'):null;
 db.exec('BEGIN IMMEDIATE');
 if(db.prepare("SELECT count(*) n FROM content_release_outbox_events WHERE status IN ('pending','processing')").get().n)throw Error('Unrelated release jobs pending');
 const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'content_%' AND name NOT LIKE 'sqlite_%' AND name NOT GLOB '_*'").all().map(r=>r.name).filter(n=>/^[a-z_]+$/.test(n)&&n!=='audit_events');
 const before=tables.map(t=>fingerprint(db,t));
 const api=d1Adapter(db),repo=new ContentStudioRepository(api);
 const sources=await Promise.all(plan.entries.map(e=>repo.getRevision(e.sourceRevisionId)));
 const itemIds=new Set(sources.map(s=>s.itemId));
 const heads=()=>db.prepare('SELECT * FROM content_release_heads ORDER BY item_id').all().filter(r=>!itemIds.has(r.item_id));
 const otherHeads=heads();
 const author={actorUserId:'local-demo-user-2',actorSessionId:null},admin={actorUserId:'local-demo-user-3',actorSessionId:null};
 const releases=[];
 for(const [i,entry] of plan.entries.entries()){
  const source=sources[i];
  if(source.workflowState!==entry.sourceWorkflowState||source.contentSha256!==entry.sourceContentSha256||(await repo.getLatestRevision(source.itemId)).id!==source.id)throw Error('Source changed; do not replay or overwrite editor draft');
  if(canonicalStudioJson(contextualizeHsk3Dictionary97(source.content).content)!==canonicalStudioJson(entry.content))throw Error('Editorial transform mismatch');
  if(source.itemType==='lesson'){
   if(db.prepare('SELECT revision_id FROM content_release_heads WHERE item_id=?').get(source.itemId)?.revision_id!==source.id)throw Error('Stale release head');
   if(canonicalStudioJson(contextualizeHsk3Dictionary97(source.content).content)!==canonicalStudioJson(entry.content))throw Error('Unexpected edit outside reviewed editorial corrections');
  }
  const parent=source.workflowState==='published'?await repo.releasedRuntimeRevision(source.id):null;
  const key=`hsk3-dictionary-context-round97:${source.id}`;
  let revision=source.workflowState==='published'?await repo.forkRevision({...author,sourceRevisionId:source.id,idempotencyKey:`${key}:fork`}):source;
  const content={...entry.content,editorialCorrection:{humanReviewed:false,sourceRevisionId:source.id,sourceContentSha256:entry.sourceContentSha256,correctedContentSha256:await studioSha256(canonicalStudioJson(entry.content)),evidenceDocument:plan.evidenceDocument,scope:'Correct twenty-four HSK3 vocabulary entries and six pinned word meanings; update linked word blocks and preserve old scored catalogs.'}};
  revision=await repo.updateDraft({...author,revisionId:revision.id,expectedRowVersion:revision.rowVersion,title:revision.title,level:revision.level,content,idempotencyKey:`${key}:save`});
  revision=await repo.validateRevision({...author,revisionId:revision.id,expectedRowVersion:revision.rowVersion,idempotencyKey:`${key}:validate`});
  if(!revision.validation?.valid)throw Error(JSON.stringify(revision.validation));
  for(const toState of ['submitted','approved','published'])revision=await repo.transition({...(toState==='submitted'?author:admin),revisionId:revision.id,expectedRowVersion:revision.rowVersion,toState,idempotencyKey:`${key}:${toState}`,requestId:randomUUID(),note:'Local AI-assisted vocabulary context correction; humanReviewed:false.'});
  releases.push({itemId:source.itemId,revisionId:revision.id,stableKey:source.stableKey,parent,parentId:source.id,content});
 }
 const worker=new ContentReleaseWorker(new ContentReleaseWorkerRepository(api),{policy:{batchSize:128,maximumAttempts:5,initialRetryDelayMs:1000,maximumRetryDelayMs:300000}});
 const result={completed:0,retried:0,deadLettered:0};
 for(let pass=0;result.completed<EXPECTED_ENTRIES&&pass<10;pass++){
 const part=await worker.drain();for(const k of Object.keys(result))result[k]+=part[k];
 if(part.retried||part.deadLettered||!part.completed)throw Error(JSON.stringify(part));
 }
 if(result.retried||result.deadLettered||result.completed!==EXPECTED_ENTRIES)throw Error(JSON.stringify(result));
 for(const r of releases){
  if(db.prepare('SELECT revision_id FROM content_release_heads WHERE item_id=?').get(r.itemId)?.revision_id!==r.revisionId)throw Error('Release head mismatch');
  if(r.parent&&canonicalStudioJson(r.parent)!==canonicalStudioJson(await repo.releasedRuntimeRevision(r.parentId)))throw Error('Immutable parent changed');
 }
 for(const type of ['lesson','vocabulary']){
  const runtime=await repo.publishedRuntime({itemType:type,learnerSafe:true});
  for(const r of releases.filter(r=>type==='lesson'?!!r.content.lessonPages:!r.content.lessonPages)){
   const actual=runtime.items.find(i=>i.revisionId===r.revisionId)?.content;
   for(const field of type==='lesson'?['lessonPages','sourceVocabularyIds','vocabulary']:['hanzi','pinyin','meaningVi','examples','sourceVocabularyIds','sourceLessonIds'])if(canonicalStudioJson(actual?.[field])!==canonicalStudioJson(r.content[field]))throw Error(`Runtime content mismatch: ${r.stableKey}/${field}`);
  }
  if(type==='vocabulary')for(const id of plan.entries.filter(entry=>!entry.content.lessonPages).map(entry=>entry.content.sourceVocabularyIds[0]))if(!parsePublishedStudioVocabulary(runtime).some(w=>w.sourceVocabularyId===id))throw Error('Dictionary identity missing');
 }
 if(canonicalStudioJson(otherHeads)!==canonicalStudioJson(heads()))throw Error('Other heads changed');
 tables.forEach((t,i)=>{if(fingerprint(db,t)!==before[i])throw Error(`Protected data changed: ${t}`);});
 if(db.prepare('PRAGMA foreign_key_check').all().length)throw Error('Foreign key failure');
 db.exec(apply?'COMMIT':'ROLLBACK');
 const receipt={mode:apply?'apply':'rehearse-rollback',backup,protectedTables:tables.length,releases:releases.map(({stableKey,revisionId})=>({stableKey,revisionId})),completed:result.completed};
 if(apply){const path=plan.evidenceDocument.replace('.md','.json');if(existsSync(path))throw Error('Preserve existing receipt');writeFileSync(path,JSON.stringify(receipt,null,2)+'\n');}
 console.log({mode:receipt.mode,backup,protectedTables:tables.length,completed:result.completed,receipt:apply?plan.evidenceDocument.replace('.md','.json'):null});
}catch(error){if(db.isTransaction)db.exec('ROLLBACK');throw error;}finally{db.close();}










