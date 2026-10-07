import {writeFileSync} from 'node:fs';
import {canonicalStudioJson,studioSha256} from '../../src/content/studioContent.ts';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
import {bootVisuals,applyBootVisual} from './boot-visual-decisions.mjs';
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
try{
 const repo=new ContentStudioRepository(d1Adapter(db));
 const runtime=await repo.publishedRuntime({itemType:'lesson',learnerSafe:true});
 const items=[];
 for(const lessonId of Object.keys(bootVisuals)){
  const head=runtime.items.find(i=>i.content.targetLessonId===lessonId);
  if(!head)throw Error(`Missing ${lessonId}`);
  const source=await repo.getRevision(head.revisionId);
  items.push({lessonId,baseRevisionId:source.id,baseContentSha256:await studioSha256(canonicalStudioJson(source.content)),changedPageIds:bootVisuals[lessonId].pages.map(suffix=>`${lessonId}:v2:${suffix}`),content:applyBootVisual(source.content)});
 }
 writeFileSync('content/drafts/thien-lo-boot-visual-revisions-v1.json',JSON.stringify({humanReviewed:false,items},null,2)+'\n');
 console.log({lessons:items.length,changedPages:items.reduce((n,i)=>n+i.changedPageIds.length,0)});
}finally{db.close();}
