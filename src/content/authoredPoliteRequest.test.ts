import {expect,it} from 'vitest';
import draft from '../../content/drafts/thien-lo-hsk2-polite-request-v2.json';
import {LESSON_BY_ID} from '../data/curriculum';
import {validateLessonPages,type LessonPageDocument} from '../learning/lessonPages';
import {validateLessonActivitySources} from '../learning/lessonActivitySources';
import {evaluateLessonActivity} from '../learning/lessonActivities';
const doc=draft.lessonPages as LessonPageDocument;
it('preserves curriculum links and gives each vocabulary item a contextual example',()=>{
 const lesson=LESSON_BY_ID.get(draft.lessonId)!;
 expect(draft.studioContent.prerequisites).toEqual(lesson.prerequisiteIds);
 expect(draft.studioContent.sourceVocabularyIds).toEqual(lesson.wordIds);
 expect(validateLessonPages(doc)).toEqual([]);
 expect(validateLessonActivitySources(draft.lessonId,doc)).toEqual([]);
 const blocks=doc.pages.flatMap(p=>p.blocks);
 for(const id of lesson.wordIds){const block=blocks.find(b=>b.id.endsWith(`word-${id}`))!;expect(block.hanzi.length).toBeGreaterThan(4);expect(block.pinyin).toBeTruthy();expect(block.meaningVi).toBeTruthy();}
 expect(draft.humanReviewed).toBe(false);
});
it('distinguishes clarification from generic agreement and keeps transfer as self-review',()=>{
 const blocks=doc.pages.flatMap(p=>p.blocks);
 const confirm=blocks.find(b=>b.id.endsWith(':confirm'))!.activity!;
 expect(evaluateLessonActivity(confirm,{text:'',answerIds:['c0']})).toBe('incorrect');
 expect(evaluateLessonActivity(confirm,{text:'',answerIds:['c1']})).toBe('correct');
 const order=blocks.find(b=>b.id.endsWith(':help-order'))!.activity!;
 expect(evaluateLessonActivity(order,{text:'',answerIds:['you','can','help','action','q']})).toBe('correct');
 expect(evaluateLessonActivity(order,{text:'',answerIds:['you','help','can','action','q']})).toBe('incorrect');
 const transfer=blocks.find(b=>b.id.endsWith(':transfer-write'))!.activity!;
 expect(transfer.explanation).toContain('给老师打');
 expect(evaluateLessonActivity(transfer,{text:'给老师打。',answerIds:[]})).toBe('self-review');
 expect(blocks.filter(b=>b.activity).every(b=>!!b.activity?.learningTarget)).toBe(true);
});
