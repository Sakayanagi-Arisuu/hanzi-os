/** Repair diagram captions in the already released local HSK3 production batch. */
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {canonicalStudioJson,studioSha256,validateStudioContent} from '../../src/content/studioContent.ts';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {ContentReleaseWorker,ContentReleaseWorkerRepository} from '../../src/server/contentReleaseWorker.ts';
import {authoredBatches} from '../content/authored-batch-registry.mjs';
import {backupLocalDatabase,findLocalDemoDatabase,openDatabase,requireDemoAccounts,fingerprint,d1Adapter} from './local-demo-database.mjs';

const draft=JSON.parse(readFileSync('content/drafts/thien-lo-hsk3-production-v2.json','utf8'));
const review=JSON.parse(readFileSync('content/review/thien-lo-hsk3-production-v2-local.json','utf8'));
if(JSON.stringify(draft.items.map(i=>i.lessonId))!==JSON.stringify(authoredBatches.hsk3Production.lessonIds)||review.humanReviewed!==false)throw Error('Scope changed');
const apply=process.argv.includes('--apply'),db=openDatabase(findLocalDemoDatabase(process.cwd()));
try{
 requireDemoAccounts(db);
 if(apply)await backupLocalDatabase(db,process.cwd(),'before-hsk3-production-diagram-captions');
 db.exec('BEGIN IMMEDIATE');
 if(db.prepare("SELECT count(*) n FROM content_release_outbox_events WHERE status IN ('pending','processing')").get().n)throw Error('Unrelated release jobs must remain untouched');
 const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'content_%' AND name NOT LIKE 'sqlite_%' AND name NOT GLOB '_*'").all().map(r=>r.name).filter(n=>/^[a-z_]+$/.test(n)&&n!=='audit_events');
 const before=tables.map(t=>fingerprint(db,t));
 const api=d1Adapter(db),repo=new ContentStudioRepository(api),author={actorUserId:'local-demo-user-2',actorSessionId:null},admin={actorUserId:'local-demo-user-3',actorSessionId:null},heads=[];
 for(const item of draft.items){
  const stableKey=`thien-lo-v2-${item.lessonId}`;
  const row=db.prepare('SELECT r.id FROM content_revisions r JOIN content_items i ON i.id=r.item_id WHERE i.stable_key=? ORDER BY r.revision DESC LIMIT 1').get(stableKey);
  if(!row)throw Error(`Missing source: ${item.lessonId}`);
  const source=await repo.getRevision(row.id);
  if(source.workflowState!=='published'||db.prepare('SELECT revision_id FROM content_release_heads WHERE item_id=?').get(source.itemId)?.revision_id!==source.id)throw Error(`Preserve editor revision: ${item.lessonId}`);
  if((await repo.getLatestRevision(source.itemId)).id!==source.id)throw Error(`Newer draft exists: ${item.lessonId}`);
  const assessment=review.items.find(entry=>entry.lessonId===item.lessonId);
  if(!assessment||assessment.sourceContentSha256!==await studioSha256(canonicalStudioJson(item.studioContent)))throw Error(`Stale review: ${item.lessonId}`);
  const expected=structuredClone(source.content);
  delete expected.localReview;
  expected.review=item.studioContent.review;
  const oldPage=expected.lessonPages.pages.find(page=>page.id===`${item.lessonId}:v2:diagram`),newPage=item.lessonPages.pages.find(page=>page.id===`${item.lessonId}:v2:diagram`);
  if(!oldPage||!newPage||oldPage.blocks.length!==1||newPage.blocks.length!==1)throw Error(`Unexpected diagram: ${item.lessonId}`);
  const oldNodes=oldPage.blocks[0].diagram.nodes,newNodes=newPage.blocks[0].diagram.nodes;
  if(oldNodes.length!==newNodes.length)throw Error('Diagram node count changed');
  for(let index=0;index<oldNodes.length;index++){
   const old=oldNodes[index],next=newNodes[index];
   for(const field of ['id','meaningVi','note','x','y'])if(old[field]!==next[field])throw Error(`Diagram fact changed: ${item.lessonId}`);
   old.label=next.label;old.pinyin=next.pinyin;
  }
  if(canonicalStudioJson(expected)!==canonicalStudioJson(item.studioContent))throw Error(`Unexpected content change: ${item.lessonId}`);
  const content={...item.studioContent,review:{humanReviewed:false,aiSelfReview:assessment.aiSelfReview},localReview:{...assessment,humanReviewed:false,reviewedAt:review.reviewedAt,evidenceDocument:review.evidenceDocument,scope:review.scope}};
  const validation=await validateStudioContent('lesson',content);
  if(!validation.result.valid)throw Error(JSON.stringify(validation.result.errors));
  let revision=await repo.forkRevision({...author,sourceRevisionId:source.id,idempotencyKey:`diagram-caption-v1:${source.id}:fork`});
  revision=await repo.updateDraft({...author,revisionId:revision.id,expectedRowVersion:revision.rowVersion,title:revision.title,level:revision.level,content,idempotencyKey:`diagram-caption-v1:${source.id}:save`});
  revision=await repo.validateRevision({...author,revisionId:revision.id,expectedRowVersion:revision.rowVersion,idempotencyKey:`diagram-caption-v1:${source.id}:validate`});
  if(!revision.validation?.valid)throw Error('Revision validation failed');
  for(const toState of ['submitted','approved','published'])revision=await repo.transition({...(toState==='submitted'?author:admin),revisionId:revision.id,expectedRowVersion:revision.rowVersion,toState,idempotencyKey:`diagram-caption-v1:${source.id}:${toState}`,requestId:randomUUID(),note:'Sửa nhãn sơ đồ Hán tự/Pinyin trên local; dữ kiện Việt và hoạt động giữ nguyên; humanReviewed:false.'});
  heads.push({itemId:source.itemId,revisionId:revision.id});
 }
 const result=await new ContentReleaseWorker(new ContentReleaseWorkerRepository(api),{policy:{batchSize:draft.items.length*2,maximumAttempts:5,initialRetryDelayMs:1000,maximumRetryDelayMs:300000}}).drain();
 if(result.retried||result.deadLettered)throw Error(JSON.stringify(result));
 for(const head of heads)if(db.prepare('SELECT revision_id FROM content_release_heads WHERE item_id=?').get(head.itemId)?.revision_id!==head.revisionId)throw Error('Release head mismatch');
 tables.forEach((table,index)=>{if(fingerprint(db,table)!==before[index])throw Error(`Protected data changed: ${table}`)});
 if(db.prepare('PRAGMA foreign_key_check').all().length)throw Error('Foreign key failure');
 db.exec(apply?'COMMIT':'ROLLBACK');
 console.log({mode:apply?'apply':'rehearse-rollback',lessons:heads.length,completed:result.completed,protectedTables:tables.length});
}catch(error){if(db.isTransaction)db.exec('ROLLBACK');throw error}finally{db.close()}
