import {writeFileSync,existsSync} from 'node:fs';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
import {correctPolysemy88,wordCorrections88} from './hsk2-polysemy-pinyin-round88.mjs';
const path='content/drafts/thien-lo-hsk2-polysemy-pinyin-round88.json';
if(existsSync(path))throw Error('Keep pinned plan');
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
try{
 const repo=new ContentStudioRepository(d1Adapter(db)),entries=[];
 const runtime=await repo.publishedRuntime({itemType:'lesson',learnerSafe:true});
 for(const head of runtime.items){const result=correctPolysemy88(head.content);if(!result.changes.length)continue;
  const source=await repo.getRevision(head.revisionId);
  if((await repo.getLatestRevision(source.itemId)).id!==source.id)throw Error('Preserve newer draft');
  const edited=correctPolysemy88(source.content);
  entries.push({sourceRevisionId:source.id,sourceContentSha256:source.contentSha256,sourceWorkflowState:'published',...edited});
 }
 for(const [word,c]of Object.entries(wordCorrections88)){
 const row=db.prepare('SELECT r.id FROM content_revisions r JOIN content_items i ON i.id=r.item_id WHERE i.stable_key=? ORDER BY r.revision DESC LIMIT 1').get('curriculum-word-'+word);
 const source=await repo.getRevision(row.id);
 if(source.workflowState!=='draft'||source.rowVersion!==1||source.contentSha256!==c.hash)throw Error('Preserve changed vocabulary import');
 entries.push({sourceRevisionId:source.id,sourceContentSha256:source.contentSha256,sourceWorkflowState:source.workflowState,...correctPolysemy88(source.content)});
 }
 if(entries.length!==9)throw Error('Unexpected scope: '+entries.length);
 writeFileSync(path,JSON.stringify({humanReviewed:false,evidenceDocument:'docs/thien-lo-redesign-review/182-REVIEW-HSK2-POLYSEMY-PINYIN-ROUND88.md',entries},null,2)+'\n');console.log({lessons:entries.length,fields:entries.reduce((n,e)=>n+e.changes.length,0)});
}finally{db.close();}






