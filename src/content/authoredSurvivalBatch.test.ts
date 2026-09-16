import {expect,it} from 'vitest';
import draft from '../../content/drafts/thien-lo-survival-batch-v2.json';
import {validateStudioContent} from './studioContent';
import {LESSON_BY_ID} from '../data/curriculum';
import {validateLessonPages} from '../learning/lessonPages';
import review from '../../content/review/thien-lo-survival-batch-v2-local.json';
import {canonicalStudioJson,studioSha256} from './studioContent';
it('binds every reviewed batch payload to its local authorization',async()=>{
 expect(review.humanReviewed).toBe(false);
 expect(review.items.map(i=>i.lessonId)).toEqual(draft.items.map(i=>i.lessonId));
 for(const item of draft.items){
  const assessment=review.items.find(r=>r.lessonId===item.lessonId)!;
  expect(assessment.sourceContentSha256).toBe(await studioSha256(canonicalStudioJson(item.studioContent)));
  const validated=await validateStudioContent('lesson',{...item.studioContent,review:{humanReviewed:false,aiSelfReview:assessment.aiSelfReview}});
  expect(validated.result.errors,item.lessonId).toEqual([]);
 }
});
it('preserves every identity in the nine-lesson draft batch and validates every page',async()=>{
 expect(draft.items.map(i=>i.lessonId)).toEqual(Array.from({length:9},(_,i)=>`survival-${i+1}`));
 for(const item of draft.items){
  const core=LESSON_BY_ID.get(item.lessonId)!;
  expect(item.studioContent.vocabulary).toEqual(core.wordIds);
  expect(item.studioContent.prerequisites).toEqual(core.prerequisiteIds);
  expect(item.studioContent.skills).toEqual(core.skills);
  expect(validateLessonPages(item.lessonPages)).toEqual([]);
  const validation=await validateStudioContent('lesson',item.studioContent);
  expect(validation.result.errors.map(e=>e.path),item.lessonId).toEqual(['review.aiSelfReview']);
 }
 expect(draft.status).toBe('draft-not-published');
 expect(draft.humanReviewed).toBe(false);
});
