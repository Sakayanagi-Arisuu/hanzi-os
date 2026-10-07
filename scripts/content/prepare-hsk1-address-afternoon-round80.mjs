import {writeFileSync,existsSync} from 'node:fs';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
import {deepenAddressAfternoon80} from './hsk1-address-afternoon-round80.mjs';
const path='content/drafts/thien-lo-hsk1-address-afternoon-round80.json';
if(existsSync(path))throw Error('Keep pinned plan');
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
try{
 const repo=new ContentStudioRepository(d1Adapter(db)),entries=[];
 const runtime=await repo.publishedRuntime({itemType:'lesson',learnerSafe:true});
 const head=runtime.items.find(h=>h.content.targetLessonId==='survival-5');
 const row=db.prepare('SELECT r.id FROM content_revisions r JOIN content_items i ON i.id=r.item_id WHERE i.stable_key=? ORDER BY r.revision DESC LIMIT 1').get('curriculum-word-hsk-vocab-00230');
 for(const revisionId of [head.revisionId,row.id]){
  const source=await repo.getRevision(revisionId);
  if((await repo.getLatestRevision(source.itemId)).id!==source.id)throw Error('Preserve newer draft');
  if(source.itemType==='vocabulary'&&(source.workflowState!=='draft'||source.rowVersion!==1||source.contentSha256!=='sha256:f8213d246b0090b9a08e48aa48451a955caf2240f6609d9fd60a4b2283ac8193'))throw Error('Preserve edited imported vocabulary');
  const edited=deepenAddressAfternoon80(source.content);if(!edited.changes.length)throw Error('Missing change');
  entries.push({sourceRevisionId:source.id,sourceContentSha256:source.contentSha256,sourceWorkflowState:source.workflowState,...edited});
 }
 writeFileSync(path,JSON.stringify({humanReviewed:false,evidenceDocument:'docs/thien-lo-redesign-review/173-REVIEW-HSK1-ADDRESS-AFTERNOON-ROUND80.md',entries},null,2)+'\n');console.log({entries:entries.length});
}finally{db.close();}
