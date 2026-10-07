import {expect,it} from 'vitest';
import draft from '../../content/drafts/thien-lo-hsk2-travel-leisure-v2.json';
import {LESSON_BY_ID,WORD_BY_ID} from '../data/curriculum';
import {validateLessonPages,type LessonPageDocument} from '../learning/lessonPages';
import {validateLessonActivitySources} from '../learning/lessonActivitySources';
import {evaluateLessonActivity} from '../learning/lessonActivities';

it('preserves source inventories and delivers the same editable pages to study and Studio',()=>{
 expect(draft.items.map(item=>item.lessonId)).toEqual(['hsk2-travel-leisure-lesson-03','hsk2-travel-leisure-lesson-04']);
 expect(draft.humanReviewed).toBe(false);
 for(const item of draft.items){
  const lesson=LESSON_BY_ID.get(item.lessonId)!;
  const doc=item.lessonPages as LessonPageDocument;
  expect(item.studioContent.lessonPages).toEqual(doc);
  expect(item.studioContent.sourceVocabularyIds).toEqual(lesson.wordIds);
  expect(item.studioContent.prerequisites).toEqual(lesson.prerequisiteIds);
  expect(validateLessonPages(doc)).toEqual([]);
  expect(validateLessonActivitySources(item.lessonId,doc)).toEqual([]);
  const blocks=doc.pages.flatMap(p=>p.blocks);
  for(const id of lesson.wordIds){
   const word=WORD_BY_ID.get(id)!;
   const example=blocks.find(b=>b.id.endsWith(`word-${id}`))!;
   expect(example.hanzi).toContain(word.simplified);
   expect(example.hanzi).not.toBe(word.simplified);
   expect(example.pinyin).toBeTruthy();
   expect(example.meaningVi).toBeTruthy();
  }
  expect(blocks.filter(b=>b.activity)).toHaveLength(3);
  expect(blocks.filter(b=>b.activity).every(b=>b.activity?.learningTarget)).toBe(true);
 }
});

it('rejects confusing a purchased ticket with arrival and a preference with the final plan',()=>{
 for(const [i,item] of draft.items.entries()){
  const blocks=(item.lessonPages as LessonPageDocument).pages.flatMap(p=>p.blocks);
  const choice=blocks.find(b=>b.id.endsWith(':choice'))!.activity!;
  for(let n=0;n<3;n++)expect(evaluateLessonActivity(choice,{text:'',answerIds:[`option-${n}`]})).toBe(n===[1,0][i]?'correct':'incorrect');
  const guided=blocks.find(b=>b.id.endsWith(':guided'))!.activity!;
  expect(evaluateLessonActivity(guided,{text:i===0?'没':'打',answerIds:[]})).toBe('correct');
  expect(evaluateLessonActivity(guided,{text:i===0?'不':'踢',answerIds:[]})).toBe('incorrect');
  const transfer=blocks.find(b=>b.id.endsWith(':produce'))!.activity!;
  expect(evaluateLessonActivity(transfer,{text:transfer.explanation,answerIds:[]})).toBe('self-review');
 }
});

it('teaches the intended senses of guo, zhe and you rather than unrelated homographs',()=>{
 const blocks=draft.items.flatMap(item=>(item.lessonPages as LessonPageDocument).pages.flatMap(p=>p.blocks));
 const example=(hanzi:string)=>{
  const id=draft.items.flatMap(item=>item.studioContent.sourceVocabularyIds)
   .find(id=>WORD_BY_ID.get(id)?.simplified===hanzi)!;
  return blocks.find(b=>b.id.endsWith(`word-${id}`))!;
 };
 expect(example('过').hanzi).toBe('我没去过北京。');
 expect(example('着').hanzi).toContain('拿着球');
 expect(example('着').pinyin).toContain('názhe');
 expect(example('游').hanzi).toBe('他在水里游。');
});
