/** Editorial triage: ID links and literal occurrences are not pedagogical coverage. */
import {readFileSync,writeFileSync} from 'node:fs';
import {RELEASED_LESSONS,WORD_BY_ID} from '../../src/data/curriculum.ts';
import {ContentStudioRepository} from '../../src/server/contentStudioRepository.ts';
import {findLocalDemoDatabase,openDatabase,d1Adapter} from '../demo/local-demo-database.mjs';
const inventory=JSON.parse(readFileSync('content/sources/hsk-syllabus-2026/inventory.json','utf8'));
const db=openDatabase(findLocalDemoDatabase(process.cwd()),true);
try{
 const runtime=await new ContentStudioRepository(d1Adapter(db)).publishedRuntime({itemType:'lesson',learnerSafe:true});
 const pages=new Map(runtime.items.map(item=>[item.content.targetLessonId,item.content.lessonPages]));
 const pageText=runtime.items.map(item=>({lessonId:item.content.targetLessonId,text:JSON.stringify(item.content.lessonPages??{})}));
 const rows=inventory.vocabulary.map(word=>{
  const lessons=RELEASED_LESSONS.filter(lesson=>lesson.wordIds.includes(word.id));
  const occurrences=lessons.flatMap(lesson=>(pages.get(lesson.id)?.pages??[]).flatMap(page=>page.blocks.filter(block=>JSON.stringify(block).includes(word.word)).map(block=>({lessonId:lesson.id,pageId:page.id,blockId:block.id,kind:block.kind}))));
  const vocabulary=WORD_BY_ID.get(word.id);
  const elsewhere=occurrences.length?[]:pageText.filter(item=>item.text.includes(word.word)).map(item=>item.lessonId);
  return {id:word.id,word:word.word,level:word.level,assignedLessonIds:lessons.map(lesson=>lesson.id),occurrences,otherLessonOccurrences:elsewhere,
   dictionaryExample:vocabulary?{hanzi:vocabulary.example,pinyin:vocabulary.examplePinyin,meaningVi:vocabulary.exampleMeaning}:null};
 });
 const summary=[1,2,3,4].map(level=>{const words=rows.filter(row=>row.level===level);return {level,words:words.length,unassigned:words.filter(row=>!row.assignedLessonIds.length).length,withoutLiteralOccurrenceInAssignedPages:words.filter(row=>!row.occurrences.length).length};});
 writeFileSync('docs/thien-lo-redesign-review/vocabulary-context-triage.json',JSON.stringify({scope:'Literal occurrence triage, not word-sense coverage or review completion. Substrings can overcount; spelling alternatives can undercount.',summary,rows},null,2)+'\n');
 console.log(summary);
 console.log(rows.filter(row=>!row.occurrences.length).slice(0,5).map(({id,word,level,otherLessonOccurrences,dictionaryExample})=>({id,word,level,otherLessonOccurrences,dictionaryExample})));
}finally{db.close();}
