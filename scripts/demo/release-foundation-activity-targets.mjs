/** Scoped HSK0 target review/release. No learner tables, existing revisions or answers change. */
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {applyEditorialActivityTargets,applyMissingEditorialActivityTargets} from '../../src/content/editorialActivityTargets.ts';
import {canonicalStudioJson,studioSha256,validateStudioContent} from '../../src/content/studioContent.ts';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {ContentReleaseWorker,ContentReleaseWorkerRepository} from '../../src/server/contentReleaseWorker.ts';
import {publishedLessonPageActivities} from '../../src/server/publishedLessonPageActivities.ts';
import {applyCharacterTargetCorrections} from '../content/apply-character-target-corrections.mjs';
import {backupLocalDatabase,findLocalDemoDatabase,openDatabase,requireDemoAccounts,d1Adapter,fingerprint} from './local-demo-database.mjs';

const read=path=>JSON.parse(readFileSync(path,'utf8'));
const hash=value=>studioSha256(canonicalStudioJson(value));
const scope=process.argv.find(arg=>arg.startsWith('--scope='))?.slice(8)??'boot';
if(!['boot','characters','hsk4-self-speaking','survival','everyday','journey-professional','hsk3-cohesion'].includes(scope))throw Error('Unknown foundation target scope');
const config=scope==='boot'?{
 plan:'content/drafts/thien-lo-boot-2-4-activity-targets.json',review:'content/review/thien-lo-boot-2-4-activity-targets-local.json',evidence:'docs/thien-lo-redesign-review/57-REVIEW-BOOT-2-4-TARGETS.md',description:'HSK0 boot-2/3/4 activity target metadata; visual rule recognition and self-review only, no listening or pronunciation score.',backup:'before-boot-2-4-activity-targets',manuscript:[read('content/drafts/thien-lo-boot-2-v2.json'),...read('content/drafts/thien-lo-boot-sound-batch-v2.json').items],
}:scope==='characters'?{
 plan:'content/drafts/thien-lo-character-activity-targets.json',review:'content/review/thien-lo-character-activity-targets-local.json',evidence:'docs/thien-lo-redesign-review/58-REVIEW-CHARACTER-TARGETS.md',description:'HSK1 character activity targets and one contextual correction for 做/作; recognition, supported input and self-review, not handwriting mastery.',backup:'before-character-activity-targets',manuscript:read('content/drafts/thien-lo-character-batch-v2.json').items,
}:scope==='survival'?{
 plan:'content/drafts/thien-lo-survival-activity-targets.json',review:'content/review/thien-lo-survival-activity-targets-local.json',evidence:'docs/thien-lo-redesign-review/60-REVIEW-SURVIVAL-TARGETS.md',description:'Nine HSK1 survival lessons: exact vocabulary, grammar and task targets for choice, cloze and self-review writing.',backup:'before-survival-activity-targets',manuscript:read('content/drafts/thien-lo-survival-batch-v2.json').items,
}:scope==='everyday'?{
 plan:'content/drafts/thien-lo-everyday-activity-targets.json',review:'content/review/thien-lo-everyday-activity-targets-local.json',evidence:'docs/thien-lo-redesign-review/61-REVIEW-EVERYDAY-TARGETS.md',description:'Ten HSK1 everyday/time-place lessons: exact vocabulary, grammar and task targets for choice, cloze and self-review writing.',backup:'before-everyday-activity-targets',manuscript:read('content/drafts/thien-lo-everyday-batch-v2.json').items,
}:scope==='journey-professional'?{
 plan:'content/drafts/thien-lo-journey-professional-targets.json',review:'content/review/thien-lo-journey-professional-targets-local.json',evidence:'docs/thien-lo-redesign-review/62-REVIEW-JOURNEY-PROFESSIONAL-TARGETS.md',description:'Two HSK1 journey and four professional lessons: exact source links for choices, orders, clozes and self-review writing.',backup:'before-journey-professional-targets',manuscript:[...read('content/drafts/thien-lo-journey-batch-v2.json').items,...[1,2,3,4].map(n=>read(`content/drafts/thien-lo-professional-${n}-v2.json`))],
}:scope==='hsk3-cohesion'?{
 plan:'content/drafts/thien-lo-hsk3-cohesion-targets.json',review:'content/review/thien-lo-hsk3-cohesion-targets-local.json',evidence:'docs/thien-lo-redesign-review/63-REVIEW-HSK3-COHESION-TARGETS.md',description:'HSK3 cohesion timeline reading and self-review writing target links; no unsupported writing mastery.',backup:'before-hsk3-cohesion-targets',manuscript:[read('content/drafts/thien-lo-hsk3-timeline-v2.json')],
}:{
 plan:'content/drafts/thien-lo-hsk4-self-speaking-targets.json',review:'content/review/thien-lo-hsk4-self-speaking-targets-local.json',evidence:'docs/thien-lo-redesign-review/59-REVIEW-HSK4-SELF-SPEAKING-TARGETS.md',description:'HSK4 self-speaking rubric target metadata; no audio capture, pronunciation score or speaking mastery.',backup:'before-hsk4-self-speaking-targets',manuscript:['hsk4-precision-reference-quantity','hsk4-stance-comparison-rhetoric','hsk4-event-agency-voice','hsk4-information-order-cohesion','hsk4-argument-logic-concession','hsk4-structured-spoken-defense','hsk4-timed-sectional-rehearsal'].flatMap(name=>read(`content/drafts/thien-lo-${name}-v2.json`).items),
};
const survivalIllustrations={
 'survival-1':'polite-help-v1.webp','survival-2':'pronoun-group-v1.webp','survival-3':'fictional-profile-v1.webp',
 'survival-4':'family-album-v1.webp','survival-5':'pets-introduction-v1.webp','survival-6':'clothes-opinion-v1.webp',
 'survival-7':'conversation-invitation-v1.webp','survival-8':'phone-callback-v1.webp','survival-9':'morning-routine-v1.webp',
};
const plan=read(config.plan);
const reviewPath=config.review;
const reviewFlags={accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true};
const manuscript=config.manuscript;
if(plan.humanReviewed!==false||canonicalStudioJson(plan.lessonIds)!==canonicalStudioJson(manuscript.map(item=>item.lessonId)))throw Error('Unexpected target scope');
const mode=process.argv.includes('--record-review')?'record-review':process.argv.includes('--apply')?'apply':'rehearse-rollback';
const db=openDatabase(findLocalDemoDatabase(process.cwd()),mode==='record-review');
try{
 requireDemoAccounts(db);
 const repo=new ContentStudioRepository(d1Adapter(db));
 const entries=[];
 for(const lessonId of plan.lessonIds){
  const row=db.prepare('SELECT h.revision_id FROM content_release_heads h JOIN content_items i ON i.id=h.item_id WHERE i.stable_key=?').get(`thien-lo-v2-${lessonId}`);
  if(!row)throw Error(`Missing published head: ${lessonId}`);
  const source=await repo.getRevision(row.revision_id);
  if(source.workflowState!=='published'||source.content.targetLessonId!==lessonId||(await repo.getLatestRevision(source.itemId)).id!==source.id)throw Error(`Preserve editor revision: ${lessonId}`);
  const authored=manuscript.find(item=>item.lessonId===lessonId);
  if(!authored)throw Error(`Missing authored manuscript: ${lessonId}`);
  const manuscriptComparison=structuredClone(source.content.lessonPages);
  if(scope==='survival'){
   const illustration=manuscriptComparison.pages[0]?.illustration;
   const expectedSrc=`/lessons/ngoc-dien/${survivalIllustrations[lessonId]}`;
   if(authored.lessonPages.pages[0].illustration||illustration?.src!==expectedSrc||!illustration.alt||!illustration.provenance.includes('humanReviewed:false')||!existsSync(`public${expectedSrc}`))throw Error(`Unexpected published illustration: ${lessonId}`);
   delete manuscriptComparison.pages[0].illustration;
  }
  if(canonicalStudioJson(manuscriptComparison)!==canonicalStudioJson(authored.lessonPages))throw Error(`Published manuscript drift: ${lessonId}`);
  const targets=plan.targets[lessonId];
  const corrected=applyCharacterTargetCorrections(source.content.lessonPages,plan.contentCorrections?.[lessonId]??{});
  const pages=plan.partial?applyMissingEditorialActivityTargets(lessonId,corrected,targets):applyEditorialActivityTargets(lessonId,corrected,targets);
  const proposed={...source.content,lessonPages:pages,review:{humanReviewed:false,aiSelfReview:reviewFlags}};
  delete proposed.localReview;
  const validation=await validateStudioContent('lesson',proposed);
  if(!validation.result.valid)throw Error(JSON.stringify({lessonId,errors:validation.result.errors}));
  entries.push({lessonId,source,targets,proposed,record:{lessonId,parentRevisionId:source.id,parentContentSha256:await hash(source.content),proposedContentSha256:await hash(proposed),targetCount:Object.keys(targets).length}});
 }
 const planSha256=await hash(plan);
 if(mode==='record-review'){
  const review={schemaVersion:1,humanReviewed:false,reviewedAt:'2026-09-29',scope:config.description,evidenceDocument:config.evidence,targetPlanSha256:planSha256,aiSelfReview:reviewFlags,items:entries.map(e=>e.record)};
  writeFileSync(reviewPath,JSON.stringify(review,null,2)+'\n');
  console.log({mode,lessons:entries.length,targets:entries.reduce((n,e)=>n+e.record.targetCount,0),databaseReadOnly:true});
 }else{
  const review=read(reviewPath);
  if(review.humanReviewed!==false||review.targetPlanSha256!==planSha256||review.items.length!==entries.length||canonicalStudioJson(review.aiSelfReview)!==canonicalStudioJson(reviewFlags))throw Error('Review changed');
  for(const entry of entries){const recorded=review.items.find(item=>item.lessonId===entry.lessonId);if(canonicalStudioJson(recorded)!==canonicalStudioJson(entry.record))throw Error(`Stale review: ${entry.lessonId}`);}
  if(mode==='apply')await backupLocalDatabase(db,process.cwd(),config.backup);
  db.exec('BEGIN IMMEDIATE');
  try{
   if(db.prepare("SELECT count(*) n FROM content_release_outbox_events WHERE status IN ('pending','processing')").get().n)throw Error('Unrelated release jobs must remain untouched');
   const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'content_%' AND name NOT LIKE 'sqlite_%' AND name NOT GLOB '_*'").all().map(r=>r.name).filter(n=>/^[a-z_]+$/.test(n)&&n!=='audit_events');
   const before=tables.map(table=>fingerprint(db,table));
   const otherHeads=db.prepare(`SELECT * FROM content_release_heads WHERE item_id NOT IN (${entries.map(()=>'?').join(',')}) ORDER BY item_id`).all(...entries.map(e=>e.source.itemId));
   const author={actorUserId:'local-demo-user-2',actorSessionId:null},admin={actorUserId:'local-demo-user-3',actorSessionId:null};
   const released=[];
   for(const entry of entries){
    const {lessonId,source,proposed}=entry;
    if(db.prepare('SELECT revision_id FROM content_release_heads WHERE item_id=?').get(source.itemId)?.revision_id!==source.id||(await repo.getLatestRevision(source.itemId)).id!==source.id)throw Error(`Head changed: ${lessonId}`);
    const parentPackage=await repo.releasedRuntimeRevision(source.id);
    if(!parentPackage)throw Error(`Missing immutable parent package: ${lessonId}`);
    const content={...proposed,localReview:{humanReviewed:false,scope:review.scope,evidenceDocument:review.evidenceDocument,reviewedAt:review.reviewedAt,targetPlanSha256:planSha256,parentRevisionId:source.id}};
    const validation=await validateStudioContent('lesson',content);
    if(!validation.result.valid)throw Error(JSON.stringify({lessonId,errors:validation.result.errors}));
    const key=`${scope}-targets:${source.id}`;
    let revision=await repo.forkRevision({...author,sourceRevisionId:source.id,idempotencyKey:`${key}:fork`});
    revision=await repo.updateDraft({...author,revisionId:revision.id,expectedRowVersion:revision.rowVersion,title:revision.title,level:revision.level,content,idempotencyKey:`${key}:save`});
    revision=await repo.validateRevision({...author,revisionId:revision.id,expectedRowVersion:revision.rowVersion,idempotencyKey:`${key}:validate`});
    if(!revision.validation?.valid)throw Error(`Validation failed: ${lessonId}`);
    for(const toState of ['submitted','approved','published'])revision=await repo.transition({...(toState==='submitted'?author:admin),revisionId:revision.id,expectedRowVersion:revision.rowVersion,toState,idempotencyKey:`${key}:${toState}`,requestId:randomUUID(),note:'Scoped target metadata local; AI self-review, humanReviewed:false; no mastery claim.'});
    released.push({entry,revision,parentPackage});
   }
   const result=await new ContentReleaseWorker(new ContentReleaseWorkerRepository(d1Adapter(db)),{policy:{batchSize:entries.length*2,maximumAttempts:5,initialRetryDelayMs:1000,maximumRetryDelayMs:300000}}).drain();
   if(result.retried||result.deadLettered)throw Error(JSON.stringify(result));
   const runtime=await repo.publishedRuntime({itemType:'lesson',learnerSafe:true});
   for(const {entry,revision,parentPackage} of released){
    if(db.prepare('SELECT revision_id FROM content_release_heads WHERE item_id=?').get(entry.source.itemId)?.revision_id!==revision.id)throw Error(`Head mismatch: ${entry.lessonId}`);
    if(canonicalStudioJson(await repo.releasedRuntimeRevision(entry.source.id))!==canonicalStudioJson(parentPackage))throw Error(`Parent package changed: ${entry.lessonId}`);
    const item=runtime.items.find(i=>i.revisionId===revision.id);
    if(!item||canonicalStudioJson(item.content.lessonPages)!==canonicalStudioJson(entry.proposed.lessonPages))throw Error(`Runtime pages changed: ${entry.lessonId}`);
    const registry=await publishedLessonPageActivities({...runtime,items:[item]});
    if(Object.keys(entry.targets).some(blockId=>![...registry.values()].some(activity=>activity.blockId===blockId&&canonicalStudioJson(activity.activity.learningTarget)===canonicalStudioJson(entry.targets[blockId]))))throw Error(`Runtime target mismatch: ${entry.lessonId}`);
   }
   if(canonicalStudioJson(otherHeads)!==canonicalStudioJson(db.prepare(`SELECT * FROM content_release_heads WHERE item_id NOT IN (${entries.map(()=>'?').join(',')}) ORDER BY item_id`).all(...entries.map(e=>e.source.itemId))))throw Error('Other heads changed');
   tables.forEach((table,index)=>{if(fingerprint(db,table)!==before[index])throw Error(`Protected table changed: ${table}`)});
   if(db.prepare('PRAGMA foreign_key_check').all().length)throw Error('Foreign key failure');
   db.exec(mode==='apply'?'COMMIT':'ROLLBACK');
   console.log({mode,lessons:entries.length,targets:entries.reduce((n,e)=>n+e.record.targetCount,0),completed:result.completed,protectedTables:tables.length});
  }catch(error){if(db.isTransaction)db.exec('ROLLBACK');throw error;}
 }
}finally{db.close();}
