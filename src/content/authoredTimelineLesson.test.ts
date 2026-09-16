import {expect,it} from 'vitest';
import draft from '../../content/drafts/thien-lo-hsk3-timeline-v2.json';
import {validateStudioContent} from './studioContent';
import {LESSON_BY_ID} from '../data/curriculum';
import review from '../../content/review/thien-lo-hsk3-timeline-v2-local.json';
import {canonicalStudioJson,studioSha256} from './studioContent';
import {parsePublishedStudioLessons} from './publishedStudioLessons';

it('keeps the complete timeline manuscript editable while publication awaits actual review',async()=>{
  const checked=await validateStudioContent('lesson',draft.studioContent);
  expect(checked.result.errors.map(error=>error.path)).toEqual(['review.aiSelfReview']);
  expect(draft.studioContent.lessonPages).toEqual(draft.lessonPages);
  const base=LESSON_BY_ID.get(draft.lessonId)!;
  expect(draft.studioContent.vocabulary).toEqual(base.wordIds);
  expect(draft.studioContent.prerequisites).toEqual(base.prerequisiteIds);
  expect(draft.studioContent.skills).toEqual(base.skills);
  expect(draft.humanReviewed).toBe(false);
  expect(draft.status).toBe('authored-draft-not-published');
});

it('binds the local review and preserves both full reading texts through publication',async()=>{
  expect(await studioSha256(canonicalStudioJson(draft.studioContent))).toBe(review.sourceContentSha256);
  const content={...draft.studioContent,review:{humanReviewed:false,aiSelfReview:review.aiSelfReview}};
  const checked=await validateStudioContent('lesson',content);
  expect(checked.result.errors).toEqual([]);
  const lesson=parsePublishedStudioLessons({schemaVersion:1,policy:'published-only',releaseBoundary:'content-release-worker-v1',items:[{stableKey:`thien-lo-v2-${draft.lessonId}`,itemType:'lesson',level:'hsk3',title:draft.title,revision:1,revisionId:'timeline-review-test',schemaVersion:1,contentSha256:checked.result.contentSha256,publishedAt:1,content}]}).get(draft.lessonId)!;
  expect(lesson.richContent.lessonPages).toEqual(draft.lessonPages);
  expect(lesson.richContent.grammar[0].modelExample).toEqual(draft.studioContent.grammar[0].modelExample);
  expect(lesson.lesson.wordIds).toEqual(LESSON_BY_ID.get(draft.lessonId)!.wordIds);
  expect(lesson.lesson.prerequisiteIds).toEqual(LESSON_BY_ID.get(draft.lessonId)!.prerequisiteIds);
});
