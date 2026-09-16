import type {LessonPageDocument} from '../learning/lessonPages';
import {validateLessonPages} from '../learning/lessonPages';
import {validateLessonActivitySources} from '../learning/lessonActivitySources';
import {validateActivityTarget,type LessonActivityTarget} from '../learning/lessonActivityTarget';

/** Explicit editorial map only, applied to a new draft. Never infer a skill or
 * mutate a published document, learner snapshot, or answer to fit a mapping.
 */
export function applyEditorialActivityTargets(lessonId:string,document:LessonPageDocument,targets:Record<string,LessonActivityTarget>):LessonPageDocument{
 const ids=document.pages.flatMap(p=>p.blocks.filter(b=>b.kind==='activity').map(b=>b.id));
 if(ids.length!==Object.keys(targets).length||ids.some(id=>!Object.hasOwn(targets,id)))throw new Error('Editorial target map must cover exactly the lesson activities');
 const copy=structuredClone(document);
 for(const page of copy.pages)for(const block of page.blocks){
  if(block.kind!=='activity'||!block.activity)continue;
  const target=targets[block.id];
  if(validateActivityTarget(target).length)throw new Error('Invalid editorial target');
  if(block.activity.learningTarget&&JSON.stringify(block.activity.learningTarget)!==JSON.stringify(target))throw new Error('Existing editorial target must be reconciled explicitly');
  block.activity.learningTarget=structuredClone(target);
 }
 const errors=[...validateLessonPages(copy),...validateLessonActivitySources(lessonId,copy)];
 if(errors.length)throw new Error(errors.join('\n'));
 return copy;
}
