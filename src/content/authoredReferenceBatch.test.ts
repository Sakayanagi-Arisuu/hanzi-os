import {expect,it} from 'vitest';
import draft from '../../content/drafts/thien-lo-hsk2-reference-v2.json';
import {LESSON_BY_ID,WORD_BY_ID} from '../data/curriculum';
import {getRichLessonContent} from '../learning/richLessonContent';
import {validateLessonPages,type LessonPageDocument} from '../learning/lessonPages';
import {validateLessonActivitySources} from '../learning/lessonActivitySources';
import {evaluateLessonActivity} from '../learning/lessonActivities';
it('preserves all seven lessons and teaches reconstruction before asking for ordered answers',()=>{
 expect(draft.items).toHaveLength(7);expect(draft.humanReviewed).toBe(false);
 for(const item of draft.items){
  const lesson=LESSON_BY_ID.get(item.lessonId)!;const rich=getRichLessonContent(item.lessonId)!;
  const doc=item.lessonPages as LessonPageDocument;
  expect(item.studioContent.lessonPages).toEqual(doc);
  expect(item.studioContent.prerequisites).toEqual(lesson.prerequisiteIds);
  expect(item.studioContent.vocabulary).toEqual(lesson.wordIds);
  expect(item.studioContent.sourceGrammarIds).toEqual(rich.grammar.map(g=>g.id));
  expect(validateLessonPages(doc)).toEqual([]);expect(validateLessonActivitySources(item.lessonId,doc)).toEqual([]);
  const blocks=doc.pages.flatMap(p=>p.blocks),activities=blocks.flatMap(b=>b.activity?[b.activity]:[]);
  expect(activities.every(a=>a.learningTarget)).toBe(true);
  if(item.lessonId.includes('sentence-reconstruction')){
   expect(activities.filter(a=>a.type==='order')).toHaveLength(3);
   expect(doc.pages.findIndex(p=>p.id.endsWith(':meaning'))).toBeLessThan(doc.pages.findIndex(p=>p.id.endsWith(':reconstruct-0')));
  }else{
   for(const g of rich.grammar)expect(activities.filter(a=>a.learningTarget?.sources.some(s=>s.id===g.id))).toHaveLength(1);
  }
  for(const id of lesson.wordIds){const word=WORD_BY_ID.get(id)!;const example=blocks.find(b=>b.id.endsWith(`word-${id}`))!;expect(example.hanzi).toContain(word.simplified);expect(example.hanzi.length).toBeGreaterThan(word.simplified.length+1);}
 }
});
it('checks information boundaries and transfer instead of treating all fluent sentences as correct',()=>{
 for(const [i,item] of draft.items.entries()){
  const blocks=(item.lessonPages as LessonPageDocument).pages.flatMap(p=>p.blocks);
  const choice=blocks.find(b=>b.id.endsWith(':choice'))!.activity!;
  for(let n=0;n<3;n++)expect(evaluateLessonActivity(choice,{text:'',answerIds:[`option-${n}`]})).toBe(n===[0,1,2,0,1,2,0][i]?'correct':'incorrect');
  const produce=blocks.find(b=>b.id.endsWith(':produce'))!.activity!;
  expect(produce.explanation).toContain(['一共四包','上海三次','上周买的','高八厘米','下课以后我去商店','还没买火车票','篮球比足球'][i]);
  expect(evaluateLessonActivity(produce,{text:produce.explanation})).toBe('self-review');
 }
});
