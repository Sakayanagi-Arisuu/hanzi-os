import {expect,it} from 'vitest';
import draft from '../../content/drafts/thien-lo-hsk2-food-shopping-v2.json';
import {LESSON_BY_ID,WORD_BY_ID} from '../data/curriculum';
import {validateLessonPages,type LessonPageDocument} from '../learning/lessonPages';
import {validateLessonActivitySources} from '../learning/lessonActivitySources';
import {evaluateLessonActivity} from '../learning/lessonActivities';
it('preserves both HSK2 source inventories and provides contextual examples and activity targets',()=>{
 expect(draft.items).toHaveLength(2);
 for(const item of draft.items){
  const lesson=LESSON_BY_ID.get(item.lessonId)!;
  expect(item.level).toBe('hsk2');
  expect(item.studioContent.prerequisites).toEqual(lesson.prerequisiteIds);
  expect(item.studioContent.sourceVocabularyIds).toEqual(lesson.wordIds);
  const doc=item.lessonPages as LessonPageDocument;
  expect(validateLessonPages(doc)).toEqual([]);
  expect(validateLessonActivitySources(item.lessonId,doc)).toEqual([]);
  const blocks=doc.pages.flatMap(p=>p.blocks);
  for(const id of lesson.wordIds){const b=blocks.find(b=>b.id.endsWith(`word-${id}`))!;expect(b.hanzi).not.toBe(WORD_BY_ID.get(id)!.simplified);expect(b.pinyin).toBeTruthy();expect(b.meaningVi).toBeTruthy();}
  expect(blocks.filter(b=>b.activity)).toHaveLength(3);
  expect(blocks.filter(b=>b.activity).every(b=>!!b.activity?.learningTarget)).toBe(true);
 }
});
it('tests decisions against all facts and keeps new-context writing as self-review',()=>{
 for(const [index,item] of draft.items.entries()){
  const blocks=(item.lessonPages as LessonPageDocument).pages.flatMap(p=>p.blocks);
  const choice=blocks.find(b=>b.id.endsWith(':choice'))!.activity!;
  expect(evaluateLessonActivity(choice,{text:'',answerIds:[`option-${index}`]})).toBe('correct');
  expect(evaluateLessonActivity(choice,{text:'',answerIds:[`option-${1-index}`]})).toBe('incorrect');
  const guided=blocks.find(b=>b.id.endsWith(':guided'))!.activity!;
  for(const text of index===0?['没','没有']:['条'])expect(evaluateLessonActivity(guided,{text,answerIds:[]})).toBe('correct');
  expect(evaluateLessonActivity(guided,{text:index===0?'不':'个',answerIds:[]})).toBe('incorrect');
  const transfer=blocks.find(b=>b.id.endsWith(':produce'))!.activity!;
  expect(evaluateLessonActivity(transfer,{text:transfer.explanation,answerIds:[]})).toBe('self-review');
 }
});
