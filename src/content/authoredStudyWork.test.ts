import {expect,it} from 'vitest';
import draft from '../../content/drafts/thien-lo-hsk2-study-work-v2.json';
import {LESSON_BY_ID,WORD_BY_ID} from '../data/curriculum';
import {validateLessonPages,type LessonPageDocument} from '../learning/lessonPages';
import {validateLessonActivitySources} from '../learning/lessonActivitySources';
import {evaluateLessonActivity} from '../learning/lessonActivities';
it('keeps the five-lesson unit editable with original identities and complete examples',()=>{
 expect(draft.humanReviewed).toBe(false);
 expect(draft.items.map(i=>i.lessonId)).toEqual([1,2,3,4,5].map(n=>`hsk2-study-work-culture-lesson-0${n}`));
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
   if(word.simplified==='班')expect(block.hanzi).not.toContain('上班');
   if(word.simplified==='错')expect(block.hanzi).toContain('做错');
   if(word.simplified==='名')expect(block.hanzi).toContain('名老师');
  }
  expect(blocks.filter(b=>b.activity)).toHaveLength(3);
  expect(blocks.filter(b=>b.activity).map(b=>b.activity?.learningTarget?.skill)).toEqual(['reading','grammar','writing']);
 }
});
it('separates understanding, schedule, ongoing work, personal experience and surname conventions',()=>{
 for(const [i,item] of draft.items.entries()){
  const blocks=(item.lessonPages as LessonPageDocument).pages.flatMap(p=>p.blocks);
  const choice=blocks.find(b=>b.id.endsWith(':choice'))!.activity!;
  for(let n=0;n<3;n++)expect(evaluateLessonActivity(choice,{text:'',answerIds:[`option-${n}`]})).toBe(n===[1,0,2,0,1][i]?'correct':'incorrect');
  const guided=blocks.find(b=>b.id.endsWith(':guided'))!.activity!;
  expect(evaluateLessonActivity(guided,{text:['没','十五','万','没','姓'][i],answerIds:[]})).toBe('correct');
  expect(evaluateLessonActivity(guided,{text:['不','十','千','不','贵姓'][i],answerIds:[]})).toBe('incorrect');
  const transfer=blocks.find(b=>b.id.endsWith(':produce'))!.activity!;
  expect(evaluateLessonActivity(transfer,{text:transfer.explanation,answerIds:[]})).toBe('self-review');
  expect(transfer.explanation).toContain(['第三题没看懂','下周二','两千名学生','每家的习惯不一定一样','李医生'][i]);
 }
});
