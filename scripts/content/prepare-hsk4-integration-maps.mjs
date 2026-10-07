import {writeFileSync,existsSync} from 'node:fs';
import {canonicalStudioJson,studioSha256} from '../../src/content/studioContent.ts';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
import {integrationMapIds,applyIntegrationSourceMaps} from './hsk4-precision-map-decisions.mjs';
const path='content/drafts/thien-lo-hsk4-integration-map-revisions-v1.json';
if(existsSync(path))throw Error('Preserve existing plan');
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
try{
 const repo=new ContentStudioRepository(d1Adapter(db));
 const runtime=await repo.publishedRuntime({itemType:'lesson',learnerSafe:true});
 const items=[];
 for(const lessonId of integrationMapIds){
  const head=runtime.items.find(i=>i.content.targetLessonId===lessonId);if(!head)throw Error('Missing lesson');
  const source=await repo.getRevision(head.revisionId);
  const content=applyIntegrationSourceMaps(source.content);
  items.push({lessonId,baseRevisionId:source.id,baseContentSha256:await studioSha256(canonicalStudioJson(source.content)),changedPageIds:content.lessonPages.pages.filter(p=>p.id.includes(':source-map-review:')).map(p=>p.id),content});
 }
 writeFileSync(path,JSON.stringify({humanReviewed:false,items},null,2)+'\n');
 console.log({lessons:items.length,reviewMaps:60});
}finally{db.close();}
