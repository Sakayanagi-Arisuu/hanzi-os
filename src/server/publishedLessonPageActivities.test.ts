import {expect,it} from 'vitest';
import {publishedLessonPageActivities,checkPublishedPageActivity} from './publishedLessonPageActivities';
import {emptyLessonBlock} from '../learning/lessonPages';
import {emptyLessonActivity} from '../learning/lessonActivities';
const content=()=>({targetLessonId:'lesson',lessonPages:{version:1,pages:[{id:'page',title:'Học',layout:'focus',blocks:[{...emptyLessonBlock('model'),body:'Mẫu trước bài tập'},{...emptyLessonBlock('question'),kind:'activity',body:'Điền chữ nghĩa là làm',activity:{...emptyLessonActivity(),type:'cloze',acceptedAnswers:['做','作'],explanation:'Theo nghĩa làm.'}}]}]}});
const manifest=()=>({schemaVersion:1,policy:'published-only',releaseBoundary:'content-release-worker-v1',items:[{schemaVersion:1,itemType:'lesson',level:'hsk1',stableKey:'lesson',title:'Bài học',revisionId:'revision-1',revision:1,contentSha256:'server-header',publishedAt:1,content:content()}]});
it('binds answers to published content and rejects unknown or stale versions',async()=>{
 const registry=await publishedLessonPageActivities(manifest());
 const entry=[...registry.values()][0];
 for(const text of ['做','作'])expect(checkPublishedPageActivity(registry,{...entry,text}).outcome).toBe('correct');
 expect(checkPublishedPageActivity(registry,{...entry,text:'坐'}).outcome).toBe('incorrect');
 expect(checkPublishedPageActivity(registry,{...entry,text:'做'}).masteryEligible).toBe(false);
 expect(()=>checkPublishedPageActivity(registry,{...entry,activityVersion:'old',text:'做'})).toThrow();
 expect(()=>checkPublishedPageActivity(registry,{...entry,activityId:'missing',text:'做'})).toThrow();
});
it('changes version when an earlier model changes and rejects duplicate lesson targets',async()=>{
 const original=manifest();
 const before=[...(await publishedLessonPageActivities(original)).values()][0];
 original.items[0].content.lessonPages.pages[0].blocks[0].body='Mẫu khác đã lộ đáp án';
 const after=[...(await publishedLessonPageActivities(original)).values()][0];
 expect(after.activityId).toBe(before.activityId);
 expect(after.activityVersion).not.toBe(before.activityVersion);
 await expect(publishedLessonPageActivities({...original,items:[...original.items,...original.items]})).rejects.toThrow('Ambiguous');
 await expect(publishedLessonPageActivities({...original,policy:'draft'})).rejects.toThrow();
});
it('never converts an open rubric into an objectively correct answer',async()=>{
 const m=manifest();
 const block=m.items[0].content.lessonPages.pages[0].blocks[1];
 block.activity={...emptyLessonActivity(),type:'rubric',rubric:[{id:'meaning',label:'Ý nghĩa',guidance:'Đối chiếu ý'}],explanation:'Mẫu: 对'};
 const registry=await publishedLessonPageActivities(m);
 const entry=[...registry.values()][0];
 expect(checkPublishedPageActivity(registry,{...entry,text:'对'})).toEqual({outcome:'self-review',explanation:'Mẫu: 对',masteryEligible:false});
});
