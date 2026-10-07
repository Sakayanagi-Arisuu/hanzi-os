import {expect,it} from 'vitest';
import draft from '../../content/drafts/thien-lo-hsk3-personal-v2.json';
import {LESSON_BY_ID} from '../data/curriculum';
import {validateLessonPages,type LessonPageDocument} from '../learning/lessonPages';
import {validateLessonActivitySources} from '../learning/lessonActivitySources';
import {evaluateLessonActivity} from '../learning/lessonActivities';
it('keeps source links while teaching selected words through multi-paragraph narratives',()=>{
 expect(draft.items).toHaveLength(5);expect(new Set(draft.items.map(i=>i.lessonPages.pages[0].illustration!.src)).size).toBe(5);
 for(const i of draft.items){const doc=i.lessonPages as LessonPageDocument;const l=LESSON_BY_ID.get(i.lessonId)!;
 expect(validateLessonPages(doc)).toEqual([]);expect(validateLessonActivitySources(i.lessonId,doc)).toEqual([]);expect(i.studioContent.vocabulary).toEqual(l.wordIds);expect(i.studioContent.prerequisites).toEqual(l.prerequisiteIds);expect(i.studioContent.lessonPages).toEqual(doc);
 expect(i.coreVocabularyIds).toHaveLength(8);for(const id of i.coreVocabularyIds)expect(l.wordIds).toContain(id);
 const blocks=doc.pages.flatMap(p=>p.blocks);expect(blocks.find(b=>b.reading)!.reading!.paragraphs).toHaveLength(4);
 for(const b of blocks.filter(b=>b.activity)){const a=b.activity!;expect(a.learningTarget).toBeTruthy();if(a.type==='cloze'){expect(evaluateLessonActivity(a,{text:a.acceptedAnswers[0]})).toBe('correct');expect(evaluateLessonActivity(a,{text:'错'})).toBe('incorrect');}if(a.type==='choice')for(const o of a.options)expect(evaluateLessonActivity(a,{text:'',answerIds:[o.id]})).toBe(a.answerIds.includes(o.id)?'correct':'incorrect');}
 }
});
it('teaches the meal decision separately from the shopping preference',()=>{
 const food=draft.items.find(i=>i.lessonId.endsWith('food-shopping'))!;
 const doc=food.lessonPages as LessonPageDocument;
 const meal=doc.pages.find(p=>p.id.endsWith(':meal'))!.blocks[0].reading!;
 expect(meal.paragraphs).toHaveLength(3);
 expect(meal.paragraphs[0].hanzi).toContain('还剩三十块钱');
 const choice=doc.pages.find(p=>p.id.endsWith(':meal-choice'))!.blocks[0].activity!;
 expect(evaluateLessonActivity(choice,{text:'',answerIds:['taste']})).toBe('correct');
 expect(evaluateLessonActivity(choice,{text:'',answerIds:['budget']})).toBe('incorrect');
 const transfer=doc.pages.find(p=>p.id.endsWith(':meal-transfer'))!.blocks[0];
 expect(transfer.body).toContain('ăn cay được');
});

