import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {LESSON_SCENES} from '../learning/lessonPresentation';
import {validateLessonPages} from '../learning/lessonPages';
import {applyDailyVisualDecision,dailyVisualAssets} from '../../scripts/content/daily-visual-decisions.mjs';
const items=JSON.parse(readFileSync('content/drafts/thien-lo-everyday-batch-v2.json','utf8')).items;
it('changes only explicit artwork and diagram layout, retaining every learning field',()=>{
 for(const [id,asset] of Object.entries(dailyVisualAssets)){
  const original=items.find((i:{lessonId:string})=>i.lessonId===id).studioContent;
  const scene=LESSON_SCENES.find(s=>s.src.endsWith(`/${asset}`));
  const snapshot=JSON.stringify(original);
  const next=applyDailyVisualDecision(original,scene);
  expect(validateLessonPages(next.lessonPages)).toEqual([]);
  for(const suffix of ['context','dialogue']){
   const page=next.lessonPages.pages.find((p:{id:string})=>p.id===`${id}:v2:${suffix}`);
   expect(page.illustration).toEqual(scene);
   delete page.illustration;
  }
  const diagram=next.lessonPages.pages.find((p:{id:string})=>p.id===`${id}:v2:visual`);
  expect(diagram.layout).toBe('focus');
  diagram.layout='scene';
  expect(next).toEqual(original);
  expect(JSON.stringify(original)).toBe(snapshot);
 }
});
it('preserves editor art by rejecting an unexpected existing illustration',()=>{
 const original=structuredClone(items.find((i:{lessonId:string})=>i.lessonId==='daily-1').studioContent);
 original.lessonPages.pages.find((p:{id:string})=>p.id==='daily-1:v2:context').illustration={src:'/editor.webp'};
 const scene=LESSON_SCENES.find(s=>s.src.endsWith('/apple-market-prices-v1.webp'));
 expect(()=>applyDailyVisualDecision(original,scene)).toThrow('Preserve editor artwork');
});
