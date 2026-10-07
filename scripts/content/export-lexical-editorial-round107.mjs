import {mkdirSync,existsSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {CONTENT_VERSION,WORD_BY_ID} from '../../src/data/curriculum.ts';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';

// A read-only derivative of released Studio heads. Never export editor drafts,
// mutate the foundation package, or overwrite this immutable snapshot.
const directory='content/packages/lexical-editorial-2026.10.5';
if(existsSync(directory))throw Error('Keep immutable lexical snapshot; use a new version.');
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
try{
 const runtime=await new ContentStudioRepository(d1Adapter(db)).publishedRuntime({itemType:'vocabulary'});
 const words=[],seen=new Set();
 for(const item of runtime.items){
  const c=item.content,id=c.sourceVocabularyIds?.[0],base=WORD_BY_ID.get(id);
  if(!base)continue;
  if(seen.has(id))throw Error('Duplicate released vocabulary: '+id);seen.add(id);
  if(c.hanzi!==base.simplified||c.pinyin!==base.pinyin)throw Error('Lexical spelling/pronunciation needs separate review: '+id);
  const e=c.examples?.[0];
  if(!e||[c.meaningVi,e.hanzi,e.pinyin,e.meaningVi].some(x=>typeof x!=='string'||!x.trim()))throw Error('Incomplete released tuple: '+id);
  const patch={meaning:c.meaningVi,example:e.hanzi,examplePinyin:e.pinyin,exampleMeaning:e.meaningVi};
  if(Object.entries(patch).every(([key,value])=>base[key]===value))continue;
  const revision=await new ContentStudioRepository(d1Adapter(db)).getRevision(item.revisionId);
  words.push({id,sourceRevisionId:item.revisionId,sourceContentSha256:revision.contentSha256,...patch});
 }
 words.sort((a,b)=>a.id.localeCompare(b.id));
 const snapshot={schemaVersion:1,version:'lexical-editorial-2026.10.5',baseContentVersion:CONTENT_VERSION,humanReviewed:false,words};
 const bytes=JSON.stringify(snapshot,null,2)+'\n';
 mkdirSync(directory,{recursive:true});
 writeFileSync(directory+'/word-catalog.json',bytes);
 writeFileSync(directory+'/manifest.json',JSON.stringify({schemaVersion:1,version:snapshot.version,baseContentVersion:CONTENT_VERSION,humanReviewed:false,wordCount:words.length,wordCatalogSha256:'sha256:'+createHash('sha256').update(bytes).digest('hex'),source:'released Studio vocabulary heads; read-only export; existing packages retained'},null,2)+'\n');
 console.log({version:snapshot.version,words:words.length,releasedVocabularyHeads:runtime.items.length});
}finally{db.close();}
