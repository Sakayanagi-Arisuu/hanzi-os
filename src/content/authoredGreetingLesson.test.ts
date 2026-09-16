import {expect,it} from 'vitest';
import draft from '../../content/drafts/thien-lo-boot-2-v2.json';
import {validateStudioContent} from './studioContent';
import {LESSON_BY_ID} from '../data/curriculum';
import review from '../../content/review/thien-lo-boot-2-v2-local.json';
import {canonicalStudioJson,studioSha256} from './studioContent';
import {parsePublishedStudioLessons} from './publishedStudioLessons';
it('keeps the HSK0 greeting manuscript editable and blocks release pending review',async()=>{
  const checked=await validateStudioContent('lesson',draft.studioContent);
  expect(checked.result.errors.map(error=>error.path)).toEqual(['review.aiSelfReview']);
  const lesson=LESSON_BY_ID.get('boot-2')!;
  expect(draft.studioContent.vocabulary).toEqual(lesson.wordIds);
  expect(draft.studioContent.prerequisites).toEqual(['boot-1']);
  expect(draft.studioContent.skills).toEqual(lesson.skills);
  expect(draft.lessonPages.pages).toHaveLength(8);
  expect(draft.studioContent.lessonPages).toEqual(draft.lessonPages);
  expect(draft.humanReviewed).toBe(false);
});
it('publishes an HSK0 rich overlay without changing core identity or prerequisites',async()=>{
  expect(await studioSha256(canonicalStudioJson(draft.studioContent))).toBe(review.sourceContentSha256);
  const content={...draft.studioContent,review:{humanReviewed:false,aiSelfReview:review.aiSelfReview}};
  const checked=await validateStudioContent('lesson',content);
  expect(checked.result.errors).toEqual([]);
  const projected=parsePublishedStudioLessons({schemaVersion:1,policy:'published-only',releaseBoundary:'content-release-worker-v1',items:[{stableKey:'thien-lo-v2-boot-2',itemType:'lesson',level:'hsk0',title:draft.title,revision:1,revisionId:'greeting-test',schemaVersion:1,contentSha256:checked.result.contentSha256,publishedAt:1,content}]}).get('boot-2')!;
  expect(projected.richContent.lessonPages).toEqual(draft.lessonPages);
  expect(projected.lesson.wordIds).toEqual(['ni','hao','wo']);
  expect(projected.lesson.prerequisiteIds).toEqual(['boot-1']);
});
