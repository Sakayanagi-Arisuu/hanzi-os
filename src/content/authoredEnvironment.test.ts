import {expect,it} from 'vitest';
import draft from '../../content/drafts/thien-lo-hsk2-environment-v2.json';
import {LESSON_BY_ID,WORD_BY_ID} from '../data/curriculum';
import {validateLessonPages,type LessonPageDocument} from '../learning/lessonPages';
import {validateLessonActivitySources} from '../learning/lessonActivitySources';
import {evaluateLessonActivity} from '../learning/lessonActivities';
it('preserves sources and editor parity across the remaining environment unit',()=>{
 expect(draft.humanReviewed).toBe(false);
 expect(draft.items.map(i=>i.lessonId)).toEqual([3,4,5].map(n=>`hsk2-person-events-environment-lesson-0${n}`));
 for(const item of draft.items){
  const lesson=LESSON_BY_ID.get(item.lessonId)!;const doc=item.lessonPages as LessonPageDocument;
  expect(item.studioContent.lessonPages).toEqual(doc);
  expect(item.studioContent.prerequisites).toEqual(lesson.prerequisiteIds);
  expect(item.studioContent.sourceVocabularyIds).toEqual(lesson.wordIds);
  expect(validateLessonPages(doc)).toEqual([]);expect(validateLessonActivitySources(item.lessonId,doc)).toEqual([]);
  const blocks=doc.pages.flatMap(p=>p.blocks);
  for(const id of lesson.wordIds){const word=WORD_BY_ID.get(id)!;const block=blocks.find(b=>b.id.endsWith(`word-${id}`))!;
   expect(block.hanzi).toContain(word.simplified);expect(block.hanzi.length).toBeGreaterThan(word.simplified.length+1);
   expect(block.pinyin).toBeTruthy();expect(block.meaningVi).toBeTruthy();
  }
  expect(blocks.filter(b=>b.activity)).toHaveLength(3);
  expect(blocks.filter(b=>b.activity).every(b=>b.activity?.learningTarget)).toBe(true);
 }
});
it('checks two constraints, uncertain weather and location syntax without promoting self-review',()=>{
 for(const [i,item] of draft.items.entries()){
  const blocks=(item.lessonPages as LessonPageDocument).pages.flatMap(p=>p.blocks);
  const choice=blocks.find(b=>b.id.endsWith(':choice'))!.activity!;
  for(let n=0;n<3;n++)expect(evaluateLessonActivity(choice,{text:'',answerIds:[`option-${n}`]})).toBe(n===[1,2,0][i]?'correct':'incorrect');
  const guided=blocks.find(b=>b.id.endsWith(':guided'))!.activity!;
  expect(evaluateLessonActivity(guided,{text:['长','可能','有'][i],answerIds:[]})).toBe('correct');
  expect(evaluateLessonActivity(guided,{text:['短','一定','在'][i],answerIds:[]})).toBe('incorrect');
  const transfer=blocks.find(b=>b.id.endsWith(':produce'))!.activity!;
  expect(evaluateLessonActivity(transfer,{text:transfer.explanation,answerIds:[]})).toBe('self-review');
  expect(transfer.explanation).toContain(['白色的，九十元','下午三点','两张床'][i]);
 }
});
