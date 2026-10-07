import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import plan from '../../content/drafts/thien-lo-journey-professional-targets.json';
import {applyMissingEditorialActivityTargets} from './editorialActivityTargets';
import type {LessonActivityTarget} from '../learning/lessonActivityTarget';
import type {LessonPageDocument} from '../learning/lessonPages';

const read=(path:string)=>JSON.parse(readFileSync(path,'utf8')) as {lessonId?:string;lessonPages?:LessonPageDocument;items?:Array<{lessonId:string;lessonPages:LessonPageDocument}>};
const manuscripts=[...(read('content/drafts/thien-lo-journey-batch-v2.json').items??[]),...[1,2,3,4].map(n=>read(`content/drafts/thien-lo-professional-${n}-v2.json`) as {lessonId:string;lessonPages:LessonPageDocument})];

it('links all 25 journey/professional activities to exact lesson sources',()=>{
 expect(plan.humanReviewed).toBe(false);
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
 expect(total).toBe(25);
 expect(plan.targets['professional-2']['professional-2:v2:block:recall'].sources).toHaveLength(2);
 expect(plan.targets['journey-2']['journey-2:v2:block:choice'].skill).toBe('reading');
});
