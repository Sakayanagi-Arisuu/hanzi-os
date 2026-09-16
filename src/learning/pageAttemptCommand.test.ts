import {expect,it} from 'vitest';
import {deriveAccountKey} from '../lib/accountKey';
import {matchPageAttemptReceipt,preparePageAttemptCommand} from './pageAttemptCommand';
import type {LessonPageFirstAttempt} from './lessonPageAttempt';
const firstAttempt:LessonPageFirstAttempt={version:1,text:'在',answerIds:[],occurredAt:'2026-09-14T10:00:00Z',usedHint:true,priorFeedback:false,priorReveal:false,binding:{pageId:'p',blockId:'b',revisionId:'revision',activityId:'lesson-page:["boot-1","p","b"]',activityVersion:`lesson-page-v1:sha256:${'a'.repeat(64)}`}};
const input=async()=>({ownerKey:await deriveAccountKey('a'),resetEpoch:0,lessonId:'boot-1',pageId:'p',blockId:'b',firstAttempt:structuredClone(firstAttempt)});
it('rebuilds the identical retry command after reload and detaches its answer data',async()=>{
 const source=await input(),command=await preparePageAttemptCommand(source);
 expect(command).not.toBeNull();
 expect(await preparePageAttemptCommand(JSON.parse(JSON.stringify(source)))).toEqual(command);
 source.firstAttempt.answerIds.push('changed');source.firstAttempt.text='changed';
 expect(command?.response).toEqual({text:'在',answerIds:[],usedHint:true,priorFeedback:false,priorReveal:false});
});
it('keeps keys distinct across owners, resets, activities and first-response times',async()=>{
 const source=await input(),original=await preparePageAttemptCommand(source);
 for(const changed of [{...source,ownerKey:await deriveAccountKey('b')},{...source,resetEpoch:1},{...source,firstAttempt:{...source.firstAttempt,occurredAt:'2026-09-15T10:00:00Z'}}]){
  expect((await preparePageAttemptCommand(changed))?.idempotencyKey).not.toBe(original?.idempotencyKey);
 }
});
it('does not manufacture a binding for guests, old snapshots or a mismatched lesson/page/block',async()=>{
 const source=await input();
 for(const changed of [{...source,ownerKey:'guest'},{...source,resetEpoch:-1},{...source,lessonId:'boot-2'},{...source,pageId:'other'},{...source,blockId:'other'},{...source,firstAttempt:{...source.firstAttempt,binding:undefined}},{...source,firstAttempt:{...source.firstAttempt,text:''}}]){
  expect(await preparePageAttemptCommand(changed)).toBeNull();
 }
});
it('only acknowledges a receipt bound to the exact pending command',async()=>{
 const command=(await preparePageAttemptCommand(await input()))!;
 const receipt={version:1,attemptId:'server-id',idempotencyKey:command.idempotencyKey,resetEpoch:command.resetEpoch,activityId:command.activityId,activityVersion:command.activityVersion,outcome:'correct',duplicate:false,masteryEligible:false};
 expect(matchPageAttemptReceipt(receipt,command)).toBe(true);
 for(const patch of [{idempotencyKey:'other'},{resetEpoch:1},{activityId:'other'},{activityVersion:'other'},{masteryEligible:true},{attemptId:''},{outcome:'mastered'}])expect(matchPageAttemptReceipt({...receipt,...patch},command)).toBe(false);
 expect(matchPageAttemptReceipt({ok:true},command)).toBe(false);
});
