import {writeFileSync} from 'node:fs';
import {LESSON_SCENES} from '../../src/learning/lessonPresentation.ts';
import {canonicalStudioJson,studioSha256} from '../../src/content/studioContent.ts';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
import {dailyVisualAssets,applyDailyVisualDecision} from './daily-visual-decisions.mjs';
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
try{
 const repo=new ContentStudioRepository(d1Adapter(db));
 const runtime=await repo.publishedRuntime({itemType:'lesson',learnerSafe:true});
 const items=[];
 for(const [lessonId,asset] of Object.entries(dailyVisualAssets)){
  const head=runtime.items.find(i=>i.content.targetLessonId===lessonId);
  if(!head)throw Error(`Missing ${lessonId}`);
  const source=await repo.getRevision(head.revisionId);
  const illustration=LESSON_SCENES.find(s=>s.src.endsWith(`/${asset}`));
  if(!illustration)throw Error(`Missing scene ${asset}`);
  const content=applyDailyVisualDecision(source.content,illustration);
  items.push({lessonId,baseRevisionId:source.id,baseContentSha256:await studioSha256(canonicalStudioJson(source.content)),changedPageIds:['context','dialogue','visual'].filter(suffix=>canonicalStudioJson(source.content.lessonPages.pages.find(p=>p.id===`${lessonId}:v2:${suffix}`))!==canonicalStudioJson(content.lessonPages.pages.find(p=>p.id===`${lessonId}:v2:${suffix}`))).map(suffix=>`${lessonId}:v2:${suffix}`),content});
 }
 writeFileSync('content/drafts/thien-lo-daily-visual-revisions-v1.json',JSON.stringify({humanReviewed:false,evidenceDocument:'docs/thien-lo-redesign-review/66-REVIEW-DAILY-VISUALS.md',items},null,2)+'\n');
 console.log({lessons:items.length,changedPages:items.reduce((n,i)=>n+i.changedPageIds.length,0)});
}finally{db.close();}
