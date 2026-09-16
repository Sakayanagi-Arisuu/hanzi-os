import {expect,it} from 'vitest';
import draft from '../../content/drafts/thien-lo-hsk2-health-v2.json';
import {LESSON_BY_ID,WORD_BY_ID} from '../data/curriculum';
import {validateLessonPages,type LessonPageDocument} from '../learning/lessonPages';
import {validateLessonActivitySources} from '../learning/lessonActivitySources';
import {evaluateLessonActivity} from '../learning/lessonActivities';

const item=draft.items[0];
const doc=item.lessonPages as LessonPageDocument;
const blocks=doc.pages.flatMap(p=>p.blocks);
it('retains the health lesson sources and contextual vocabulary in the editable document',()=>{
 const lesson=LESSON_BY_ID.get(item.lessonId)!;
 expect(item.studioContent.prerequisites).toEqual(lesson.prerequisiteIds);
 expect(item.studioContent.sourceVocabularyIds).toEqual(lesson.wordIds);
 expect(item.studioContent.lessonPages).toEqual(doc);
 expect(validateLessonPages(doc)).toEqual([]);
 expect(validateLessonActivitySources(item.lessonId,doc)).toEqual([]);
 for(const id of lesson.wordIds){
  const example=blocks.find(b=>b.id.endsWith(`word-${id}`))!;
  expect(example.hanzi).toContain(WORD_BY_ID.get(id)!.simplified);
  expect(example.hanzi).not.toBe(WORD_BY_ID.get(id)!.simplified);
  expect(example.pinyin).toBeTruthy();
  expect(example.meaningVi).toBeTruthy();
 }
 expect(blocks.filter(b=>b.activity).every(b=>!!b.activity?.learningTarget)).toBe(true);
});
it('distinguishes uncertainty from causation and onset from cause without auto-grading free writing',()=>{
 const choice=blocks.find(b=>b.id.endsWith(':choice'))!.activity!;
 expect(evaluateLessonActivity(choice,{text:'',answerIds:['option-0']})).toBe('correct');
 for(const id of ['option-1','option-2'])expect(evaluateLessonActivity(choice,{text:'',answerIds:[id]})).toBe('incorrect');
 const guided=blocks.find(b=>b.id.endsWith(':guided'))!.activity!;
 expect(evaluateLessonActivity(guided,{text:'从',answerIds:[]})).toBe('correct');
 expect(evaluateLessonActivity(guided,{text:'因为',answerIds:[]})).toBe('incorrect');
 const transfer=blocks.find(b=>b.id.endsWith(':produce'))!.activity!;
 expect(evaluateLessonActivity(transfer,{text:'我的手疼。',answerIds:[]})).toBe('self-review');
});
