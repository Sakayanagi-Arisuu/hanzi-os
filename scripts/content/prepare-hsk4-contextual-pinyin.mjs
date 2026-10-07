/** Read-only D1 audit; the saved plan binds exact Pinyin consumers and parent revisions. */
import {writeFileSync,existsSync} from 'node:fs';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
const rules=[
 ['huán kěyǐ','hái kěyǐ'],['huán méi','hái méi'],
 ['shíjiān yě gèng zhǎng','shíjiān yě gèng cháng'],['shíjiān gèng zhǎng','shíjiān gèng cháng'],
 ['děngdài biàn zhǎng','děngdài biàn cháng'],['jiā jǐ zì dài bēi zhě','jiā gěi zì dài bēi zhě'],
 ['Zūn chóng chuántǒng','Zūnzhòng chuántǒng'],['chǎngmiàn duì duìfāng','chǎng miànduì duìfāng'],
];
const path='content/drafts/hsk4-contextual-pinyin-corrections-v1.json';
if(existsSync(path))throw Error('Preserve reviewed plan; do not regenerate');
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
try{
 const runtime=await new ContentStudioRepository(d1Adapter(db)).publishedRuntime({itemType:'lesson',learnerSafe:true});
 const lessons=[];
 for(const item of runtime.items.filter(i=>i.content.targetLessonId?.startsWith('hsk4-'))){
  const changes=[];
  function walk(value,path=[]){
   if(!value||typeof value!=='object')return;
   for(const [key,child] of Object.entries(value)){
    if(typeof child==='string'&&/pinyin$/i.test(key)){
     let after=child;for(const [before,next] of rules)after=after.replaceAll(before,next);
     if(after!==child)changes.push({path:[...path,key].join('.'),before:child,after});
    }else if(typeof child==='object')walk(child,[...path,key]);
   }
  }
  walk(item.content);if(changes.length)lessons.push({lessonId:item.content.targetLessonId,sourceRevisionId:item.revisionId,changes});
 }
 if(lessons.length!==21||lessons.reduce((n,l)=>n+l.changes.length,0)!==59)throw Error('Reviewed inventory changed');
 writeFileSync(path,JSON.stringify({humanReviewed:false,rules,lessons},null,2)+'\n');
 console.log({lessons:lessons.length,consumers:lessons.reduce((n,l)=>n+l.changes.length,0)});
}finally{db.close();}
