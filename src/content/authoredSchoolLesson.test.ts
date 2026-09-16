import { describe, expect, it } from 'vitest';
import draft from '../../content/drafts/thien-lo-professional-1-v2.json';
import review from '../../content/review/thien-lo-professional-1-v2-local.json';
import { canonicalStudioJson, studioSha256, validateStudioContent } from './studioContent';
import { parsePublishedStudioLessons } from './publishedStudioLessons';
import { LESSON_BY_ID } from '../data/curriculum';

describe('reviewed authored school lesson',()=>{
  it('binds its review to the manuscript and survives the published lesson projection',async()=>{
    expect(await studioSha256(canonicalStudioJson(draft.studioContent))).toBe(review.sourceContentSha256);
    const content={...draft.studioContent,review:{humanReviewed:false,aiSelfReview:review.aiSelfReview}};
    const checked=await validateStudioContent('lesson',content);
    expect(checked.result.errors).toEqual([]);
    const projected=parsePublishedStudioLessons({schemaVersion:1,policy:'published-only',releaseBoundary:'content-release-worker-v1',items:[{stableKey:'thien-lo-v2-professional-1',itemType:'lesson',level:'hsk1',title:draft.title,revision:1,revisionId:'school-reviewed-fixture',schemaVersion:1,contentSha256:checked.result.contentSha256,publishedAt:Date.now(),content}]}).get(draft.lessonId)!;
    expect(projected.richContent.lessonPages).toEqual(draft.lessonPages);
    const base=LESSON_BY_ID.get(draft.lessonId)!;
    expect(projected.lesson.id).toBe(base.id);
    expect(projected.lesson.wordIds).toEqual(base.wordIds);
    expect(projected.lesson.prerequisiteIds).toEqual(base.prerequisiteIds);
    expect(projected.lesson.skills).toEqual(base.skills);
  });
});
