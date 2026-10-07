import {writeFileSync,existsSync} from 'node:fs';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {canonicalStudioJson,studioSha256} from '../../src/content/studioContent.ts';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
import {contextDecisions,supplementVocabularyContext} from './hsk3-vocabulary-context-round1.mjs';
const path='content/drafts/thien-lo-vocabulary-context-round1.json';
if(existsSync(path))throw Error('Keep existing pinned plan');
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
try{
 const repo=new ContentStudioRepository(d1Adapter(db));
 const runtime=await repo.publishedRuntime({itemType:'lesson',learnerSafe:true});
 const entries=[];
 for(const d of contextDecisions){
  const head=runtime.items.find(i=>i.content.targetLessonId===d.lessonId);
  const source=await repo.getRevision(head.revisionId);
  if((await repo.getLatestRevision(source.itemId)).id!==source.id)throw Error('Preserve editor draft');
  entries.push({sourceRevisionId:source.id,sourceContentSha256:await studioSha256(canonicalStudioJson(source.content)),sourceWorkflowState:source.workflowState,content:supplementVocabularyContext(source.content)});
 }
 for(const d of contextDecisions.slice(0,2)){
  const row=db.prepare('SELECT r.id FROM content_revisions r JOIN content_items i ON i.id=r.item_id WHERE i.stable_key=? ORDER BY r.revision DESC LIMIT 1').get(`curriculum-word-${d.wordId}`);
  const source=await repo.getRevision(row.id);
  const expected=d.word==='矮'?'sha256:70b3bcd9d3a4e2b777a947b216859f5d1b94c28a808dbecbebc91dba18205efd':'sha256:9da10613c67f54de0faa8cfd11ea45c721d9677291724a66c7025ac28f6f23e9';
  if(source.workflowState!=='draft'||source.rowVersion!==1||source.contentSha256!==expected)throw Error('Preserve changed imported word');
  const content={...structuredClone(source.content),examples:d.examples,review:{humanReviewed:false,aiSelfReview:{accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true}}};
  entries.push({sourceRevisionId:source.id,sourceContentSha256:expected,sourceWorkflowState:'draft',content});
 }
 writeFileSync(path,JSON.stringify({humanReviewed:false,evidenceDocument:'docs/thien-lo-redesign-review/94-REVIEW-VOCABULARY-CONTEXT-ROUND1.md',entries},null,2)+'\n');
 console.log({path,lessons:4,words:2});
}finally{db.close();}
