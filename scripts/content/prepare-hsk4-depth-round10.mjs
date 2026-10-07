import {writeFileSync,existsSync} from 'node:fs';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
import {supplementVocabularyContext} from './hsk3-vocabulary-context-round1.mjs';
import {depthDecisions10} from './hsk4-vocabulary-depth-round10.mjs';
const path='content/drafts/thien-lo-hsk4-depth-round10.json';
if(existsSync(path))throw Error('Keep existing pinned plan');
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
try{
 const repo=new ContentStudioRepository(d1Adapter(db)); const entries=[];
 const runtime=await repo.publishedRuntime({itemType:'lesson',learnerSafe:true});
 for(const d of depthDecisions10){
  const head=runtime.items.find(i=>i.content.targetLessonId===d.lessonId),source=await repo.getRevision(head.revisionId);
  if((await repo.getLatestRevision(source.itemId)).id!==source.id)throw Error('Preserve editor draft');
  entries.push({sourceRevisionId:source.id,sourceContentSha256:source.contentSha256,sourceWorkflowState:'published',content:supplementVocabularyContext(source.content,d,'r10')});
 }
 writeFileSync(path,JSON.stringify({humanReviewed:false,evidenceDocument:'docs/thien-lo-redesign-review/103-REVIEW-HSK4-DEPTH-ROUND10.md',entries},null,2)+'\n'); console.log({path,lessons:entries.length});
}finally{db.close();}

