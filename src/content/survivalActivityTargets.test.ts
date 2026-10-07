import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import plan from '../../content/drafts/thien-lo-survival-activity-targets.json';
import {applyMissingEditorialActivityTargets} from './editorialActivityTargets';
import type {LessonActivityTarget} from '../learning/lessonActivityTarget';
import type {LessonPageDocument} from '../learning/lessonPages';

const manuscripts=(JSON.parse(readFileSync('content/drafts/thien-lo-survival-batch-v2.json','utf8')) as {items:Array<{lessonId:string;lessonPages:LessonPageDocument}>}).items;

it('links all 27 survival activities to exact sources without changing existing content',()=>{
 expect(plan.humanReviewed).toBe(false);
 expect(plan.partial).toBe(true);
 expect(plan.lessonIds).toEqual(manuscripts.map(item=>item.lessonId));
 let total=0;
 for(const item of manuscripts){
  const targets=plan.targets[item.lessonId as keyof typeof plan.targets] as Record<string,LessonActivityTarget>;
  const before=JSON.stringify(item.lessonPages);
  const next=applyMissingEditorialActivityTargets(item.lessonId,item.lessonPages,targets);
  for(const block of next.pages.flatMap(page=>page.blocks).filter(block=>block.activity)){
   expect(block.activity?.learningTarget).toEqual(targets[block.id]);
   delete block.activity?.learningTarget;
  }
  expect(next).toEqual(item.lessonPages);
  expect(JSON.stringify(item.lessonPages)).toBe(before);
  total+=Object.keys(targets).length;
 }
 expect(total).toBe(27);
 expect(plan.targets['survival-3']['survival-3:v2:block:guided'].sources).toEqual([{kind:'grammar',id:'hsk1-grammar-row-008'}]);
 expect(plan.targets['survival-8']['survival-8:v2:block:guided'].sources[0].kind).toBe('task');
 expect(plan.targets['survival-9']['survival-9:v2:block:guided'].sources[0].kind).toBe('task');
});
