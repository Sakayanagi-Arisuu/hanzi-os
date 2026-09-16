import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { canonicalStudioJson, studioSha256, validateStudioContent } from '../../src/content/studioContent.ts';
import { parsePublishedStudioLessons } from '../../src/content/publishedStudioLessons.ts';
import { ContentStudioRepository } from '../../src/server/contentStudioRepository.ts';
import { ContentReleaseWorker, ContentReleaseWorkerRepository } from '../../src/server/contentReleaseWorker.ts';
import { backupLocalDatabase, findLocalDemoDatabase, openDatabase, requireDemoAccounts, fingerprint, d1Adapter } from './local-demo-database.mjs';

const manuscripts={
  'hsk2-daily-needs-family-lesson-01':'thien-lo-hsk2-polite-request-v2',
  'boot-1':'thien-lo-boot-1-v2',
  'professional-4':'thien-lo-professional-4-v2',
  'professional-3':'thien-lo-professional-3-v2',
  'professional-2':'thien-lo-professional-2-v2',
  'boot-2':'thien-lo-boot-2-v2',
  'professional-1':'thien-lo-professional-1-v2',
  'hsk3-cohesion-reconstruction-lesson-01':'thien-lo-hsk3-timeline-v2',
};
const selected=process.argv.find(arg=>arg.startsWith('--lesson='))?.slice('--lesson='.length)??'professional-1';
const manuscript=manuscripts[selected];
if(!manuscript)throw new Error('Unknown authored lesson; select a registered manuscript.');
const draft = JSON.parse(readFileSync(new URL(`../../content/drafts/${manuscript}.json`,import.meta.url),'utf8'));
const review = JSON.parse(readFileSync(new URL(`../../content/review/${manuscript}-local.json`,import.meta.url),'utf8'));
if(draft.lessonId!==selected||draft.studioContent?.targetLessonId!==selected)throw new Error('Manuscript target mismatch');
if(review.humanReviewed!==false || review.lessonId!==draft.lessonId || review.sourceContentSha256!==await studioSha256(canonicalStudioJson(draft.studioContent))) throw new Error('Review is stale or targets another manuscript');
const stableKey=`thien-lo-v2-${selected}`;
const content={...draft.studioContent,review:{humanReviewed:false,aiSelfReview:review.aiSelfReview},localReview:review};
const validation=await validateStudioContent('lesson',content);
if(!validation.result.valid)throw new Error(JSON.stringify(validation.result.errors));
const apply=process.argv.includes('--apply');
const db=openDatabase(findLocalDemoDatabase(process.cwd()));
try {
  requireDemoAccounts(db);
  if(apply)await backupLocalDatabase(db,process.cwd(),'before-authored-thien-lo-release');
  db.exec('BEGIN IMMEDIATE');
  const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'content_%' AND name NOT LIKE 'sqlite_%' AND name NOT GLOB '_*'").all().map(r=>r.name).filter(n=>/^[a-z_]+$/.test(n)&&n!=='audit_events');
  const before=tables.map(table=>fingerprint(db,table));
  if(db.prepare("SELECT count(*) n FROM content_release_heads h JOIN content_revisions r ON r.id=h.revision_id JOIN content_items i ON i.id=h.item_id WHERE i.item_type='lesson' AND i.stable_key<>? AND json_extract(r.content_json,'$.targetLessonId')=?").get(stableKey,draft.lessonId).n)throw new Error('Another released item targets this lesson; reconcile its revision instead of publishing a duplicate');
  if(db.prepare("SELECT count(*) n FROM content_release_outbox_events e JOIN content_items i ON i.id=e.item_id WHERE e.status IN ('pending','processing') AND i.stable_key<>?").get(stableKey).n)throw new Error('Unrelated release jobs must remain untouched');
  const api=d1Adapter(db),repo=new ContentStudioRepository(api);
  const row=db.prepare('SELECT r.id FROM content_revisions r JOIN content_items i ON i.id=r.item_id WHERE i.stable_key=? ORDER BY r.revision DESC LIMIT 1').get(stableKey);
  if(!row)throw new Error('Import authored draft first');
  let revision=await repo.getRevision(row.id);
  const author={actorUserId:'local-demo-user-2',actorSessionId:null};
  const admin={actorUserId:'local-demo-user-3',actorSessionId:null};
  const manifest={schemaVersion:1,policy:'published-only',releaseBoundary:'content-release-worker-v1',items:[{stableKey,itemType:'lesson',level:revision.level,title:revision.title,revision:revision.revision,revisionId:revision.id,schemaVersion:1,contentSha256:validation.result.contentSha256,publishedAt:Date.now(),content}]};
  if(parsePublishedStudioLessons(manifest).get(draft.lessonId)?.richContent.lessonPages.pages.length!==draft.lessonPages.pages.length)throw new Error('Runtime projection lost authored pages');
  if(revision.workflowState==='published') {
    if(canonicalStudioJson(revision.content)!==canonicalStudioJson(content))throw new Error('Published content differs from reviewed manuscript');
  } else {
    if(revision.workflowState!=='draft'||canonicalStudioJson(revision.content)!==canonicalStudioJson(draft.studioContent))throw new Error('Editor changes require a fresh review');
    revision=await repo.updateDraft({...author,revisionId:revision.id,expectedRowVersion:revision.rowVersion,title:revision.title,level:revision.level,content,idempotencyKey:`${stableKey}:review-v1`});
    revision=await repo.validateRevision({...author,revisionId:revision.id,expectedRowVersion:revision.rowVersion,idempotencyKey:`${stableKey}:validate-v1`});
    if(!revision.validation?.valid)throw new Error('Revision validation failed');
    for(const toState of ['submitted','approved','published'])revision=await repo.transition({...(toState==='submitted'?author:admin),revisionId:revision.id,expectedRowVersion:revision.rowVersion,toState,idempotencyKey:`${stableKey}:${toState}-v1`,requestId:randomUUID(),note:'Phát hành mẫu local theo hồ sơ đã chốt; AI-assisted, humanReviewed:false, chưa nghiệm thu toàn Thiên Lộ.'});
  }
  const worker=new ContentReleaseWorker(new ContentReleaseWorkerRepository(api),{policy:{batchSize:10,maximumAttempts:5,initialRetryDelayMs:1000,maximumRetryDelayMs:300000}});
  const result=await worker.drain();
  if(result.retried||result.deadLettered)throw new Error(JSON.stringify(result));
  const head=db.prepare('SELECT h.revision_id FROM content_release_heads h JOIN content_items i ON i.id=h.item_id WHERE i.stable_key=?').get(stableKey);
  if(head?.revision_id!==revision.id)throw new Error('Release head did not advance');
  tables.forEach((table,index)=>{if(fingerprint(db,table)!==before[index])throw new Error(`Protected data changed: ${table}`);});
  if(db.prepare('PRAGMA foreign_key_check').all().length)throw new Error('Foreign key check failed');
  db.exec(apply?'COMMIT':'ROLLBACK');
  console.log({mode:apply?'apply':'rehearse-rollback',lesson:draft.lessonId,completed:result.completed,protectedTables:tables.length});
} catch(error) {if(db.isTransaction)db.exec('ROLLBACK');throw error;}
finally {db.close();}
