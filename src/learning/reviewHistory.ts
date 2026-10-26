import {createLessonHistoryEvent,isLessonHistoryEvent,lessonHistoryEventId,projectLessonHistory,type LessonHistoryEventV1,type ReviewHistoryDetails} from './lessonHistory';
import {REVIEW_MODALITY,type ReviewHistoryContextV1} from './reviewProtocol';
import type {LearningEvidence} from '../types';

export function createReviewHistoryEvent(input:{ownerKey:string;resetEpoch:number;operationId:string;contentVersion:string;
  activityVersion:string;occurredAt:string|null;sourceRecordRef:string;details:ReviewHistoryDetails;context?:ReviewHistoryContextV1}):LessonHistoryEventV1 {
  const base=createLessonHistoryEvent({...input,lessonId:input.details.wordId,activityId:`review:${input.details.wordId}`,method:'fsrs-rating',occurredAt:input.occurredAt??''});
  const eventId=lessonHistoryEventId(input.ownerKey,input.resetEpoch,input.operationId,'fsrs-review-grade');
  return {...base,eventId,logicalActivityId:eventId,module:'review',sourceType:'fsrs-review-grade',sourceLessonIds:[],
    review:input.details,contextRef:input.details.cardId,itemId:input.details.wordId,firstResponseRef:null,
    outcome:'self-review',score:null,skill:null,occurredAt:input.occurredAt,clockSource:input.occurredAt?'device-reported':'unknown',
    sourceRecordRef:input.sourceRecordRef,assistance:{...base.assistance,hint:input.context?.hint??null,reveal:input.context?.reveal??null}};
}

export function guestReviewHistoryEvent(input:{ownerKey:string;resetEpoch:number;evidence:LearningEvidence;installationId?:string;deviceId?:string}):LessonHistoryEventV1 {
  const {evidence}=input,metadata=evidence.metadata;
  if(evidence.source!=='review'||evidence.method!=='fsrs-rating'||!evidence.activityId.startsWith('review:'))throw new Error('Review source is not an FSRS grade; retain record.');
  const wordId=evidence.activityId.slice('review:'.length);
  if(!wordId)throw new Error('Review item is missing; retain record.');
  const text=(key:string)=>typeof metadata?.[key]==='string'?String(metadata[key]):null;
  const rating=typeof metadata?.rating==='number'&&[1,2,3,4].includes(metadata.rating)?metadata.rating as 1|2|3|4:null;
  const occurredAt=Number.isFinite(Date.parse(evidence.occurredAt))?evidence.occurredAt:null;
  const event=createReviewHistoryEvent({...input,operationId:evidence.idempotencyKey,contentVersion:evidence.contentVersion,
    activityVersion:evidence.activityVersion,occurredAt,sourceRecordRef:evidence.id,details:{cardId:wordId,wordId,wordVersion:text('wordVersion'),
      cardRevision:null,nextCardRevision:null,schedulerVersion:text('schedulerVersion'),rating,ratingKind:'self-reported',
      reviewModality:text('reviewModality'),scheduledAt:null,nextDueAt:text('nextDueAt'),reportedDurationMs:null}});
  return {...event,lineage:'guest-business-commit',authority:'local-practice',installationId:input.installationId??null,deviceId:input.deviceId??null,
    assistance:{...event.assistance,hint:typeof metadata?.usedHint==='boolean'?metadata.usedHint:null,
      reveal:typeof metadata?.revealed==='boolean'?metadata.revealed:null}};
}

export function reviewPersonalizationInput(scope:{ownerKey:string;resetEpoch:number},events:readonly LessonHistoryEventV1[]){
  return projectLessonHistory(scope,events).filter(event=>event.sourceType==='fsrs-review-grade').map(event=>({
    eventId:event.eventId,itemId:event.itemId,contentVersion:event.contentVersion,review:event.review!,occurredAt:event.occurredAt,
    assistance:event.assistance,sourceRecordRef:event.sourceRecordRef,lineage:event.lineage,
    disposition:event.confirmationState==='quarantined'?'rejected':event.confirmationState==='confirmed'||event.authority==='local-practice'?'committed':'pending',
    correctness:'unknown' as const,masteryEligible:false as const,
  }));
}

export const reviewHistoryIsUsable=(event:LessonHistoryEventV1)=>isLessonHistoryEvent(event)&&event.sourceType==='fsrs-review-grade';
export const LOCAL_REVIEW_MODALITY=REVIEW_MODALITY;
