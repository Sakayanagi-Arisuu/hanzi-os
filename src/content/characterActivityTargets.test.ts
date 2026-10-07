import {expect,it} from 'vitest';
import manuscript from '../../content/drafts/thien-lo-character-batch-v2.json';
import plan from '../../content/drafts/thien-lo-character-activity-targets.json';
import {applyEditorialActivityTargets} from './editorialActivityTargets';
import {applyCharacterTargetCorrections} from '../../scripts/content/apply-character-target-corrections.mjs';
import type {LessonActivityTarget} from '../learning/lessonActivityTarget';
import type {LessonPageDocument} from '../learning/lessonPages';

it('binds each authored character activity to its exact source without changing answers or page IDs',()=>{
 expect(plan.humanReviewed).toBe(false);
 expect(plan.lessonIds).toEqual(manuscript.items.map(item=>item.lessonId));
 let count=0;
 for(const item of manuscript.items){
  const original=item.lessonPages as LessonPageDocument;
  const corrections=plan.contentCorrections[item.lessonId as keyof typeof plan.contentCorrections]??{};
  const corrected=applyCharacterTargetCorrections(original,corrections) as LessonPageDocument;
  const targets=plan.targets[item.lessonId as keyof typeof plan.targets] as Record<string,LessonActivityTarget>;
  const bound=applyEditorialActivityTargets(item.lessonId,corrected,targets);
  const activities=bound.pages.flatMap(page=>page.blocks.filter(block=>block.activity));
  count+=activities.length;
  for(const block of activities){expect(block.activity?.learningTarget).toEqual(targets[block.id]);delete block.activity?.learningTarget;}
  expect(bound).toEqual(corrected);
  expect(item.lessonPages.pages.map(page=>page.id)).toEqual(corrected.pages.map(page=>page.id));
 }
 expect(count).toBe(356);
});

it('resolves the 做/作 ambiguity with a contextual 做饭 prompt and one accepted answer',()=>{
 const original=manuscript.items.find(item=>item.lessonId==='characters-13')!.lessonPages;
 const corrections=plan.contentCorrections['characters-13'];
 const corrected=applyCharacterTargetCorrections(original,corrections) as LessonPageDocument;
 const block=corrected.pages.flatMap(page=>page.blocks).find(block=>block.id==='characters-13:v2:block:recall-hsk1-character-246')!;
 expect(block.body).toContain('□饭');
 expect(block.activity?.acceptedAnswers).toEqual(['做']);
 expect(block.activity?.explanation).toContain('做饭');
 expect(block.activity?.explanation).toContain('作 cũng đọc zuò');
 expect(()=>applyCharacterTargetCorrections(corrected,corrections)).toThrow('source changed');
});
