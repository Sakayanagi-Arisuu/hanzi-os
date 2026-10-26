import { LocalHistoryReadBatch } from './localHistoryReadBatch';
import {createReviewHistoryEvent,guestReviewHistoryEvent,reviewHistoryIsUsable} from '../learning/reviewHistory';
import {isLessonHistoryEvent,LESSON_HISTORY_ENTRY_PREFIX,projectLessonHistoryCooperatively,type LessonHistoryEventV1} from '../learning/lessonHistory';
import {parseReviewHistoryCommand,REVIEW_MODALITY} from '../learning/reviewProtocol';
import {type LearningCommandOutboxRecord} from './learningCommandOutbox';
import {readActiveOwnerLearningScope,StaleOwnerGenerationError,type ActiveOwnerLearningScope} from './indexedDb';
import {readAccountLessonHistoryPage,readLocalLessonHistory} from './lessonHistory';

export function commandReviewHistoryEvents(records:readonly LearningCommandOutboxRecord[]):LessonHistoryEventV1[]{
  return records.flatMap(entry=>{
    if(entry.kind!=='review-grade')return [];
    const command=parseReviewHistoryCommand(entry.command);
    if(!command||entry.outboxVersion!==1||!['pending','acknowledged','quarantined'].includes(entry.status)
      ||entry.deviceSequence!==entry.command.deviceSequence||entry.commandId!==entry.command.idempotencyKey||entry.resetEpoch!==entry.command.resetEpoch)throw new Error('Unreadable review command; retain journal.');
    const receipt=entry.status==='acknowledged'?entry.receipt:null;
    if(entry.status==='acknowledged'&&(!receipt||receipt.idempotencyKey!==command.idempotencyKey||receipt.resetEpoch!==command.resetEpoch
      ||receipt.cardId!==command.cardId||receipt.wordId!==command.wordId||receipt.wordVersion!==command.wordVersion
      ||receipt.rating!==command.rating||receipt.previousCardRevision!==command.expectedCardRevision
      ||receipt.cardRevision!==command.expectedCardRevision+1||receipt.schedulerVersion!==command.schedulerVersion
      ||receipt.contentVersion!==command.contentVersion||receipt.verification!=='server-scheduled-self-rating'||receipt.masteryEligible!==false))throw new Error('Review receipt conflict; retain journal.');
    const event=createReviewHistoryEvent({ownerKey:entry.ownerKey,resetEpoch:entry.resetEpoch,operationId:command.idempotencyKey,
      contentVersion:command.contentVersion,activityVersion:command.wordVersion,occurredAt:command.historyContext?.occurredAt??receipt?.reviewedAt??null,
      context:command.historyContext,sourceRecordRef:entry.recordKey,details:{cardId:command.cardId,wordId:command.wordId,wordVersion:command.wordVersion,
        cardRevision:command.expectedCardRevision,nextCardRevision:receipt?.cardRevision??null,schedulerVersion:command.schedulerVersion,rating:command.rating,
        ratingKind:'self-reported',reviewModality:REVIEW_MODALITY,scheduledAt:receipt?.scheduledAt??null,nextDueAt:receipt?.nextDueAt??null,reportedDurationMs:command.durationMs??null}});
    return [{...event,installationId:command.installationId,deviceId:command.deviceId,
      clockSource:!command.historyContext&&receipt?'server-received':event.clockSource,receivedAt:receipt?.reviewedAt??null,
      authority:receipt?'server-recorded':'unknown',confirmationState:receipt?'confirmed':entry.status==='quarantined'?'quarantined':'provisional',receiptRef:receipt?.reviewLogId??null}];
  });
}

export async function readLocalReviewHistory(scope:ActiveOwnerLearningScope,batch=new LocalHistoryReadBatch(scope)){
  const [snapshots,commands,state]=await Promise.all([batch.resumes(scope),batch.commands(scope),batch.state(scope)]);
  const events:LessonHistoryEventV1[]=[];
  for(const entry of snapshots){
    if(!entry.entryKey.startsWith(LESSON_HISTORY_ENTRY_PREFIX))continue;
    if(!isLessonHistoryEvent(entry.value))throw new Error('Unreadable history; retain raw journal.');
    if(reviewHistoryIsUsable(entry.value))events.push(entry.value);
  }
  if(scope.ownerGeneration.ownerKey.startsWith('anonymous:')&&state){
    if(state.schemaVersion!==2||!Array.isArray(state.evidence))throw new Error('Unsupported review business state; retain raw data.');
    const eventIds = new Set(events.map(event => event.eventId));
    for(const evidence of state.evidence)if(evidence.source==='review'&&evidence.method==='fsrs-rating'){
      const event=guestReviewHistoryEvent({ownerKey:scope.ownerGeneration.ownerKey,resetEpoch:scope.resetEpoch,evidence});
      if(!eventIds.has(event.eventId)){ eventIds.add(event.eventId); events.push(event); }
    }
  }
  events.push(...commandReviewHistoryEvents(commands.filter(entry=>entry.resetEpoch===scope.resetEpoch)));
  const projected=await projectLessonHistoryCooperatively({ownerKey:scope.ownerGeneration.ownerKey,resetEpoch:scope.resetEpoch},events);
  const active=await readActiveOwnerLearningScope();
  if(!active||active.resetEpoch!==scope.resetEpoch||active.ownerGeneration.ownerKey!==scope.ownerGeneration.ownerKey||active.ownerGeneration.generation!==scope.ownerGeneration.generation)throw new StaleOwnerGenerationError();
  return projected;
}

export async function readLocalLearningHistory(scope:ActiveOwnerLearningScope){
  const { readLocalActivityHistory } = await import('./activityHistory');
  const batch = new LocalHistoryReadBatch(scope);
  const projected = await projectLessonHistoryCooperatively({ownerKey:scope.ownerGeneration.ownerKey,resetEpoch:scope.resetEpoch},[
    ...await readLocalLessonHistory(scope,batch),...await readLocalReviewHistory(scope,batch),...await readLocalActivityHistory(scope,batch)]);
  await batch.assertCurrent(scope);
  return projected;
}
export async function readAccountReviewHistoryPage(scope:ActiveOwnerLearningScope,options:Parameters<typeof readAccountLessonHistoryPage>[1]={}){
  const page=await readAccountLessonHistoryPage(scope,{...options,source:'review'});
  if(!page.events.every(reviewHistoryIsUsable))throw new Error('Unexpected review history source; retain local records.');
  return page;
}
