import { createLessonHistoryEvent, isLessonHistoryEvent, projectLessonHistory, type LessonHistoryEventV1 } from './lessonHistory';
import { evaluateLessonActivity } from './lessonActivities';
import { lessonPageDocumentHash } from './lessonPageBinding';
import { parsePageAttemptCommand, preparePageAttemptCommand, type PageAttemptCommand, type PageObservation } from './pageAttemptCommand';
import { sha256Hex } from '../sync/canonicalHash';
import {parseLessonReadingSession,type LessonReadingSession} from './lessonReadingSession';

export type ReadingObservation = {pageId:string;blockId:string;action:PageObservation['action'];occurredAt:string};
export type PageHistoryRecord = {command:PageAttemptCommand;event:LessonHistoryEventV1};

export function pageCommandHistoryEvent(ownerKey:string, command:PageAttemptCommand):LessonHistoryEventV1 {
  const observation=command.observation;
  const timeKnown=observation?.timeKnown!==false&&Number.isFinite(Date.parse(command.occurredAt));
  const base=createLessonHistoryEvent({ownerKey,resetEpoch:command.resetEpoch,operationId:command.idempotencyKey,
    lessonId:command.lessonId,contentVersion:observation?.contentVersion??command.activityVersion,
    activityId:command.activityId,activityVersion:command.activityVersion,method:'reading-comprehension',occurredAt:command.occurredAt});
  return {...base,sourceType:'lesson-page',taskType:observation
    ? observation.action==='first-response'?(observation.activityType&&observation.activityType!=='rubric'?'page-objective':'page-self-review'):['view','tts','audio'].includes(observation.action)?'page-exposure':'page-support'
    :'page-objective',contextRef:observation?JSON.stringify([observation.pageId,observation.blockId,observation.action]):command.activityId,
    occurredAt:timeKnown?command.occurredAt:null,clockSource:timeKnown?'device-reported':'unknown',
    modality:observation&&['tts','audio'].includes(observation.action)?'audio':'text',
    assistance:{...base.assistance,hint:command.response.usedHint,reveal:command.response.priorReveal,
      priorExposure:command.response.priorFeedback||command.response.priorReveal,
      tts:observation?.action==='tts'?true:null,pinyin:observation?.action==='pinyin'?true:null,
      translation:observation?.action==='translation'?true:null},
    firstResponseRef:observation&&observation.action!=='first-response'?null:command.idempotencyKey,
    outcome:observation?.action==='first-response'&&(!observation.activityType||observation.activityType==='rubric')?'self-review':'unknown'};
}

export function validatePageHistory(records:unknown,ownerKey:string,resetEpoch:number):PageHistoryRecord[] {
  if(records===undefined)return [];
  if(!Array.isArray(records))throw new Error('Unreadable page history; retain source.');
  for(const record of records){
    if(!record||!parsePageAttemptCommand(record.command)||!isLessonHistoryEvent(record.event)
      ||record.command.resetEpoch!==resetEpoch||record.event.ownerKey!==ownerKey||record.event.resetEpoch!==resetEpoch
      ||record.event.sourceType!=='lesson-page'||record.event.operationId!==record.command.idempotencyKey
      ||record.event.itemId!==record.command.activityId||record.event.activityVersion!==record.command.activityVersion
      ||record.event.sourceId!==record.command.lessonId)throw new Error('Invalid page history; retain source.');
  }
  projectLessonHistory({ownerKey,resetEpoch},records.map(record=>record.event));
  return records;
}

