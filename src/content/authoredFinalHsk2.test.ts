import {expect,it} from 'vitest';
import {existsSync} from 'node:fs';
import draft from '../../content/drafts/thien-lo-hsk2-final-v2.json';
import {LESSON_BY_ID,WORD_BY_ID} from '../data/curriculum';
import {validateLessonPages,type LessonPageDocument} from '../learning/lessonPages';
import {validateLessonActivitySources} from '../learning/lessonActivitySources';
import {evaluateLessonActivity} from '../learning/lessonActivities';
it('preserves source identities and validates every answer and learning target',()=>{
 expect(draft.items).toHaveLength(4);
 for(const item of draft.items){
  const lesson=LESSON_BY_ID.get(item.lessonId)!;const doc=item.lessonPages as LessonPageDocument;
  expect(validateLessonPages(doc)).toEqual([]);expect(validateLessonActivitySources(item.lessonId,doc)).toEqual([]);
  expect(item.studioContent.lessonPages).toEqual(doc);expect(item.studioContent.vocabulary).toEqual(lesson.wordIds);expect(item.studioContent.prerequisites).toEqual(lesson.prerequisiteIds);
  const blocks=doc.pages.flatMap(p=>p.blocks);
  for(const id of lesson.wordIds){const word=WORD_BY_ID.get(id)!;const block=blocks.find(b=>b.id.endsWith(`word-${id}`))!;expect(block.hanzi).toContain(word.simplified);expect(block.hanzi.length).toBeGreaterThan(word.simplified.length+1);}
  for(const block of blocks.filter(b=>b.activity)){const a=block.activity!;expect(a.learningTarget).toBeTruthy();if(a.type==='cloze'){expect(evaluateLessonActivity(a,{text:a.acceptedAnswers[0]})).toBe('correct');expect(evaluateLessonActivity(a,{text:'错'})).toBe('incorrect');}if(a.type==='choice')for(const o of a.options)expect(evaluateLessonActivity(a,{text:'',answerIds:[o.id]})).toBe(a.answerIds.includes(o.id)?'correct':'incorrect');}
 }
});
it('uses distinct uncropped instructional images and teaches observation versus inference',()=>{
 const pictures=draft.items.slice(2);const paths=new Set<string>();
 for(const item of pictures){const doc=item.lessonPages as LessonPageDocument;const image=doc.pages[0].blocks.find(b=>b.kind==='image')!;expect(image).toBeTruthy();expect(doc.pages[0].layout).toBe('focus');expect(existsSync('public'+image.imageSrc)).toBe(true);paths.add(image.imageSrc);expect(doc.pages.find(p=>p.id.endsWith(':choice'))!.blocks.some(b=>b.kind==='image')).toBe(true);}
 expect(paths.size).toBe(2);
 const zhe=(pictures[1].lessonPages as LessonPageDocument).pages.flatMap(p=>p.blocks).find(b=>b.id.endsWith('word-hsk-vocab-00490'))!;
 expect(zhe.hanzi).toBe('她拿着一把伞。');expect(zhe.pinyin).toContain('ná zhe');
 expect(pictures[0].studioContent.pitfallVi).toContain('Không khẳng định đã uống thuốc');
});

