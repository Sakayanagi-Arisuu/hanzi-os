import {expect,it} from 'vitest';
import draft from '../../content/drafts/thien-lo-hsk2-person-events-v2.json';
import {LESSON_BY_ID,WORD_BY_ID} from '../data/curriculum';
import {validateLessonPages,type LessonPageDocument} from '../learning/lessonPages';
import {validateLessonActivitySources} from '../learning/lessonActivitySources';
import {evaluateLessonActivity} from '../learning/lessonActivities';

it('keeps each source word and prerequisite with identical editable lesson pages',()=>{
 expect(draft.humanReviewed).toBe(false);
 expect(draft.items.map(i=>i.lessonId)).toEqual(['hsk2-person-events-environment-lesson-01','hsk2-person-events-environment-lesson-02']);
 for(const item of draft.items){
  const lesson=LESSON_BY_ID.get(item.lessonId)!;
  const doc=item.lessonPages as LessonPageDocument;
  expect(item.studioContent.lessonPages).toEqual(doc);
  expect(item.studioContent.prerequisites).toEqual(lesson.prerequisiteIds);
  expect(item.studioContent.sourceVocabularyIds).toEqual(lesson.wordIds);
  expect(validateLessonPages(doc)).toEqual([]);
  expect(validateLessonActivitySources(item.lessonId,doc)).toEqual([]);
  const blocks=doc.pages.flatMap(p=>p.blocks);
  for(const id of lesson.wordIds){
   const word=WORD_BY_ID.get(id)!;
   const example=blocks.find(b=>b.id.endsWith(`word-${id}`))!;
   expect(example.hanzi).toContain(word.simplified);
   expect(example.hanzi).not.toBe(word.simplified);
   expect(example.pinyin).toBeTruthy();expect(example.meaningVi).toBeTruthy();
  }
  expect(blocks.filter(b=>b.activity)).toHaveLength(3);
  expect(blocks.filter(b=>b.activity).every(b=>b.activity?.learningTarget)).toBe(true);
 }
});

it('rejects relative-to-superlative inference, swapped durations, and certainty from a guess',()=>{
 for(const [i,item] of draft.items.entries()){
  const blocks=(item.lessonPages as LessonPageDocument).pages.flatMap(p=>p.blocks);
  const choice=blocks.find(b=>b.id.endsWith(':choice'))!.activity!;
  for(let n=0;n<3;n++)expect(evaluateLessonActivity(choice,{text:'',answerIds:[`option-${n}`]})).toBe(n===i+1?'correct':'incorrect');
  const guided=blocks.find(b=>b.id.endsWith(':guided'))!.activity!;
  expect(evaluateLessonActivity(guided,{text:i===0?'比':'三十',answerIds:[]})).toBe('correct');
  expect(evaluateLessonActivity(guided,{text:i===0?'最':'十',answerIds:[]})).toBe('incorrect');
  const transfer=blocks.find(b=>b.id.endsWith(':produce'))!.activity!;
  expect(evaluateLessonActivity(transfer,{text:transfer.explanation,answerIds:[]})).toBe('self-review');
  if(i===1){expect(transfer.explanation).toContain('迟到了五分钟');expect(transfer.explanation).toContain('可能堵车了');}
 }
});
