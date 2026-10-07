import {writeFileSync,existsSync} from 'node:fs';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
import {deepenConnectors14} from './hsk4-connectors-depth-round14.mjs';
const path='content/drafts/thien-lo-hsk4-connectors-round14.json';
if(existsSync(path))throw Error('Keep pinned plan');
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
try{
 const repo=new ContentStudioRepository(d1Adapter(db));
 const runtime=await repo.publishedRuntime({itemType:'lesson',learnerSafe:true});
 const head=runtime.items.find(i=>i.content.targetLessonId==='hsk4-information-order-cohesion-lesson-01');
 const source=await repo.getRevision(head.revisionId);
 if((await repo.getLatestRevision(source.itemId)).id!==source.id)throw Error('Preserve newer draft');
 const entry={sourceRevisionId:source.id,sourceContentSha256:source.contentSha256,sourceWorkflowState:'published',...deepenConnectors14(source.content)};
 writeFileSync(path,JSON.stringify({humanReviewed:false,evidenceDocument:'docs/thien-lo-redesign-review/107-REVIEW-HSK4-CONNECTORS-ROUND14.md',entries:[entry]},null,2)+'\n');
 console.log({path,oldPages:source.content.lessonPages.pages.length,newPages:entry.content.lessonPages.pages.length});
}finally{db.close();}
