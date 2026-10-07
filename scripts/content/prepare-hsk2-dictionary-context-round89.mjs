import {WORD_BY_ID} from '../../src/data/curriculum.ts';
import {writeFileSync,existsSync} from 'node:fs';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
import {contextualizeHsk2Dictionary89,contexts89} from './hsk2-dictionary-context-round89.mjs';
const path='content/drafts/thien-lo-hsk2-dictionary-context-round89.json';
if(existsSync(path))throw Error('Keep pinned plan');
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
try{
 const repo=new ContentStudioRepository(d1Adapter(db)),entries=[];
 const runtime=await repo.publishedRuntime({itemType:'lesson',learnerSafe:true});
 for(const head of runtime.items){const result=contextualizeHsk2Dictionary89(head.content);if(!result.changes.length)continue;
  const source=await repo.getRevision(head.revisionId);
  if((await repo.getLatestRevision(source.itemId)).id!==source.id)throw Error('Preserve newer draft');
  const edited=contextualizeHsk2Dictionary89(source.content);
  entries.push({sourceRevisionId:source.id,sourceContentSha256:source.contentSha256,sourceWorkflowState:'published',...edited});
 }
 const lessonCount=entries.length;
 for(const key of Object.keys(contexts89)){
 const wordId='hsk-vocab-'+key,w=WORD_BY_ID.get(wordId);
 const row=db.prepare('SELECT r.id FROM content_revisions r JOIN content_items i ON i.id=r.item_id WHERE i.stable_key=? ORDER BY r.revision DESC LIMIT 1').get('curriculum-word-'+wordId);
 const source=await repo.getRevision(row.id);
 if(source.workflowState!=='draft'||source.rowVersion!==1||source.content.hanzi!==w.simplified||source.content.pinyin!==w.pinyin||source.content.meaningVi!==w.meaning||source.content.examples.length!==1||source.content.examples[0].hanzi!==w.example||source.content.examples[0].pinyin!==w.examplePinyin||source.content.examples[0].meaningVi!==w.exampleMeaning)throw Error('Preserve edited import: '+wordId);
 entries.push({sourceRevisionId:source.id,sourceContentSha256:source.contentSha256,sourceWorkflowState:source.workflowState,...contextualizeHsk2Dictionary89(source.content)});
 }
 console.log({lessons:lessonCount,words:Object.keys(contexts89).length,entries:entries.length});
 writeFileSync(path,JSON.stringify({humanReviewed:false,evidenceDocument:'docs/thien-lo-redesign-review/183-REVIEW-HSK2-DICTIONARY-CONTEXT-ROUND89.md',entries},null,2)+'\n');console.log({lessons:entries.length,fields:entries.reduce((n,e)=>n+e.changes.length,0)});
}finally{db.close();}






