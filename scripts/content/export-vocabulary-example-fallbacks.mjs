/** Export reviewed local heads for consumers that use the bundled curriculum. */
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
import {lexicalCorrections} from './hsk4-lexical-corrections-round3.mjs';
const path='content/vocabulary-example-fallbacks.json';
const ids=['hsk-vocab-00480','hsk-vocab-00351','hsk-vocab-00490','hsk-vocab-00477',
 'hsk-vocab-00502','hsk-vocab-00503','hsk-vocab-00536','hsk-vocab-00620','hsk-vocab-00602',
 'hsk-vocab-00612','hsk-vocab-00613','hsk-vocab-00556','hsk-vocab-00928','hsk-vocab-00815',
 'hsk-vocab-00916','hsk-vocab-00796',...Object.keys(lexicalCorrections)];
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
try{
 const repo=new ContentStudioRepository(d1Adapter(db));
 const runtime=await repo.publishedRuntime({itemType:'vocabulary',learnerSafe:true});
 const result=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{humanReviewed:false,scope:'Published examples only; preserve bundled identities and immutable packages.',words:{}};
 for(const id of ids){
  const head=runtime.items.find(i=>i.stableKey===`curriculum-word-${id}`);
  if(!head||head.content.sourceVocabularyIds?.[0]!==id)throw Error('Missing published source');
  if(result.words[id]&&result.words[id].sourceRevisionId!==head.revisionId)throw Error(`Retain prior activity-version history before replacing fallback: ${id}`);
  const e=head.content.examples[0];
  result.words[id]={sourceRevisionId:head.revisionId,sourceContentSha256:head.contentSha256,hanzi:head.content.hanzi,pinyin:head.content.pinyin,example:e.hanzi,examplePinyin:e.pinyin,exampleMeaning:e.meaningVi,...(id in lexicalCorrections?{meaning:head.content.meaningVi}:{})};
 }
 writeFileSync(path,JSON.stringify(result,null,2)+'\n'); console.log({exported:ids,path});
}finally{db.close();}
