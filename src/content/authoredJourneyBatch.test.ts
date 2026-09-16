import {expect,it} from 'vitest';
import draft from '../../content/drafts/thien-lo-journey-batch-v2.json';
import {LESSON_BY_ID} from '../data/curriculum';
import {validateStudioContent} from './studioContent';
import {validateLessonPages} from '../learning/lessonPages';
import {canonicalStudioJson,studioSha256} from './studioContent';
import review from '../../content/review/thien-lo-journey-batch-v2-local.json';

it('binds both local reviews to the exact editable payloads',async()=>{
 expect(review.humanReviewed).toBe(false);
 expect(review.items.map(i=>i.lessonId)).toEqual(draft.items.map(i=>i.lessonId));
 for(const item of draft.items){
  const assessment=review.items.find(r=>r.lessonId===item.lessonId)!;
  expect(assessment.sourceContentSha256).toBe(await studioSha256(canonicalStudioJson(item.studioContent)));
  expect((await validateStudioContent('lesson',{...item.studioContent,review:{humanReviewed:false,aiSelfReview:assessment.aiSelfReview}})).result.errors).toEqual([]);
 }
});

it('preserves travel lesson identities and keeps unreviewed drafts out of release',async()=>{
 expect(draft.items.map(i=>i.lessonId)).toEqual(['journey-1','journey-2']);
 for(const item of draft.items){
  const lesson=LESSON_BY_ID.get(item.lessonId)!;
  expect(item.studioContent.vocabulary).toEqual(lesson.wordIds);
  expect(item.studioContent.prerequisites).toEqual(lesson.prerequisiteIds);
  expect(item.studioContent.skills).toEqual(lesson.skills);
  expect(validateLessonPages(item.lessonPages)).toEqual([]);
  expect((await validateStudioContent('lesson',item.studioContent)).result.errors.map(e=>e.path)).toEqual(['review.aiSelfReview']);
 }
 expect(draft.items[0].studioContent.exercises[0].answer).toBe('我坐飞机去。');
 expect(draft.items[1].studioContent.exercises[0].answer).toBe('我听见他说话了。');
 expect(draft.humanReviewed).toBe(false);
});
