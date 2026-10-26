import {expect,it} from 'vitest';
import {createReviewHistoryEvent,guestReviewHistoryEvent,reviewPersonalizationInput} from './reviewHistory';
import {isLessonHistoryEvent,projectLessonHistory} from './lessonHistory';
import {reviewQueueCanComplete} from './reviewSessionStatus';
import {countReviewsToday} from './reviewPresentation';
import {localAnalyticsActivity} from './analyticsActivity';
import type {LearningEvidence} from '../types';

const evidence:LearningEvidence={id:'old-review-record',idempotencyKey:'first',schemaVersion:1,contentVersion:'frozen-content',
  activityVersion:'frozen-fsrs-v1',source:'review',method:'fsrs-rating',activityId:'review:word-one',skill:'vocabulary',
  outcome:'incorrect',score:null,verified:false,masteryEligible:false,occurredAt:'2026-10-18T03:00:00.000Z',metadata:{rating:1,usedHint:true}};
const scope={ownerKey:'anonymous:fixture',resetEpoch:0};
it('keeps self-rating separate from correctness, with honest unknown legacy version and assistance',()=>{
  const event=guestReviewHistoryEvent({...scope,evidence});
  expect(event).toMatchObject({module:'review',sourceType:'fsrs-review-grade',outcome:'self-review',score:null,masteryEligible:false,
    review:{rating:1,ratingKind:'self-reported',cardId:'word-one',wordVersion:null,reviewModality:null,schedulerVersion:null},assistance:{hint:true,reveal:null,tts:null}});
  expect(isLessonHistoryEvent(event)).toBe(true);
  expect(isLessonHistoryEvent({...event,outcome:'correct',score:100})).toBe(false);
  expect(isLessonHistoryEvent({...event,authority:'server-verified',confirmationState:'confirmed',receiptRef:'fake'})).toBe(false);
  const old=guestReviewHistoryEvent({...scope,evidence:{...evidence,occurredAt:'unknown',metadata:undefined}});
  expect(old).toMatchObject({occurredAt:null,clockSource:'unknown',review:{rating:null,wordVersion:null}});
});
it('reconciles one operation while retaining a new review of the same item and safe personalization input',()=>{
  const first=guestReviewHistoryEvent({...scope,evidence});
  const second=guestReviewHistoryEvent({...scope,evidence:{...evidence,id:'second-record',idempotencyKey:'second'}});
  expect(projectLessonHistory(scope,[first,first,second])).toHaveLength(2);
  const pending=createReviewHistoryEvent({...scope,operationId:'account-operation',contentVersion:'frozen-content',activityVersion:'word-v1',
    occurredAt:null,sourceRecordRef:'command',details:{...first.review!,cardId:'server-card',wordVersion:'word-v1',cardRevision:3}});
  const confirmed={...pending,authority:'server-recorded' as const,confirmationState:'confirmed' as const,receiptRef:'server-log',receivedAt:'2026-10-18T04:00:00Z'};
  expect(projectLessonHistory(scope,[pending,confirmed,pending])).toEqual([confirmed]);
  expect(()=>projectLessonHistory(scope,[pending,{...confirmed,review:{...confirmed.review!,rating:4}}])).toThrow('Conflicting');
  const input=reviewPersonalizationInput(scope,[first,pending,{...second,confirmationState:'quarantined'}]);
  expect(input.map(entry=>entry.disposition).sort()).toEqual(['committed','pending','rejected']);
  expect(input.every(entry=>entry.correctness==='unknown'&&!entry.masteryEligible)).toBe(true);
});
it('does not inflate review counts/days from duplicate records or close a queue with pending/rejected work',()=>{
  expect(countReviewsToday([evidence,evidence,{...evidence,idempotencyKey:'second'}],new Date(evidence.occurredAt))).toBe(2);
  expect(localAnalyticsActivity([evidence,evidence]).days).toEqual([{day:'2026-10-18',count:1}]);
  for(const records of [null,[{status:'pending'}],[{status:'quarantined'}],[{status:'acknowledged'},{status:'pending'}]])
    expect(reviewQueueCanComplete({networkVerified:true,availableCount:0,records})).toBe(false);
  expect(reviewQueueCanComplete({networkVerified:false,availableCount:0,records:[]})).toBe(false);
  expect(reviewQueueCanComplete({networkVerified:true,availableCount:1,records:[]})).toBe(false);
  expect(reviewQueueCanComplete({networkVerified:true,availableCount:0,records:[{status:'acknowledged'}]})).toBe(true);
});
