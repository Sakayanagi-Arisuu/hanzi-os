import {writeFileSync,existsSync} from 'node:fs';
import {canonicalStudioJson,studioSha256} from '../../src/content/studioContent.ts';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
import {summaryMapIds,applySummarySourceMaps} from './hsk4-precision-map-decisions.mjs';
const path='content/drafts/thien-lo-hsk4-summary-map-revisions-v1.json';
if(existsSync(path))throw Error('Preserve existing plan');
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
try{
 const repo=new ContentStudioRepository(d1Adapter(db));
 const runtime=await repo.publishedRuntime({itemType:'lesson',learnerSafe:true});
 const items=[];
 for(const lessonId of summaryMapIds){
  const head=runtime.items.find(i=>i.content.targetLessonId===lessonId);if(!head)throw Error('Missing lesson');
  const source=await repo.getRevision(head.revisionId);
  const content=applySummarySourceMaps(source.content);
  items.push({lessonId,baseRevisionId:source.id,baseContentSha256:await studioSha256(canonicalStudioJson(source.content)),changedPageIds:content.lessonPages.pages.slice(-2).map(p=>p.id),content});
 }
 writeFileSync(path,JSON.stringify({humanReviewed:false,items},null,2)+'\n');
 console.log({lessons:items.length,reviewMaps:36});
}finally{db.close();}
