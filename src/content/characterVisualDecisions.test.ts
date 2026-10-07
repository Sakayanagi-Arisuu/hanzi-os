import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {validateLessonPages} from '../learning/lessonPages';
import {applyCharacterVisualDecision,characterVisualIds} from '../../scripts/content/character-visual-decisions.mjs';
const items=JSON.parse(readFileSync('content/drafts/thien-lo-character-batch-v2.json','utf8')).items;
it('retains every glyph, exercise, target and ID while focusing the two introduction pages',()=>{
 expect(items.map((i:{lessonId:string})=>i.lessonId)).toEqual(characterVisualIds);
 for(const item of items){
  const original=item.studioContent;
  const snapshot=JSON.stringify(original);
  const next=applyCharacterVisualDecision(original);
  expect(validateLessonPages(next.lessonPages)).toEqual([]);
  for(const [suffix,layout] of [['context','scene'],['visual','split']]){
   const page=next.lessonPages.pages.find((p:{id:string})=>p.id===`${item.lessonId}:v2:${suffix}`);
   expect(page.layout).toBe('focus');
   page.layout=layout;
  }
  expect(next).toEqual(original);
  expect(JSON.stringify(original)).toBe(snapshot);
 }
});
it('refuses an editor illustration rather than removing it',()=>{
 const source=structuredClone(items[0].studioContent);
 source.lessonPages.pages[0].illustration={src:'/editor.webp'};
 expect(()=>applyCharacterVisualDecision(source)).toThrow('Preserve changed');
});
