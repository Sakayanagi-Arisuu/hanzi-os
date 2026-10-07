/** Read-only inventory of contextual pronunciation issues in current release heads. */
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
const needles=['huán kěyǐ','huán méi','gèng zhǎng','biàn zhǎng','jiā jǐ zì','Zūn chóng','chǎngmiàn duì'];
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
try{
 const runtime=await new ContentStudioRepository(d1Adapter(db)).publishedRuntime({itemType:'lesson',learnerSafe:true});
 for(const item of runtime.items.filter(i=>i.content.targetLessonId?.startsWith('hsk4-'))){
  const hits=[];
  function walk(value,path=''){
   if(!value||typeof value!=='object')return;
   for(const [key,child] of Object.entries(value)){
    if(typeof child==='string'&&/pinyin$/i.test(key)&&needles.some(n=>child.includes(n)))hits.push({path:path+'.'+key,pinyin:child,hanzi:value.hanzi??value.answer??value.modelAnswer??null});
    else if(typeof child==='object')walk(child,path+'.'+key);
   }
  }
  walk(item.content);if(hits.length)console.log(JSON.stringify({lesson:item.content.targetLessonId,hits}));
 }
}finally{db.close();}
