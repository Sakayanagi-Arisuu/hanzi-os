import {writeFileSync,existsSync} from 'node:fs';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {WORD_BY_ID} from '../../src/data/curriculum.ts';
import {canonicalStudioJson,studioSha256} from '../../src/content/studioContent.ts';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
import {supplementVocabularyContext} from './hsk3-vocabulary-context-round1.mjs';
import {contextDecisions2,dictionaryCorrections} from './hsk3-vocabulary-context-round2.mjs';
const path='content/drafts/thien-lo-vocabulary-context-round2.json';
if(existsSync(path))throw Error('Keep existing pinned plan');
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
try{
 const repo=new ContentStudioRepository(d1Adapter(db));
 const runtime=await repo.publishedRuntime({itemType:'lesson',learnerSafe:true}); const entries=[];
 for(const d of contextDecisions2){
  const head=runtime.items.find(i=>i.content.targetLessonId===d.lessonId); const source=await repo.getRevision(head.revisionId);
  if((await repo.getLatestRevision(source.itemId)).id!==source.id)throw Error('Preserve editor draft');
  entries.push({sourceRevisionId:source.id,sourceContentSha256:await studioSha256(canonicalStudioJson(source.content)),sourceWorkflowState:source.workflowState,content:supplementVocabularyContext(source.content,d,'r2')});
 }
 for(const [id,example] of Object.entries(dictionaryCorrections)){
  const row=db.prepare('SELECT r.id FROM content_revisions r JOIN content_items i ON i.id=r.item_id WHERE i.stable_key=? ORDER BY r.revision DESC LIMIT 1').get(`curriculum-word-${id}`);
  const source=await repo.getRevision(row.id),word=WORD_BY_ID.get(id);
  const expected={hanzi:word.example,pinyin:word.examplePinyin,meaningVi:word.exampleMeaning};
  if(source.workflowState!=='draft'||source.rowVersion!==1||canonicalStudioJson(source.content.examples)!==canonicalStudioJson([expected])||source.content.provenance?.transformation!=='Source-preserving import; contextual recall prompts added; pending editorial review.')throw Error('Preserve changed imported word');
  const content={...structuredClone(source.content),examples:[example],review:{humanReviewed:false,aiSelfReview:{accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true}}};
  entries.push({sourceRevisionId:source.id,sourceContentSha256:source.contentSha256,sourceWorkflowState:'draft',content});
 }
 writeFileSync(path,JSON.stringify({humanReviewed:false,evidenceDocument:'docs/thien-lo-redesign-review/95-REVIEW-VOCABULARY-CONTEXT-ROUND2.md',entries},null,2)+'\n'); console.log({path,lessons:3,words:10});
}finally{db.close();}
