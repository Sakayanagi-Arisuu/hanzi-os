import {WORD_BY_ID} from '../../src/data/curriculum.ts';
import {writeFileSync,existsSync} from 'node:fs';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
import {contextualizeHsk3Dictionary95,contexts95} from './hsk3-dictionary-context-round95.mjs';
const path='content/drafts/thien-lo-hsk3-dictionary-context-round95.json';
if(existsSync(path))throw Error('Keep pinned plan');
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
try{
 const repo=new ContentStudioRepository(d1Adapter(db)),entries=[];
 const runtime=await repo.publishedRuntime({itemType:'lesson',learnerSafe:true});
 for(const head of runtime.items){const result=contextualizeHsk3Dictionary95(head.content);if(!result.changes.length)continue;
  const source=await repo.getRevision(head.revisionId);
  if((await repo.getLatestRevision(source.itemId)).id!==source.id)throw Error('Preserve newer draft');
  entries.push({sourceRevisionId:source.id,sourceContentSha256:source.contentSha256,sourceWorkflowState:'published',...contextualizeHsk3Dictionary95(source.content)});
 }
 const lessonCount=entries.length;
 for(const wordId of Object.keys(contexts95)){
  const w=WORD_BY_ID.get(wordId),row=db.prepare('SELECT r.id FROM content_revisions r JOIN content_items i ON i.id=r.item_id WHERE i.stable_key=? ORDER BY r.revision DESC LIMIT 1').get('curriculum-word-'+wordId),source=await repo.getRevision(row.id);
  if(source.workflowState==='published'){
   if(db.prepare('SELECT revision_id FROM content_release_heads WHERE item_id=?').get(source.itemId)?.revision_id!==source.id)throw Error('Stale published source');
  }else if(source.workflowState!=='draft'||source.rowVersion!==1||source.content.hanzi!==w.simplified||source.content.pinyin!==w.pinyin||source.content.meaningVi!==w.meaning||source.content.examples.length!==1||source.content.examples[0].hanzi!==w.example||source.content.examples[0].pinyin!==w.examplePinyin||source.content.examples[0].meaningVi!==w.exampleMeaning)throw Error('Preserve edited import: '+wordId);
  entries.push({sourceRevisionId:source.id,sourceContentSha256:source.contentSha256,sourceWorkflowState:source.workflowState,...contextualizeHsk3Dictionary95(source.content)});
 }
 writeFileSync(path,JSON.stringify({humanReviewed:false,evidenceDocument:'docs/thien-lo-redesign-review/189-REVIEW-HSK3-DICTIONARY-CONTEXT-ROUND92.md',entries},null,2)+'\n');console.log({lessons:lessonCount,words:Object.keys(contexts95).length,entries:entries.length});
}finally{db.close();}
