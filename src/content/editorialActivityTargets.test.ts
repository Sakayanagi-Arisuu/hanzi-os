import {expect,it} from 'vitest';
import draft from '../../content/drafts/thien-lo-boot-1-v2.json';
import plan from '../../content/drafts/thien-lo-boot-1-activity-targets.json';
import {applyEditorialActivityTargets} from './editorialActivityTargets';
import type {LessonActivityTarget} from '../learning/lessonActivityTarget';
import type {LessonPageDocument} from '../learning/lessonPages';
const document=draft.lessonPages as LessonPageDocument;
const targets=plan.targets as Record<string,LessonActivityTarget>;
it('applies four explicitly reviewed objectives without changing page IDs, questions, answers or feedback',()=>{
 const before=JSON.stringify(document);
 const copy=applyEditorialActivityTargets('boot-1',document,targets);
 const activities=copy.pages.flatMap(p=>p.blocks.filter(b=>b.activity));
 expect(activities).toHaveLength(4);
 for(const block of activities){expect(block.activity!.learningTarget).toEqual(targets[block.id]);delete block.activity!.learningTarget;}
 expect(copy).toEqual(document);expect(JSON.stringify(document)).toBe(before);
 expect(plan.humanReviewed).toBe(false);
});
it('rejects incomplete mapping, sources from another lesson, and replacement of an existing editor target',()=>{
 expect(()=>applyEditorialActivityTargets('boot-1',document,{})).toThrow('exactly');
 expect(()=>applyEditorialActivityTargets('boot-2',document,targets)).toThrow('nguồn');
 const copy=applyEditorialActivityTargets('boot-1',document,targets);
 const changed=structuredClone(targets);changed['boot-1:v2:block:fall-check'].objective='Khác';
 expect(()=>applyEditorialActivityTargets('boot-1',copy,changed)).toThrow('reconciled');
});
