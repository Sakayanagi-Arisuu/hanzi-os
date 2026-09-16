/** Local reading snapshot only. Never a server-verified or independent mastery claim. */
import {isLessonPageBinding,type LessonPageBinding} from './lessonPageBinding';
export type LessonPageFirstAttempt = {
 version:1;
 text:string;
 answerIds:string[];
 occurredAt:string;
 usedHint:boolean;
 priorFeedback:boolean;
 priorReveal:boolean;
 binding?:LessonPageBinding;
};
export function isLessonPageFirstAttempt(value:unknown):value is LessonPageFirstAttempt {
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const v=value as Record<string,unknown>;
 return (v.binding===undefined||isLessonPageBinding(v.binding))&&v.version===1&&typeof v.text==='string'&&v.text.length<=12000
  &&Array.isArray(v.answerIds)&&v.answerIds.length<=30&&v.answerIds.every(id=>typeof id==='string')
  &&typeof v.occurredAt==='string'&&Number.isFinite(Date.parse(v.occurredAt))
  &&typeof v.usedHint==='boolean'&&typeof v.priorFeedback==='boolean'&&typeof v.priorReveal==='boolean';
}
export function captureLessonPageFirstAttempt<T extends {text:string;answerIds?:string[];usedHint?:boolean;everChecked?:boolean;compared:boolean;everRevealed?:boolean;revealed:boolean;firstAttempt?:LessonPageFirstAttempt}>(draft:T,occurredAt:string):T&{firstAttempt:LessonPageFirstAttempt} {
 return {...draft,firstAttempt:draft.firstAttempt??{
  version:1,text:draft.text,answerIds:[...(draft.answerIds??[])],occurredAt,
  usedHint:!!draft.usedHint,priorFeedback:!!(draft.everChecked||draft.compared),
  priorReveal:!!(draft.everRevealed||draft.revealed),
 }};
}
