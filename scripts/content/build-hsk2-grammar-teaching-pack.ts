import {writeFileSync} from 'node:fs';
import {LESSON_BY_ID,WORD_BY_ID} from '../../src/data/curriculum';
import {getRichLessonContent} from '../../src/learning/richLessonContent';
import {buildGrammarPages} from './build-grammar-pages';
import {grammarDecisions} from './hsk2-grammar-decisions';
import {grammarWordExamples} from './hsk2-grammar-word-examples';
const ids=['aspect-time-experience','clause-linking','complements-and-motion'].flatMap(group=>[1,2].map(n=>`hsk2-${group}-lesson-0${n}`));
const items=ids.map(lessonId=>{
 const lesson=LESSON_BY_ID.get(lessonId)!;
 const rich=getRichLessonContent(lessonId)!;
 return {lessonId,title:lesson.title,sourceGrammarIds:rich.grammar.map(g=>g.id),prerequisites:lesson.prerequisiteIds,
  teachingPages:buildGrammarPages(lessonId,grammarDecisions),
  vocabulary:lesson.wordIds.map(id=>{
   const word=WORD_BY_ID.get(id)!;
   const [hanzi,pinyin,meaningVi]=grammarWordExamples[id]??[word.example,word.examplePinyin,word.exampleMeaning];
   return {id,headword:word.simplified,headwordPinyin:word.pinyin,meaning:word.meaning,example:{hanzi,pinyin,meaningVi}};
  })};
});
writeFileSync('content/drafts/thien-lo-hsk2-grammar-teaching-pack-v2.json',JSON.stringify({schemaVersion:1,humanReviewed:false,status:'partial-authoring-not-publishable',scope:'Teaching/practice components only. Six lesson-specific contexts, synthesis and transfer must be completed before Studio release.',items},null,2)+'\n');
console.log({lessons:items.length,grammarRows:items.reduce((n,i)=>n+i.sourceGrammarIds.length,0),teachingPages:items.reduce((n,i)=>n+i.teachingPages.length,0),published:false});
