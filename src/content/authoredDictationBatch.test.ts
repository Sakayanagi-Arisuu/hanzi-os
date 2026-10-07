import { expect, it } from 'vitest';
import draft from '../../content/drafts/thien-lo-hsk2-dictation-v2.json';
import { LESSON_BY_ID, WORD_BY_ID } from '../data/curriculum';
import { validateLessonPages, type LessonPageDocument } from '../learning/lessonPages';
import { validateLessonActivitySources } from '../learning/lessonActivitySources';
import { evaluateLessonActivity } from '../learning/lessonActivities';
it('keeps identities and teaches before listening with distinct scenes and complete word examples',()=>{
 expect(draft.items).toHaveLength(3);
 expect(new Set(draft.items.map(i=>i.lessonPages.pages[0].illustration?.src)).size).toBe(3);
 for(const item of draft.items){
  const doc=item.lessonPages as LessonPageDocument;
  const lesson=LESSON_BY_ID.get(item.lessonId)!;
  expect(validateLessonPages(doc)).toEqual([]);
  expect(validateLessonActivitySources(item.lessonId,doc)).toEqual([]);
  expect(item.studioContent.lessonPages).toEqual(doc);
  expect(item.studioContent.vocabulary).toEqual(lesson.wordIds);
  expect(item.studioContent.prerequisites).toEqual(lesson.prerequisiteIds);
  const blocks=doc.pages.flatMap(p=>p.blocks);
  expect(blocks.filter(b=>b.kind==='dictation')).toHaveLength(5);
  expect(doc.pages.findIndex(p=>p.id.endsWith(':guided-1'))).toBeLessThan(doc.pages.findIndex(p=>p.blocks.some(b=>b.kind==='dictation')));
  for(const [i,id]of lesson.wordIds.entries()){
   const word=WORD_BY_ID.get(id)!;
   const example=blocks.find(b=>b.id.endsWith(`:word:${i}`))!;
   expect(example.hanzi).toContain(word.simplified);
   expect(example.hanzi.length).toBeGreaterThan(word.simplified.length+1);
   expect(example.pinyin).toBeTruthy();expect(example.meaningVi).toBeTruthy();
  }
  for(const block of blocks.filter(b=>b.activity)){
   expect(block.activity!.learningTarget?.skill).toBe('reading');
   expect(evaluateLessonActivity(block.activity!,{text:block.activity!.acceptedAnswers[0]})).toBe('correct');
   expect(evaluateLessonActivity(block.activity!,{text:'không đúng'})).toBe('incorrect');
  }
 }
});
