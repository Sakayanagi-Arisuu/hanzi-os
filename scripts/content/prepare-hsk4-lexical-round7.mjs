import {writeFileSync,existsSync} from 'node:fs';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {WORD_BY_ID} from '../../src/data/curriculum.ts';
import {canonicalStudioJson} from '../../src/content/studioContent.ts';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
import {lexicalCorrections7 as lexicalCorrections} from './hsk4-lexical-corrections-round7.mjs';
const path='content/drafts/thien-lo-hsk4-lexical-round7.json';
if(existsSync(path))throw Error('Keep existing pinned plan');
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
try{
 const repo=new ContentStudioRepository(d1Adapter(db)); const entries=[];
 for(const [id,correction] of Object.entries(lexicalCorrections)){
  const row=db.prepare('SELECT r.id FROM content_revisions r JOIN content_items i ON i.id=r.item_id WHERE i.stable_key=? ORDER BY r.revision DESC LIMIT 1').get(`curriculum-word-${id}`);
  if(!row)throw Error(`Imported word missing: ${id}`);
  const source=await repo.getRevision(row.id),word=WORD_BY_ID.get(id);
  const expected={hanzi:word.example,pinyin:word.examplePinyin,meaningVi:word.exampleMeaning};
  if(source.workflowState!=='draft'||source.rowVersion!==1||source.content.meaningVi!==word.meaning||canonicalStudioJson(source.content.examples)!==canonicalStudioJson([expected])||source.content.provenance?.transformation!=='Source-preserving import; contextual recall prompts added; pending editorial review.')throw Error(`Preserve changed imported word: ${id}`);
  const content={...structuredClone(source.content),...correction,review:{humanReviewed:false,aiSelfReview:{accuracy:true,levelFit:true,pedagogy:true,answerIntegrity:true,originality:true}}};
  entries.push({sourceRevisionId:source.id,sourceContentSha256:source.contentSha256,sourceWorkflowState:'draft',content});
 }
 writeFileSync(path,JSON.stringify({humanReviewed:false,evidenceDocument:'docs/thien-lo-redesign-review/100-REVIEW-HSK4-LEXICAL-ROUND7.md',entries},null,2)+'\n'); console.log({path,words:entries.length});
}finally{db.close();}