export async function readingPageHistory(ownerKey:string,resetEpoch:number,snapshot:LessonReadingSession):Promise<PageHistoryRecord[]> {
  if(!parseLessonReadingSession(snapshot,snapshot.lessonId))throw new Error('Unreadable reading source; retain snapshot.');
  const records=[...validatePageHistory(snapshot.pageHistory,ownerKey,resetEpoch)];
  const contentVersion=`lesson-page-document-v1:sha256:${await lessonPageDocumentHash(snapshot.document)}`;
  for(const page of snapshot.document.pages)for(const block of page.blocks){
    const draft=snapshot.drafts[block.id];
    const first=draft?.firstAttempt;
    const observations=(snapshot.observations??[]).filter(entry=>entry.pageId===page.id&&entry.blockId===block.id);
    if(first)observations.push({pageId:page.id,blockId:block.id,action:'first-response',occurredAt:first.occurredAt});
    else if(snapshot.pageHistory===undefined&&snapshot.observations===undefined&&(draft?.text.trim()||draft?.answerIds?.length))observations.push({pageId:page.id,blockId:block.id,action:'first-response',occurredAt:''});
    for(const [action,used] of [['hint',draft?.usedHint],['reveal',draft?.everRevealed],['pinyin',draft?.showPinyin]] as const){
      if(used&&snapshot.observations===undefined&&!observations.some(entry=>entry.action===action))observations.push({pageId:page.id,blockId:block.id,action,occurredAt:''});
    }
    for(const observation of observations){
      const isFirst=observation.action==='first-response';
      let command=isFirst&&first&&block.kind==='activity'
        ? await preparePageAttemptCommand({ownerKey,resetEpoch,lessonId:snapshot.lessonId,pageId:page.id,blockId:block.id,firstAttempt:first}):null;
      if(!command){
        const response=isFirst?{text:first?.text??draft?.text??'',answerIds:first?.answerIds??draft?.answerIds??[],
          usedHint:first?.usedHint??draft?.usedHint??false,priorFeedback:first?.priorFeedback??draft?.everChecked??false,
          priorReveal:first?.priorReveal??draft?.everRevealed??false}:{text:'',answerIds:[],usedHint:observation.action==='hint',priorFeedback:false,priorReveal:observation.action==='reveal'};
        const descriptor:PageObservation={version:1,contentVersion,pageId:page.id,blockId:block.id,blockKind:block.kind,
          ...(block.activity&&(!isFirst||first)?{activityType:block.activity.type}:{}),action:observation.action,timeKnown:!!observation.occurredAt};
        const identity=[ownerKey,resetEpoch,snapshot.lessonId,contentVersion,page.id,block.id,observation.action,
          ...(isFirst&&first?[first]:[])];
        command={version:1,idempotencyKey:`page-practice-v1:${await sha256Hex(identity)}`,resetEpoch,lessonId:snapshot.lessonId,
          activityId:`lesson-page:${JSON.stringify([snapshot.lessonId,page.id,block.id])}`,activityVersion:contentVersion,
          occurredAt:observation.occurredAt||'unknown',response,observation:descriptor};
      }
      if(records.some(record=>record.command.idempotencyKey===command.idempotencyKey))continue;
      let event=pageCommandHistoryEvent(ownerKey,command);
      const objective=isFirst&&!!first&&block.kind==='activity'&&block.activity?.type!=='rubric';
      const outcome=objective&&first&&block.activity?evaluateLessonActivity(block.activity,first):isFirst?'self-review':'unknown';
      event={...event,taskType:objective?'page-objective':event.taskType,sourceRecordRef:`lesson-reading:${snapshot.lessonId}:${command.idempotencyKey}`,
        firstResponseRef:isFirst?command.idempotencyKey:null,lineage:'guest-business-commit',authority:'local-practice',
        outcome,score:outcome==='correct'?100:outcome==='incorrect'?0:null,revisionId:first?.binding?.revisionId??null};
      if(/^siwc_[a-f0-9]{64}$/.test(ownerKey))event={...event,taskType:isFirst&&block.activity?.type==='rubric'?'page-self-review':pageCommandHistoryEvent(ownerKey,command).taskType,
        outcome:pageCommandHistoryEvent(ownerKey,command).outcome,score:null,authority:'unknown',lineage:'command-journal',sourceRecordRef:command.idempotencyKey};
      records.push({command,event});
    }
  }
  validatePageHistory(records,ownerKey,resetEpoch);
  return records;
}
