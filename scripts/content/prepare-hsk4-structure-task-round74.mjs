import {writeFileSync,existsSync} from 'node:fs';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
import {correctStructureTasks74} from './hsk4-structure-task-depth-round74.mjs';
const path='content/drafts/thien-lo-hsk4-structure-task-round74.json';
if(existsSync(path))throw Error('Keep pinned plan');
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
try{
 const repo=new ContentStudioRepository(d1Adapter(db)),entries=[];
 const runtime=await repo.publishedRuntime({itemType:'lesson',learnerSafe:true});
 for(const head of runtime.items){const result=correctStructureTasks74(head.content);if(!result.changes.length)continue;
  const source=await repo.getRevision(head.revisionId);
  if((await repo.getLatestRevision(source.itemId)).id!==source.id)throw Error('Preserve newer draft');
  const edited=correctStructureTasks74(source.content);
  entries.push({sourceRevisionId:source.id,sourceContentSha256:source.contentSha256,sourceWorkflowState:'published',...edited});
 }
 if(entries.length!==3)throw Error('Unexpected scope');
 writeFileSync(path,JSON.stringify({humanReviewed:false,evidenceDocument:'docs/thien-lo-redesign-review/167-REVIEW-HSK4-STRUCTURE-TASK-ROUND74.md',entries},null,2)+'\n');console.log({lessons:entries.length,fields:entries.reduce((n,e)=>n+e.changes.length,0)});
}finally{db.close();}




