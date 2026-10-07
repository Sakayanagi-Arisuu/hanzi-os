import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {correctHsk2MotionResponse} from '../../scripts/content/hsk2-motion-response-correction.mjs';
describe('HSK2 location response revision',()=>{
 it('keeps both dialogue consumers consistent without changing learner targets or exercises',()=>{
  const draft=JSON.parse(readFileSync('content/drafts/thien-lo-hsk2-motion-meeting-v2.json','utf8')).items[0];
  const source=draft.studioContent;
  const frozen=structuredClone(source);
  const next=correctHsk2MotionResponse(source);
  const page=next.lessonPages.pages.find((p:{id:string})=>p.id.endsWith(':dialogue'));
  expect(next.dialogue[6].hanzi).toContain('我还在门外等你');
  expect(page.blocks[6]).toMatchObject({hanzi:next.dialogue[6].hanzi,pinyin:next.dialogue[6].pinyin,meaningVi:next.dialogue[6].meaningVi});
  expect(source).toEqual(frozen);
  expect(next.exercises).toEqual(source.exercises);
  expect(next.vocabulary).toEqual(source.vocabulary);
  expect(next.grammar).toEqual(source.grammar);
  expect(next.lessonPages.pages.filter((p:{id:string})=>!p.id.endsWith(':dialogue'))).toEqual(source.lessonPages.pages.filter((p:{id:string})=>!p.id.endsWith(':dialogue')));
  expect(()=>correctHsk2MotionResponse(next)).toThrow('Preserve edited dialogue');
 });
});
