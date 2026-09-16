import {expect,it} from 'vitest';
import draft from '../../content/drafts/thien-lo-everyday-batch-v2.json';
import {LESSON_BY_ID} from '../data/curriculum';
import {validateLessonPages,type LessonPageDocument} from '../learning/lessonPages';
import {validateStudioContent} from './studioContent';
import {parsePublishedStudioLessons} from './publishedStudioLessons';
import {canonicalStudioJson,studioSha256} from './studioContent';
import review from '../../content/review/thien-lo-everyday-batch-v2-local.json';

it('preserves all ten lesson identities and projects every edited page through publication',async()=>{
 expect(draft.items).toHaveLength(10);
 expect(new Set(draft.items.map(i=>i.lessonId)).size).toBe(10);
 expect(review.items.map(i=>i.lessonId)).toEqual(draft.items.map(i=>i.lessonId));
 for(const item of draft.items){
  const core=LESSON_BY_ID.get(item.lessonId)!;
  expect(item.studioContent.vocabulary).toEqual(core.wordIds);
  expect(item.studioContent.prerequisites).toEqual(core.prerequisiteIds);
  expect(item.studioContent.skills).toEqual(core.skills);
  expect(validateLessonPages(item.lessonPages),item.lessonId).toEqual([]);
  const unreviewed=await validateStudioContent('lesson',item.studioContent);
  expect(unreviewed.result.errors.map(e=>e.path)).toEqual(['review.aiSelfReview']);
  const assessment=review.items.find(r=>r.lessonId===item.lessonId)!;
  expect(assessment.sourceContentSha256).toBe(await studioSha256(canonicalStudioJson(item.studioContent)));
  const content={...item.studioContent,review:{humanReviewed:false,aiSelfReview:assessment.aiSelfReview}};
  const validation=await validateStudioContent('lesson',content);
  expect(validation.result.errors,item.lessonId).toEqual([]);
  const projected=parsePublishedStudioLessons({schemaVersion:1,policy:'published-only',releaseBoundary:'content-release-worker-v1',items:[{stableKey:`thien-lo-v2-${item.lessonId}`,itemType:'lesson',level:item.level,title:item.title,revision:1,revisionId:`test-${item.lessonId}`,schemaVersion:1,contentSha256:validation.result.contentSha256,publishedAt:1,content}]});
  expect(projected.get(item.lessonId)?.richContent.lessonPages).toEqual(item.lessonPages);
 }
});

it('keeps price, calendar, duration and spatial facts consistent with the taught task',()=>{
 const item=(id:string)=>draft.items.find(i=>i.lessonId===id)!;
 expect(item('daily-3').studioContent.exercises[0].answer).toBe('找你十块。');
 expect(item('hsk1-time-place-events-02-calendar').studioContent.exercises[0].answer).toBe('五月九号');
 expect(item('hsk1-time-place-events-04-clock-and-duration').studioContent.exercises[0].answer).toBe('一个小时');
 const map=(item('hsk1-time-place-events-05-location').lessonPages as unknown as LessonPageDocument).pages.flatMap(p=>p.blocks).find(b=>b.kind==='diagram')!.diagram!;
 expect(map.type).toBe('map');
 expect(map.nodes.map(n=>[n.label,n.y])).toEqual([['书',0],['桌子',1],['猫',2]]);
 for(const i of draft.items){
  const exercise=i.studioContent.exercises[0];
  expect(exercise.answer).toMatch(/\p{Script=Han}/u);
  expect(exercise.distractors.every(d=>/\p{Script=Han}/u.test(d))).toBe(true);
 }
});
