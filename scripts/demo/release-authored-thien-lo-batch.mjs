/** One local transaction for a reviewed batch; preserve editor revisions and learner data. */
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {authoredBatches} from '../content/authored-batch-registry.mjs';
import {canonicalStudioJson,studioSha256,validateStudioContent} from '../../src/content/studioContent.ts';
import {parsePublishedStudioLessons} from '../../src/content/publishedStudioLessons.ts';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {ContentReleaseWorker,ContentReleaseWorkerRepository} from '../../src/server/contentReleaseWorker.ts';
import {backupLocalDatabase,findLocalDemoDatabase,openDatabase,requireDemoAccounts,fingerprint,d1Adapter} from './local-demo-database.mjs';

const selected=process.argv.find(a=>a.startsWith('--batch='))?.slice(8);
if(!selected||!Object.hasOwn(authoredBatches,selected))throw new Error('Select a registered --batch');
const read=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const draft=read(`../../content/drafts/${authoredBatches[selected].file}.json`);
const review=read(`../../content/review/${authoredBatches[selected].file}-local.json`);
const expected=authoredBatches[selected].lessonIds;
if(JSON.stringify(draft.items.map(i=>i.lessonId))!==JSON.stringify(expected))throw new Error('Batch inventory mismatch');
if(review.humanReviewed!==false||JSON.stringify(review.items.map(i=>i.lessonId))!==JSON.stringify(expected))throw new Error('Review inventory mismatch');
const entries=[];
for(const item of draft.items){
  const assessment=review.items.find(i=>i.lessonId===item.lessonId);
  if(item.studioContent.targetLessonId!==item.lessonId||assessment.sourceContentSha256!==await studioSha256(canonicalStudioJson(item.studioContent)))throw new Error(`Stale review: ${item.lessonId}`);
  const localReview={...assessment,humanReviewed:false,reviewedAt:review.reviewedAt,evidenceDocument:review.evidenceDocument,scope:review.scope};
  const content={...item.studioContent,review:{humanReviewed:false,aiSelfReview:assessment.aiSelfReview},localReview};
  const validation=await validateStudioContent('lesson',content);
  if(!validation.result.valid)throw new Error(JSON.stringify(validation.result.errors));
  entries.push({item,content,validation,stableKey:`thien-lo-v2-${item.lessonId}`});
}
const apply=process.argv.includes('--apply');
const db=openDatabase(findLocalDemoDatabase(process.cwd()));
try{
  requireDemoAccounts(db);
  if(apply)await backupLocalDatabase(db,process.cwd(),'before-authored-thien-lo-batch-release');
  db.exec('BEGIN IMMEDIATE');
  const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'content_%' AND name NOT LIKE 'sqlite_%' AND name NOT GLOB '_*'").all().map(r=>r.name).filter(n=>/^[a-z_]+$/.test(n)&&n!=='audit_events');
  const before=tables.map(t=>fingerprint(db,t));
  const pending=db.prepare("SELECT i.stable_key FROM content_release_outbox_events e JOIN content_items i ON i.id=e.item_id WHERE e.status IN ('pending','processing')").all();
  if(pending.some(r=>!entries.some(e=>e.stableKey===r.stable_key)))throw new Error('Unrelated release jobs must remain untouched');
  const orphans=db.prepare("SELECT i.stable_key FROM content_revisions r JOIN content_items i ON i.id=r.item_id WHERE r.workflow_state='published' AND r.validation_sha256 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM content_release_packages p WHERE p.revision_id=r.id) AND NOT EXISTS (SELECT 1 FROM content_release_outbox_events e WHERE e.revision_id=r.id AND e.event_type='content.release.requested' AND json_extract(e.payload_json,'$.action')='publish')").all();
  if(orphans.some(r=>!entries.some(e=>e.stableKey===r.stable_key)))throw new Error('Unrelated orphan publications must remain untouched');
  const api=d1Adapter(db),repo=new ContentStudioRepository(api),heads=[];
  const author={actorUserId:'local-demo-user-2',actorSessionId:null};
  const admin={actorUserId:'local-demo-user-3',actorSessionId:null};
  for(const {item,content,validation,stableKey} of entries){
    if(db.prepare("SELECT count(*) n FROM content_release_heads h JOIN content_revisions r ON r.id=h.revision_id JOIN content_items i ON i.id=h.item_id WHERE i.item_type='lesson' AND i.stable_key<>? AND json_extract(r.content_json,'$.targetLessonId')=?").get(stableKey,item.lessonId).n)throw new Error(`Duplicate target: ${item.lessonId}`);
    const row=db.prepare('SELECT r.id FROM content_revisions r JOIN content_items i ON i.id=r.item_id WHERE i.stable_key=? ORDER BY r.revision DESC LIMIT 1').get(stableKey);
    if(!row)throw new Error(`Import first: ${item.lessonId}`);
    let revision=await repo.getRevision(row.id);
    const manifest={schemaVersion:1,policy:'published-only',releaseBoundary:'content-release-worker-v1',items:[{stableKey,itemType:'lesson',level:revision.level,title:revision.title,revision:revision.revision,revisionId:revision.id,schemaVersion:1,contentSha256:validation.result.contentSha256,publishedAt:Date.now(),content}]};
    const projection=parsePublishedStudioLessons(manifest).get(item.lessonId)?.richContent.lessonPages;
    if(canonicalStudioJson(projection)!==canonicalStudioJson(item.lessonPages))throw new Error(`Projection changed pages: ${item.lessonId}`);
    if(revision.workflowState==='published'){
      if(canonicalStudioJson(revision.content)!==canonicalStudioJson(content))throw new Error(`Published content differs: ${item.lessonId}`);
    }else{
      if(revision.workflowState!=='draft'||canonicalStudioJson(revision.content)!==canonicalStudioJson(item.studioContent))throw new Error(`Preserve editor changes: ${item.lessonId}`);
      revision=await repo.updateDraft({...author,revisionId:revision.id,expectedRowVersion:revision.rowVersion,title:revision.title,level:revision.level,content,idempotencyKey:`${stableKey}:review-v1`});
      revision=await repo.validateRevision({...author,revisionId:revision.id,expectedRowVersion:revision.rowVersion,idempotencyKey:`${stableKey}:validate-v1`});
      if(!revision.validation?.valid)throw new Error('Revision validation failed');
      for(const toState of ['submitted','approved','published'])revision=await repo.transition({...(toState==='submitted'?author:admin),revisionId:revision.id,expectedRowVersion:revision.rowVersion,toState,idempotencyKey:`${stableKey}:${toState}-v1`,requestId:randomUUID(),note:'Phát hành lô local theo phạm vi đã chốt; AI-assisted, humanReviewed:false.'});
    }
    heads.push({stableKey,revisionId:revision.id});
  }
  // Each draft enqueues validation and publication; reserve both events per lesson.
  const worker=new ContentReleaseWorker(new ContentReleaseWorkerRepository(api),{policy:{batchSize:entries.length*2,maximumAttempts:5,initialRetryDelayMs:1000,maximumRetryDelayMs:300000}});
  const result=await worker.drain();
  if(result.retried||result.deadLettered)throw new Error(JSON.stringify(result));
  for(const head of heads){
    const actual=db.prepare('SELECT h.revision_id FROM content_release_heads h JOIN content_items i ON i.id=h.item_id WHERE i.stable_key=?').get(head.stableKey);
    if(actual?.revision_id!==head.revisionId)throw new Error(`Release head mismatch: ${head.stableKey}`);
  }
  tables.forEach((t,i)=>{if(fingerprint(db,t)!==before[i])throw new Error(`Protected data changed: ${t}`);});
  if(db.prepare('PRAGMA foreign_key_check').all().length)throw new Error('Foreign key check failed');
  db.exec(apply?'COMMIT':'ROLLBACK');
  console.log({mode:apply?'apply':'rehearse-rollback',lessons:heads.length,completed:result.completed,protectedTables:tables.length});
}catch(error){if(db.isTransaction)db.exec('ROLLBACK');throw error;}
finally{db.close();}
