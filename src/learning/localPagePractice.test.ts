import {expect,it} from 'vitest';
import {withLocalPagePractice} from './localPagePractice';
import {localAnalyticsActivity} from './analyticsActivity';
import {emptyLessonBlock} from './lessonPages';
import {emptyLessonActivity} from './lessonActivities';
import type {LessonReadingSession} from './lessonReadingSession';
const snapshot:LessonReadingSession={version:1,lessonId:'boot-1',index:0,showTranscript:false,document:{version:1,pages:[{id:'p',title:'Trang',layout:'focus',blocks:[{...emptyLessonBlock('b'),kind:'activity',body:'Điền chữ chỉ vị trí',activity:{...emptyLessonActivity(),type:'cloze',explanation:'在 chỉ vị trí.',acceptedAnswers:['在']}}]}]},drafts:{b:{text:'在',revealed:false,compared:true,firstAttempt:{version:1,text:'wrong',answerIds:[],occurredAt:'2026-09-14T17:00:00Z',usedHint:true,priorFeedback:false,priorReveal:false}}}};
it('counts the saved first answer against pinned content without skill evidence or duplicate archived snapshots',()=>{
 const base=localAnalyticsActivity([]),result=withLocalPagePractice(base,[snapshot,structuredClone(snapshot),{version:1,entries:{}}]);
 expect(result.pagePractice).toEqual({attempts:1,unique:1,correct:0,incorrect:1,selfReview:0});
 expect(result.days).toEqual([{day:'2026-09-15',count:1}]);expect(result.skills).toEqual(base.skills);
});
it('keeps repeat encounters distinct but preserves unique activity coverage and rejects invalid snapshots',()=>{
 const another=structuredClone(snapshot);another.drafts.b.firstAttempt!.occurredAt='2026-09-16T10:00:00Z';another.drafts.b.firstAttempt!.text='在';
 const result=withLocalPagePractice(localAnalyticsActivity([]),[snapshot,another,{...snapshot,version:99},null]);
 expect(result.pagePractice).toEqual({attempts:2,unique:1,correct:1,incorrect:1,selfReview:0});
});
