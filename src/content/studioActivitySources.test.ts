import {expect,it} from 'vitest';
import batch from '../../content/drafts/thien-lo-boot-sound-batch-v2.json';
import {validateStudioContent} from './studioContent';
import {lessonActivitySources} from '../learning/lessonActivitySources';
import type {LessonPageDocument} from '../learning/lessonPages';
it('offers exact lesson source identities and blocks forged or other-lesson references at publication validation',async()=>{
 const sources=lessonActivitySources('boot-3');
 expect(sources.some(s=>s.kind==='pronunciation'&&s.id==='initial-contrast-jqx-zhchsh-zcs')).toBe(true);
 expect(lessonActivitySources('missing')).toEqual([]);
 for(const id of ['initial-contrast-jqx-zhchsh-zcs','sandhi-third-third','invented-source']){
  const content=structuredClone(batch.items[0].studioContent);
  const block=(content.lessonPages as LessonPageDocument).pages.flatMap(p=>p.blocks).find(b=>b.activity)!;
  block.activity!.learningTarget={skill:'pronunciation',objective:'Phân biệt vùng đặt lưỡi.',sources:[{kind:'pronunciation',id}]};
  const result=await validateStudioContent('lesson',content);
  expect(result.result.errors.some(e=>e.path==='lessonPages.learningTarget')).toBe(id!=='initial-contrast-jqx-zhchsh-zcs');
 }
});
