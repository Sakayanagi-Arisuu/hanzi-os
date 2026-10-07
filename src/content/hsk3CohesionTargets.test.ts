import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import plan from '../../content/drafts/thien-lo-hsk3-cohesion-targets.json';
import {applyMissingEditorialActivityTargets} from './editorialActivityTargets';
import type {LessonActivityTarget} from '../learning/lessonActivityTarget';
import type {LessonPageDocument} from '../learning/lessonPages';

it('links five HSK3 cohesion activities while preserving their wording and rubric',()=>{
 const item=JSON.parse(readFileSync('content/drafts/thien-lo-hsk3-timeline-v2.json','utf8')) as {lessonId:string;lessonPages:LessonPageDocument};
 const targets=plan.targets[item.lessonId as keyof typeof plan.targets] as Record<string,LessonActivityTarget>;
 const before=JSON.stringify(item.lessonPages);
 const next=applyMissingEditorialActivityTargets(item.lessonId,item.lessonPages,targets);
 for(const block of next.pages.flatMap(page=>page.blocks).filter(block=>block.activity)){
  expect(block.activity?.learningTarget).toEqual(targets[block.id]);
  delete block.activity?.learningTarget;
 }
 expect(next).toEqual(item.lessonPages);
 expect(JSON.stringify(item.lessonPages)).toBe(before);
 expect(Object.keys(targets)).toHaveLength(5);
 expect(targets[`${item.lessonId}:v2:new-explain`].skill).toBe('reading');
 expect(plan.humanReviewed).toBe(false);
});
