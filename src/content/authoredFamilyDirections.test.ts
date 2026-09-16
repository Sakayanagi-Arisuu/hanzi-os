import {expect,it} from 'vitest';
import draft from '../../content/drafts/thien-lo-hsk2-family-directions-v2.json';
import {LESSON_BY_ID,WORD_BY_ID} from '../data/curriculum';
import {validateLessonPages,type LessonPageDocument} from '../learning/lessonPages';
import {validateLessonActivitySources} from '../learning/lessonActivitySources';
import {evaluateLessonActivity} from '../learning/lessonActivities';
it('preserves source inventories and editable diagrams without mistaking 有时间 for 有时',()=>{
 for(const item of draft.items){
  const lesson=LESSON_BY_ID.get(item.lessonId)!;
  const doc=item.lessonPages as LessonPageDocument;
  expect(item.studioContent.lessonPages).toEqual(doc);
  expect(item.studioContent.prerequisites).toEqual(lesson.prerequisiteIds);
  expect(item.studioContent.sourceVocabularyIds).toEqual(lesson.wordIds);
  expect(validateLessonPages(doc)).toEqual([]);
  expect(validateLessonActivitySources(item.lessonId,doc)).toEqual([]);
  const blocks=doc.pages.flatMap(p=>p.blocks);
  for(const id of lesson.wordIds){const word=WORD_BY_ID.get(id)!;const example=blocks.find(b=>b.id.endsWith(`word-${id}`))!;expect(example.hanzi).toContain(word.simplified);expect(example.hanzi).not.toBe(word.simplified);if(word.simplified==='有时')expect(example.hanzi).not.toContain('有时间');}
  expect(blocks.filter(b=>b.activity).every(b=>!!b.activity?.learningTarget)).toBe(true);
 }
});
it('rejects wrong frequency, intersection and direction while keeping transfer as self-review',()=>{
 for(const [i,item] of draft.items.entries()){
  const blocks=(item.lessonPages as LessonPageDocument).pages.flatMap(p=>p.blocks);
  const choice=blocks.find(b=>b.id.endsWith(':choice'))!.activity!;
  for(let option=0;option<3;option++)expect(evaluateLessonActivity(choice,{text:'',answerIds:[`option-${option}`]})).toBe(option===(i===0?2:0)?'correct':'incorrect');
  const guided=blocks.find(b=>b.id.endsWith(':guided'))!.activity!;
  expect(evaluateLessonActivity(guided,{text:i===0?'有时':'左',answerIds:[]})).toBe('correct');
  expect(evaluateLessonActivity(guided,{text:i===0?'有时间':'右',answerIds:[]})).toBe('incorrect');
  const transfer=blocks.find(b=>b.id.endsWith(':produce'))!.activity!;
  expect(evaluateLessonActivity(transfer,{text:'我自己做。',answerIds:[]})).toBe('self-review');
 }
});
