import {expect,it} from 'vitest';
import draft from '../../content/drafts/thien-lo-hsk2-grammar-v2.json';
import {LESSON_BY_ID,WORD_BY_ID} from '../data/curriculum';
import {getRichLessonContent} from '../learning/richLessonContent';
import {validateLessonPages,type LessonPageDocument} from '../learning/lessonPages';
import {validateLessonActivitySources} from '../learning/lessonActivitySources';
import {evaluateLessonActivity} from '../learning/lessonActivities';
it('retains every source and editable page including all 39 grammar decisions',()=>{
 expect(draft.items).toHaveLength(6);expect(draft.humanReviewed).toBe(false);
 let grammarCount=0;
 for(const item of draft.items){
  const lesson=LESSON_BY_ID.get(item.lessonId)!;const rich=getRichLessonContent(item.lessonId)!;
  const doc=item.lessonPages as LessonPageDocument;
  expect(item.studioContent.lessonPages).toEqual(doc);
  expect(item.studioContent.prerequisites).toEqual(lesson.prerequisiteIds);
  expect(item.studioContent.vocabulary).toEqual(lesson.wordIds);
  expect(item.studioContent.sourceGrammarIds).toEqual(rich.grammar.map(g=>g.id));
  expect(item.studioContent.grammar).toHaveLength(rich.grammar.length);
  expect(validateLessonPages(doc)).toEqual([]);expect(validateLessonActivitySources(item.lessonId,doc)).toEqual([]);
  const blocks=doc.pages.flatMap(p=>p.blocks);
  const activities=blocks.flatMap(b=>b.activity?[b.activity]:[]);
  expect(activities).toHaveLength(rich.grammar.length+2);
  expect(activities.every(a=>a.learningTarget)).toBe(true);
  for(const g of rich.grammar){expect(activities.filter(a=>a.learningTarget?.sources.some(s=>s.id===g.id))).toHaveLength(1);grammarCount++;}
  for(const id of lesson.wordIds){const word=WORD_BY_ID.get(id)!;const example=blocks.find(b=>b.id.endsWith(`word-${id}`))!;expect(example.hanzi).toContain(word.simplified);expect(example.hanzi.length).toBeGreaterThan(word.simplified.length+1);}
 }
 expect(grammarCount).toBe(39);
});
it('preserves contextual answer distinctions and changed transfer data',()=>{
 for(const [i,item] of draft.items.entries()){
  const blocks=(item.lessonPages as LessonPageDocument).pages.flatMap(p=>p.blocks);
  const choice=blocks.find(b=>b.id.endsWith(':choice'))!.activity!;
  for(let n=0;n<3;n++)expect(evaluateLessonActivity(choice,{text:'',answerIds:[`option-${n}`]})).toBe(n===[1,2,0,1,2,0][i]?'correct':'incorrect');
  const produce=blocks.find(b=>b.id.endsWith(':produce'))!.activity!;
  expect(produce.explanation).toContain(['二十分钟','门关着','前年在成都','一到家就拿机票','往左走','梅让龙出去拿笔'][i]);
  expect(evaluateLessonActivity(produce,{text:produce.explanation})).toBe('self-review');
 }
});
