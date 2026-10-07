import {expect,it} from 'vitest';
import boot2 from '../../content/drafts/thien-lo-boot-2-v2.json';
import sound from '../../content/drafts/thien-lo-boot-sound-batch-v2.json';
import plan from '../../content/drafts/thien-lo-boot-2-4-activity-targets.json';
import {applyEditorialActivityTargets} from './editorialActivityTargets';
import type {LessonActivityTarget} from '../learning/lessonActivityTarget';
import type {LessonPageDocument} from '../learning/lessonPages';

it('links exact HSK0 activities without changing teaching text, answers, IDs or rubric',()=>{
 const manuscripts=[boot2,...sound.items];
 expect(plan.humanReviewed).toBe(false);
 expect(plan.lessonIds).toEqual(manuscripts.map(item=>item.lessonId));
 let total=0;
 for(const item of manuscripts){
  const document=item.lessonPages as LessonPageDocument;
  const targets=plan.targets[item.lessonId as keyof typeof plan.targets] as Record<string,LessonActivityTarget>;
  const before=JSON.stringify(document);
  const next=applyEditorialActivityTargets(item.lessonId,document,targets);
  const activities=next.pages.flatMap(page=>page.blocks.filter(block=>block.activity));
  expect(activities).toHaveLength(Object.keys(targets).length);
  for(const block of activities){
   expect(block.activity?.learningTarget).toEqual(targets[block.id]);
   delete block.activity?.learningTarget;
  }
  expect(next).toEqual(document);
  expect(JSON.stringify(document)).toBe(before);
  total+=activities.length;
 }
 expect(total).toBe(14);
});
