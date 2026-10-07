import {writeFileSync} from 'node:fs';
import {LESSON_BY_ID,WORD_BY_ID} from '../../src/data/curriculum';
import {referenceWordExamples} from './hsk2-reference-word-examples';
import {buildGrammarPages} from './build-grammar-pages';
import {referenceDecisions} from './hsk2-reference-decisions';
import {buildReconstructionPages,reconstructionTasks} from './hsk2-reconstruction-activities';
const items=[
 ...[1,2,3,4].map(n=>{
  const lessonId=`hsk2-reference-description-comparison-lesson-0${n}`;
  return {lessonId,title:LESSON_BY_ID.get(lessonId)!.title,teachingPages:buildGrammarPages(lessonId,referenceDecisions)};
 }),
 ...Object.keys(reconstructionTasks).map(lessonId=>({lessonId,title:LESSON_BY_ID.get(lessonId)!.title,teachingPages:buildReconstructionPages(lessonId)})),
];
const reviewedItems=items.map(item=>({...item,vocabulary:LESSON_BY_ID.get(item.lessonId)!.wordIds.map(id=>{
 const word=WORD_BY_ID.get(id)!;
 const [hanzi,pinyin,meaningVi]=referenceWordExamples[id]??[word.example,word.examplePinyin,word.exampleMeaning];
 return {id,headword:word.simplified,headwordPinyin:word.pinyin,meaning:word.meaning,example:{hanzi,pinyin,meaningVi}};
})}));
writeFileSync('content/drafts/thien-lo-hsk2-reference-teaching-pack-v2.json',JSON.stringify({schemaVersion:1,humanReviewed:false,status:'partial-authoring-not-publishable',scope:'Editable teaching components for seven lessons; contexts, final vocabulary review and transfer remain required before release.',items:reviewedItems},null,2)+'\n');
console.log({lessons:items.length,pages:items.reduce((n,i)=>n+i.teachingPages.length,0),published:false});
