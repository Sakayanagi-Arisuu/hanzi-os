import {writeFileSync} from 'node:fs';
import {canonicalStudioJson,studioSha256} from '../../src/content/studioContent.ts';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
import {survivalDialogueAssets,applySurvivalDialogueVisual} from './survival-dialogue-visuals.mjs';
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
try{
 const repo=new ContentStudioRepository(d1Adapter(db));
 const runtime=await repo.publishedRuntime({itemType:'lesson',learnerSafe:true});
 const items=[];
 for(const lessonId of Object.keys(survivalDialogueAssets)){
  const head=runtime.items.find(i=>i.content.targetLessonId===lessonId);
  if(!head)throw Error(`Missing ${lessonId}`);
  const source=await repo.getRevision(head.revisionId);
  items.push({lessonId,baseRevisionId:source.id,baseContentSha256:await studioSha256(canonicalStudioJson(source.content)),changedPageIds:[`${lessonId}:v2:dialogue`],content:applySurvivalDialogueVisual(source.content)});
 }
 writeFileSync('content/drafts/thien-lo-survival-dialogue-visuals-v1.json',JSON.stringify({humanReviewed:false,items},null,2)+'\n');
 console.log({lessons:items.length,pages:items.length});
}finally{db.close();}
