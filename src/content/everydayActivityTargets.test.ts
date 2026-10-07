import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import plan from '../../content/drafts/thien-lo-everyday-activity-targets.json';
import {applyMissingEditorialActivityTargets} from './editorialActivityTargets';
import type {LessonActivityTarget} from '../learning/lessonActivityTarget';
import type {LessonPageDocument} from '../learning/lessonPages';

const manuscripts=(JSON.parse(readFileSync('content/drafts/thien-lo-everyday-batch-v2.json','utf8')) as {items:Array<{lessonId:string;lessonPages:LessonPageDocument}>}).items;

it('links 30 everyday/time-place activities without changing teaching content',()=>{
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
 expect(total).toBe(30);
 expect(plan.targets['daily-2']['daily-2:v2:block:choice'].sources[0].kind).toBe('task');
 expect(plan.targets['hsk1-time-place-events-05-location']['hsk1-time-place-events-05-location:v2:block:guided'].sources[0].kind).toBe('grammar');
});
