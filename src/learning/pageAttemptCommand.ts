import {isValidLearningResetEpoch} from './resetEpoch';
import {isLessonPageFirstAttempt,type LessonPageFirstAttempt} from './lessonPageAttempt';
import {sha256Hex} from '../sync/canonicalHash';
export type PageObservation = {version:1;contentVersion:string;pageId:string;blockId:string;blockKind:string;activityType?:'choice'|'order'|'cloze'|'rubric';action:'first-response'|'view'|'hint'|'reveal'|'pinyin'|'translation'|'tts'|'audio';timeKnown:boolean};
export function isPageObservation(value:unknown):value is PageObservation {
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const entry=value as Record<string,unknown>;
 return entry.version===1&&/^lesson-page-document-v1:sha256:[a-f0-9]{64}$/.test(String(entry.contentVersion))
  &&['pageId','blockId','blockKind'].every(key=>typeof entry[key]==='string'&&String(entry[key]).length>0&&String(entry[key]).length<=2000)
  &&['activity','reflection','dictation','reading','audio','dialogue','image','diagram','explanation'].includes(String(entry.blockKind))
  &&['first-response','view','hint','reveal','pinyin','translation','tts','audio'].includes(String(entry.action))&&typeof entry.timeKnown==='boolean'
  &&(entry.activityType===undefined||(entry.blockKind==='activity'&&['choice','order','cloze','rubric'].includes(String(entry.activityType))))
  &&Object.keys(entry).every(key=>['version','contentVersion','pageId','blockId','blockKind','activityType','action','timeKnown'].includes(key));
}
export type PageAttemptCommand={version:1;idempotencyKey:string;resetEpoch:number;lessonId:string;activityId:string;activityVersion:string;occurredAt:string;response:{text:string;answerIds:string[];usedHint:boolean;priorFeedback:boolean;priorReveal:boolean};observation?:PageObservation};
export function parsePageAttemptCommand(value:unknown):PageAttemptCommand|null{
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const v=value as Record<string,unknown>,r=v.response as Record<string,unknown>|undefined;
 const bounded=(s:unknown,max:number)=>typeof s==='string'&&s.length>0&&s.length<=max;
 if(v.version!==1||!isValidLearningResetEpoch(v.resetEpoch)||!bounded(v.idempotencyKey,160)||!bounded(v.lessonId,240)||!bounded(v.activityId,2000)||!bounded(v.activityVersion,160)||!bounded(v.occurredAt,40)||(!Number.isFinite(Date.parse(String(v.occurredAt)))&&!(v.occurredAt==='unknown'&&isPageObservation(v.observation)&&!v.observation.timeKnown))||!r||Array.isArray(r)||typeof r!=='object')return null;
 if(typeof r.text!=='string'||r.text.length>12000||!Array.isArray(r.answerIds)||r.answerIds.length>30||r.answerIds.some(id=>!bounded(id,240))||['usedHint','priorFeedback','priorReveal'].some(key=>typeof r[key]!=='boolean'))return null;
 if(v.observation!==undefined&&!isPageObservation(v.observation))return null;
 if(Object.keys(v).some(k=>!['version','idempotencyKey','resetEpoch','lessonId','activityId','activityVersion','occurredAt','response','observation'].includes(k))||Object.keys(r).some(k=>!['text','answerIds','usedHint','priorFeedback','priorReveal'].includes(k)))return null;
 return structuredClone(value) as PageAttemptCommand;
}

/** Create once from the saved first response, never from the learner's corrected
 * draft. Reconstructing after reload produces the same owner-scoped retry key.
 */
export async function preparePageAttemptCommand(input:{ownerKey:string;resetEpoch:number;lessonId:string;pageId:string;blockId:string;firstAttempt:LessonPageFirstAttempt}):Promise<PageAttemptCommand|null>{
 const {ownerKey,resetEpoch,lessonId,pageId,blockId,firstAttempt}=input;
 if(!/^siwc_[a-f0-9]{64}$/.test(ownerKey)||!isValidLearningResetEpoch(resetEpoch)||!isLessonPageFirstAttempt(firstAttempt))return null;
 const binding=firstAttempt.binding;
 if(!binding||binding.pageId!==pageId||binding.blockId!==blockId||binding.activityId!==`lesson-page:${JSON.stringify([lessonId,pageId,blockId])}`)return null;
 const response={text:firstAttempt.text,answerIds:[...firstAttempt.answerIds],usedHint:firstAttempt.usedHint,priorFeedback:firstAttempt.priorFeedback,priorReveal:firstAttempt.priorReveal};
 if(!response.text.trim()&&!response.answerIds.length)return null;
 const fields={version:1 as const,resetEpoch,lessonId,activityId:binding.activityId,activityVersion:binding.activityVersion,occurredAt:firstAttempt.occurredAt,response};
 const idempotencyKey=`page-first-v1:${await sha256Hex([ownerKey,fields])}`;
 return parsePageAttemptCommand({...fields,idempotencyKey});
}

export type PageAttemptReceipt={version:1;attemptId:string;idempotencyKey:string;resetEpoch:number;activityId:string;activityVersion:string;outcome:'correct'|'incorrect'|'self-review';duplicate:boolean;masteryEligible:false};
/** A 2xx response alone must not remove a durable pending answer. */
export function matchPageAttemptReceipt(value:unknown,command:PageAttemptCommand):value is PageAttemptReceipt{
 if(!value||typeof value!=='object')return false;
 const r=value as Record<string,unknown>;
 return r.version===1&&typeof r.attemptId==='string'&&r.attemptId.length>0&&r.attemptId.length<=160
  &&r.idempotencyKey===command.idempotencyKey&&r.resetEpoch===command.resetEpoch
  &&r.activityId===command.activityId&&r.activityVersion===command.activityVersion
  &&(command.observation?r.outcome==='self-review':['correct','incorrect','self-review'].includes(String(r.outcome)))&&typeof r.duplicate==='boolean'&&r.masteryEligible===false;
}
