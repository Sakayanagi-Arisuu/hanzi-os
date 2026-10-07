import {precisionMapIds,applyPrecisionSourceMaps,summaryMapIds,applySummarySourceMaps,integrationMapIds,applyIntegrationSourceMaps} from '../content/hsk4-precision-map-decisions.mjs';
const precisionMaps=process.argv.includes('--hsk4-precision-maps');
const summaryMaps=process.argv.includes('--hsk4-summary-maps');
const integrationMaps=process.argv.includes('--hsk4-integration-maps');
import {hsk2LastContextVisuals,applyHsk2LastContextVisual} from '../content/hsk2-last-context-visual-decisions.mjs';
const hsk2LastContext=process.argv.includes('--hsk2-last-context-scenes');
import {hsk2ReferenceTravelVisuals,applyHsk2ReferenceTravelVisual} from '../content/hsk2-reference-travel-visual-decisions.mjs';
const hsk2ReferenceTravel=process.argv.includes('--hsk2-reference-travel-scenes');
import {hsk2GrammarVisuals,applyHsk2GrammarVisual} from '../content/hsk2-grammar-visual-decisions.mjs';
const hsk2Grammar=process.argv.includes('--hsk2-grammar-scenes');
import {hsk2EnvironmentVisuals,applyHsk2EnvironmentVisual} from '../content/hsk2-environment-visual-decisions.mjs';
const hsk2Environment=process.argv.includes('--hsk2-environment-scenes');
import {hsk2StudyVisuals,applyHsk2StudyVisual} from '../content/hsk2-study-visual-decisions.mjs';
const hsk2Study=process.argv.includes('--hsk2-study-scenes');
import {hsk2LifeVisuals,applyHsk2LifeVisual} from '../content/hsk2-life-visual-decisions.mjs';
const hsk2Life=process.argv.includes('--hsk2-life-scenes');
import {hsk2DailyVisuals,applyHsk2DailyVisual} from '../content/hsk2-daily-visual-decisions.mjs';
const hsk2Daily=process.argv.includes('--hsk2-daily-scenes');
/** Local, bounded image-only revisions; source heads and learner tables are protected. */
import {existsSync,readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {canonicalStudioJson,studioSha256} from '../../src/content/studioContent.ts';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {ContentReleaseWorker,ContentReleaseWorkerRepository} from '../../src/server/contentReleaseWorker.ts';
import {backupLocalDatabase,findLocalDemoDatabase,openDatabase,requireDemoAccounts,fingerprint,d1Adapter} from './local-demo-database.mjs';
import {applyDailyVisualDecision,dailyVisualAssets} from '../content/daily-visual-decisions.mjs';
import {LESSON_SCENES} from '../../src/learning/lessonPresentation.ts';
import {characterVisualIds,applyCharacterVisualDecision} from '../content/character-visual-decisions.mjs';
import {survivalDialogueAssets,applySurvivalDialogueVisual} from '../content/survival-dialogue-visuals.mjs';
import {timePlaceVisualIds,applyTimePlaceVisualDecision} from '../content/time-place-visual-decisions.mjs';
import {locationVisualIds,applyLocationDialogueVisual} from '../content/location-dialogue-visual.mjs';
import {weatherVisualIds,applyWeatherVisualDecision} from '../content/weather-visual-decisions.mjs';
import {numbersWeekVisuals,applyNumbersWeekVisual} from '../content/numbers-week-visual-decisions.mjs';
import {remainingTimeVisuals,applyRemainingTimeVisual} from '../content/remaining-time-visual-decisions.mjs';
import {professionalVisuals,applyProfessionalVisual} from '../content/professional-visual-decisions.mjs';
import {journeyVisuals,applyJourneyVisual} from '../content/journey-visual-decisions.mjs';
import {bootVisuals,applyBootVisual} from '../content/boot-visual-decisions.mjs';
const boot=process.argv.includes('--boot-visuals');
const journey=process.argv.includes('--journey-visuals');
const professional=process.argv.includes('--professional-visuals');
const remainingTime=process.argv.includes('--remaining-time');
const numbersWeek=process.argv.includes('--numbers-week');
const weatherVisual=process.argv.includes('--weather-visuals');
const locationVisual=process.argv.includes('--location-dialogue');
const timePlaceVisuals=process.argv.includes('--time-place-visuals');
const survivalDialogue=process.argv.includes('--survival-dialogue');
const remaining=process.argv.includes('--remaining-survival');
const learningScenes=process.argv.includes('--learning-scenes');
const dailyScenes=process.argv.includes('--daily-scenes');
const characterVisuals=process.argv.includes('--character-visuals');
if([integrationMaps,summaryMaps,precisionMaps,hsk2LastContext,hsk2ReferenceTravel,hsk2Grammar,hsk2Environment,hsk2Study,hsk2Life,hsk2Daily,remaining,learningScenes,dailyScenes,characterVisuals,survivalDialogue,timePlaceVisuals,locationVisual,weatherVisual,numbersWeek,remainingTime,professional,journey,boot].filter(Boolean).length>1)throw Error('Choose one visual scope');
const file=integrationMaps?'thien-lo-hsk4-integration-map-revisions-v1':summaryMaps?'thien-lo-hsk4-summary-map-revisions-v1':precisionMaps?'thien-lo-hsk4-precision-map-revisions-v1':hsk2LastContext?'thien-lo-hsk2-last-context-visual-revisions-v1':hsk2ReferenceTravel?'thien-lo-hsk2-reference-travel-visual-revisions-v1':hsk2Grammar?'thien-lo-hsk2-grammar-visual-revisions-v1':hsk2Environment?'thien-lo-hsk2-environment-visual-revisions-v1':hsk2Study?'thien-lo-hsk2-study-visual-revisions-v1':hsk2Life?'thien-lo-hsk2-life-visual-revisions-v1':hsk2Daily?'thien-lo-hsk2-daily-visual-revisions-v1':boot?'thien-lo-boot-visual-revisions-v1':journey?'thien-lo-journey-visual-revisions-v1':professional?'thien-lo-professional-visual-revisions-v1':remainingTime?'thien-lo-remaining-time-visual-revisions-v1':numbersWeek?'thien-lo-numbers-week-visual-revisions-v1':weatherVisual?'thien-lo-weather-visual-revisions-v1':locationVisual?'thien-lo-location-dialogue-revisions-v1':timePlaceVisuals?'thien-lo-time-place-visual-revisions-v1':survivalDialogue?'thien-lo-survival-dialogue-visuals-v1':characterVisuals?'thien-lo-character-visual-revisions-v1':dailyScenes?'thien-lo-daily-visual-revisions-v1':learningScenes?'thien-lo-hsk1-learning-scenes-v1':remaining?'thien-lo-survival-remaining-scenes-v1':'thien-lo-survival-scene-revisions-v1';
const plan=JSON.parse(readFileSync(`content/drafts/${file}.json`,'utf8'));
const expected=integrationMaps?integrationMapIds:summaryMaps?summaryMapIds:precisionMaps?precisionMapIds:hsk2LastContext?Object.keys(hsk2LastContextVisuals):hsk2ReferenceTravel?Object.keys(hsk2ReferenceTravelVisuals):hsk2Grammar?Object.keys(hsk2GrammarVisuals):hsk2Environment?Object.keys(hsk2EnvironmentVisuals):hsk2Study?Object.keys(hsk2StudyVisuals):hsk2Life?Object.keys(hsk2LifeVisuals):hsk2Daily?Object.keys(hsk2DailyVisuals):boot?Object.keys(bootVisuals):journey?Object.keys(journeyVisuals):professional?Object.keys(professionalVisuals):remainingTime?Object.keys(remainingTimeVisuals):numbersWeek?Object.keys(numbersWeekVisuals):weatherVisual?weatherVisualIds:locationVisual?locationVisualIds:timePlaceVisuals?timePlaceVisualIds:survivalDialogue?Object.keys(survivalDialogueAssets):characterVisuals?characterVisualIds:dailyScenes?Object.keys(dailyVisualAssets):learningScenes?['daily-2','journey-1','professional-1']:remaining?['survival-2','survival-3','survival-4']:['survival-1','survival-5','survival-6','survival-7','survival-8','survival-9'];
const expectedPages=learningScenes?{'daily-2':'daily-2:v2:context','journey-1':'journey-1:v2:context','professional-1':'professional-1:v2:arrival'}:{};
const expectedAssets=learningScenes?{'daily-2':'breakfast-water-order-v1.webp','journey-1':'home-school-taxi-call-v1.webp','professional-1':'secondary-school-introduction-v1.webp'}:{};
if(plan.humanReviewed!==false||JSON.stringify(plan.items.map(i=>i.lessonId))!==JSON.stringify(expected))throw Error('Unexpected image revision scope');
const db=openDatabase(findLocalDemoDatabase(process.cwd()));
const apply=process.argv.includes('--apply');
try{
 requireDemoAccounts(db);
 if(apply)await backupLocalDatabase(db,process.cwd(),learningScenes?'before-hsk1-learning-scenes':'before-lesson-scene-revisions');
 db.exec('BEGIN IMMEDIATE');
 if(db.prepare("SELECT count(*) n FROM content_release_outbox_events WHERE status IN ('pending','processing')").get().n)throw Error('Unrelated release jobs must remain untouched');
 const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'content_%' AND name NOT LIKE 'sqlite_%' AND name NOT GLOB '_*'").all().map(r=>r.name).filter(n=>/^[a-z_]+$/.test(n)&&n!=='audit_events');
 const before=tables.map(t=>fingerprint(db,t));
 const api=d1Adapter(db),repo=new ContentStudioRepository(api);
 const author={actorUserId:'local-demo-user-2',actorSessionId:null},admin={actorUserId:'local-demo-user-3',actorSessionId:null};
 const heads=[];
 const otherHeads=db.prepare(`SELECT * FROM content_release_heads WHERE item_id NOT IN (${plan.items.map(()=>'?').join(',')}) ORDER BY item_id`).all(...plan.items.map(item=>{
  const row=db.prepare('SELECT item_id FROM content_revisions WHERE id=?').get(item.baseRevisionId);if(!row)throw Error('Missing base revision');return row.item_id;
 }));
 for(const item of plan.items){
  const source=await repo.getRevision(item.baseRevisionId);
  if(await studioSha256(canonicalStudioJson(source.content))!==item.baseContentSha256)throw Error(`Stale source ${item.lessonId}`);
  const head=db.prepare('SELECT revision_id FROM content_release_heads WHERE item_id=?').get(source.itemId);
  if(head?.revision_id!==source.id)throw Error(`Release head changed ${item.lessonId}`);
  const latest=await repo.getLatestRevision(source.itemId);
  if(latest.id!==source.id)throw Error(`Preserve newer editor draft ${item.lessonId}`);
  const parentPackage=await repo.releasedRuntimeRevision(source.id);
  if(!parentPackage)throw Error(`Missing immutable parent package ${item.lessonId}`);
  let allowed=structuredClone(source.content);
  if(integrationMaps){
   allowed=applyIntegrationSourceMaps(source.content);
  }else if(summaryMaps){
   allowed=applySummarySourceMaps(source.content);
  }else if(precisionMaps){
   allowed=applyPrecisionSourceMaps(source.content);
  }else if(hsk2LastContext){
   allowed=applyHsk2LastContextVisual(source.content);
  }else if(hsk2ReferenceTravel){
   allowed=applyHsk2ReferenceTravelVisual(source.content);
  }else if(hsk2Grammar){
   allowed=applyHsk2GrammarVisual(source.content);
  }else if(hsk2Environment){
   allowed=applyHsk2EnvironmentVisual(source.content);
  }else if(hsk2Study){
   allowed=applyHsk2StudyVisual(source.content);
  }else if(hsk2Life){
   allowed=applyHsk2LifeVisual(source.content);
  }else if(hsk2Daily){
   allowed=applyHsk2DailyVisual(source.content);
  }else if(boot){
   allowed=applyBootVisual(source.content);
  }else if(journey){
   allowed=applyJourneyVisual(source.content);
  }else if(professional){
   allowed=applyProfessionalVisual(source.content);
  }else if(remainingTime){
   allowed=applyRemainingTimeVisual(source.content);
  }else if(numbersWeek){
   allowed=applyNumbersWeekVisual(source.content);
  }else if(weatherVisual){
   allowed=applyWeatherVisualDecision(source.content);
  }else if(locationVisual){
   allowed=applyLocationDialogueVisual(source.content);
  }else if(timePlaceVisuals){
   allowed=applyTimePlaceVisualDecision(source.content);
  }else if(survivalDialogue){
   allowed=applySurvivalDialogueVisual(source.content);
  }else if(characterVisuals){
   allowed=applyCharacterVisualDecision(source.content);
  }else if(dailyScenes){
   const scene=LESSON_SCENES.find(s=>s.src.endsWith(`/${dailyVisualAssets[item.lessonId]}`));
   if(!scene||!existsSync(`public${scene.src}`))throw Error('Missing daily asset');
   allowed=applyDailyVisualDecision(source.content,scene);
  }else{
  if(item.changedPageIds.length!==1||item.changedPageIds[0]!==(expectedPages[item.lessonId]??`${item.lessonId}:v2:context`))throw Error('Unexpected changed page');
  const pageId=item.changedPageIds[0];
  const newIllustration=item.content.lessonPages.pages.find(p=>p.id===pageId)?.illustration;
  if(learningScenes){const expectedSrc=`/lessons/ngoc-dien/${expectedAssets[item.lessonId]}`;if(newIllustration?.src!==expectedSrc||!newIllustration.alt||!newIllustration.provenance.includes('humanReviewed:false')||!existsSync(`public${expectedSrc}`))throw Error(`Unexpected visual asset ${item.lessonId}`);}
  allowed.lessonPages.pages.find(p=>p.id===pageId).illustration=newIllustration;
  }
  if(canonicalStudioJson(allowed)!==canonicalStudioJson(item.content))throw Error('Image revision changes learning content');
  let revision=await repo.forkRevision({...author,sourceRevisionId:source.id,idempotencyKey:`scene-v1:${source.id}:fork`});
  const content={...item.content,visualReview:{humanReviewed:false,sourceRevisionId:source.id,scope:integrationMaps?'Post-attempt review maps for integration sources; original timed tasks retained.':summaryMaps?'Source-specific review maps after argument writing; original tasks retained.':precisionMaps?'Source-specific diagrams for post-writing review; existing pages and exercises preserved.':hsk2LastContext?'Ownership, comparison and reconstruction contextual art.':hsk2ReferenceTravel?'Directions, meeting, counted packets and phone sequence art.':hsk2Grammar?'Time, clause links and motion viewpoint contextual illustrations.':hsk2Environment?'People, delay, comparison, forecast and room context illustrations.':hsk2Study?'Study, school schedule, teacher preparation and cultural dialogue art.':hsk2Life?'Health, family, trip planning and sports appointment context illustrations.':hsk2Daily?'HSK2 daily needs context and dialogue illustrations; learning content preserved.':boot?'Greeting art and focused phonetic introductions.':journey?'Journey art/diagram and school dialogue image.':professional?'Professional 2-4 contextual images and captions.':remainingTime?'Calendar, clock and near/far location original art with captions.':numbersWeek?'Numbers and weekly schedule context/dialogue original art with captions.':weatherVisual?'Cold rainy home context and dialogue; learning content unchanged.':locationVisual?'Location dialogue art; learning content unchanged.':timePlaceVisuals?'Full-width instructional diagrams; learning content unchanged.':survivalDialogue?'Nine individually reviewed dialogue illustrations; no learning content change.':characterVisuals?'Focus introduction and glyph comparison; preserve all learning content.':dailyScenes?'Explicit context/dialogue art and full-width existing diagram; learning content unchanged.':'Single lesson scene illustration only; original generated art.',evidenceDocument:integrationMaps?'docs/thien-lo-redesign-review/90-REVIEW-HSK4-INTEGRATION-MAPS.md':summaryMaps?'docs/thien-lo-redesign-review/89-REVIEW-HSK4-SUMMARY-MAPS.md':precisionMaps?'docs/thien-lo-redesign-review/87-REVIEW-HSK4-PRECISION-MAPS.md':hsk2LastContext?'docs/thien-lo-redesign-review/84-REVIEW-HSK2-LAST-CONTEXT-ART.md':hsk2ReferenceTravel?'docs/thien-lo-redesign-review/83-REVIEW-HSK2-REFERENCE-TRAVEL-ART.md':hsk2Grammar?'docs/thien-lo-redesign-review/82-REVIEW-HSK2-GRAMMAR-ART.md':hsk2Environment?'docs/thien-lo-redesign-review/81-REVIEW-HSK2-ENVIRONMENT-ART.md':hsk2Study?'docs/thien-lo-redesign-review/79-REVIEW-HSK2-STUDY-ART.md':hsk2Life?'docs/thien-lo-redesign-review/78-REVIEW-HSK2-LIFE-ART.md':hsk2Daily?'docs/thien-lo-redesign-review/77-REVIEW-HSK2-DAILY-ART.md':boot?'docs/thien-lo-redesign-review/76-REVIEW-BOOT-VISUALS.md':journey?'docs/thien-lo-redesign-review/75-REVIEW-JOURNEY-ART.md':professional?'docs/thien-lo-redesign-review/74-REVIEW-PROFESSIONAL-ART.md':remainingTime?'docs/thien-lo-redesign-review/73-REVIEW-REMAINING-TIME-ART.md':numbersWeek?'docs/thien-lo-redesign-review/72-REVIEW-NUMBERS-WEEK-ART.md':weatherVisual?'docs/thien-lo-redesign-review/71-REVIEW-WEATHER-ART.md':locationVisual?'docs/thien-lo-redesign-review/70-REVIEW-LOCATION-ART.md':timePlaceVisuals?'docs/thien-lo-redesign-review/69-REVIEW-TIME-PLACE-DIAGRAMS.md':survivalDialogue?'docs/thien-lo-redesign-review/68-REVIEW-SURVIVAL-DIALOGUE-VISUALS.md':characterVisuals?'docs/thien-lo-redesign-review/67-REVIEW-CHARACTER-VISUALS.md':dailyScenes?'docs/thien-lo-redesign-review/66-REVIEW-DAILY-VISUALS.md':learningScenes?'docs/thien-lo-redesign-review/64-REVIEW-HSK1-SCENES.md':'docs/thien-lo-redesign-review/33-MINH-HOA-THEO-TRANG.md'}};
  revision=await repo.updateDraft({...author,revisionId:revision.id,expectedRowVersion:revision.rowVersion,title:revision.title,level:revision.level,content,idempotencyKey:`scene-v1:${source.id}:save`});
  revision=await repo.validateRevision({...author,revisionId:revision.id,expectedRowVersion:revision.rowVersion,idempotencyKey:`scene-v1:${source.id}:validate`});
  if(!revision.validation?.valid)throw Error(JSON.stringify(revision.validation));
  for(const toState of ['submitted','approved','published'])revision=await repo.transition({...(toState==='submitted'?author:admin),revisionId:revision.id,expectedRowVersion:revision.rowVersion,toState,idempotencyKey:`scene-v1:${source.id}:${toState}`,requestId:randomUUID(),note:'Local original illustration revision; humanReviewed:false; learner content unchanged.'});
  heads.push({itemId:source.itemId,revisionId:revision.id,lessonId:item.lessonId,parentRevisionId:source.id,parentPackage,lessonPages:allowed.lessonPages});
 }
 const worker=new ContentReleaseWorker(new ContentReleaseWorkerRepository(api),{policy:{batchSize:plan.items.length*2,maximumAttempts:5,initialRetryDelayMs:1000,maximumRetryDelayMs:300000}});
 const result=await worker.drain();if(result.retried||result.deadLettered)throw Error(JSON.stringify(result));
 const runtime=await repo.publishedRuntime({itemType:'lesson',learnerSafe:true});
 for(const h of heads){
  if(db.prepare('SELECT revision_id FROM content_release_heads WHERE item_id=?').get(h.itemId)?.revision_id!==h.revisionId)throw Error('Release head mismatch');
  if(canonicalStudioJson(await repo.releasedRuntimeRevision(h.parentRevisionId))!==canonicalStudioJson(h.parentPackage))throw Error(`Parent package changed ${h.lessonId}`);
  const pages=runtime.items.find(i=>i.content.targetLessonId===h.lessonId)?.content.lessonPages;
  if(canonicalStudioJson(pages)!==canonicalStudioJson(h.lessonPages))throw Error('Runtime pages mismatch');
 }
 if(canonicalStudioJson(otherHeads)!==canonicalStudioJson(db.prepare(`SELECT * FROM content_release_heads WHERE item_id NOT IN (${plan.items.map(()=>'?').join(',')}) ORDER BY item_id`).all(...heads.map(h=>h.itemId))))throw Error('Other heads changed');
 tables.forEach((t,i)=>{if(fingerprint(db,t)!==before[i])throw Error(`Protected data changed: ${t}`);});
 if(db.prepare('PRAGMA foreign_key_check').all().length)throw Error('Foreign key failure');
 db.exec(apply?'COMMIT':'ROLLBACK');
 console.log({mode:apply?'apply':'rehearse-rollback',lessons:heads.length,protectedTables:tables.length,completed:result.completed});
}catch(error){if(db.isTransaction)db.exec('ROLLBACK');throw error;}finally{db.close();}
