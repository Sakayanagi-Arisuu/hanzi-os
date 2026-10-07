import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import plan from '../../content/drafts/thien-lo-hsk4-self-speaking-targets.json';
import {applyMissingEditorialActivityTargets} from './editorialActivityTargets';
import type {LessonActivityTarget} from '../learning/lessonActivityTarget';
import type {LessonPageDocument} from '../learning/lessonPages';

const groups=['precision-reference-quantity','stance-comparison-rhetoric','event-agency-voice','information-order-cohesion','argument-logic-concession','structured-spoken-defense','timed-sectional-rehearsal'];
const manuscripts=groups.flatMap(name=>(JSON.parse(readFileSync(`content/drafts/thien-lo-hsk4-${name}-v2.json`,'utf8')) as {items:Array<{lessonId:string;lessonPages:LessonPageDocument}>}).items);

it('fills only 35 HSK4 self-speaking rubric gaps and preserves every original activity',()=>{
 expect(plan.humanReviewed).toBe(false);
 expect(plan.partial).toBe(true);
 expect(plan.lessonIds).toHaveLength(30);
 let total=0;
 for(const lessonId of plan.lessonIds){
  const source=manuscripts.find(item=>item.lessonId===lessonId);
  expect(source).toBeDefined();
  const document=source!.lessonPages;
  const before=JSON.stringify(document);
  const targets=plan.targets[lessonId as keyof typeof plan.targets] as Record<string,LessonActivityTarget>;
  const next=applyMissingEditorialActivityTargets(lessonId,document,targets);
  const blocks=next.pages.flatMap(page=>page.blocks.filter(block=>block.activity));
  for(const block of blocks){
   if(!Object.hasOwn(targets,block.id))continue;
   expect(block.activity?.type).toBe('rubric');
   expect(block.activity?.learningTarget).toEqual(targets[block.id]);
   expect(block.activity?.learningTarget?.skill).toBe('speaking');
   delete block.activity?.learningTarget;
  }
  expect(next).toEqual(document);
  expect(JSON.stringify(document)).toBe(before);
  total+=Object.keys(targets).length;
  expect(()=>applyMissingEditorialActivityTargets(lessonId,document,{})).toThrow();
 }
 expect(total).toBe(35);
});
