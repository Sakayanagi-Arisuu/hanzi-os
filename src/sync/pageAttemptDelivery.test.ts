import {expect,it,vi} from 'vitest';
import {deliverPageAttempt} from './pageAttemptDelivery';
import type {PageAttemptCommand} from '../learning/pageAttemptCommand';
const ownerKey=`siwc_${'a'.repeat(64)}`;
const command:PageAttemptCommand={version:1,idempotencyKey:'stable',resetEpoch:0,lessonId:'boot-1',activityId:'activity',activityVersion:'version',occurredAt:'2026-09-14T10:00:00Z',response:{text:'在',answerIds:[],usedHint:false,priorFeedback:false,priorReveal:false}};
const receipt={version:1,attemptId:'server',idempotencyKey:'stable',resetEpoch:0,activityId:'activity',activityVersion:'version',outcome:'correct',duplicate:true,masteryEligible:false};
it('retries identical payload after a lost acknowledgement and verifies the duplicate receipt',async()=>{
 const send=vi.fn<typeof fetch>().mockRejectedValueOnce(new TypeError('network lost')).mockResolvedValueOnce(Response.json(receipt));
 expect((await deliverPageAttempt({ownerKey,command},send)).status).toBe('pending');
 expect(await deliverPageAttempt({ownerKey,command},send)).toEqual({status:'acknowledged',receipt});
 expect(send.mock.calls[0][1]?.body).toBe(send.mock.calls[1][1]?.body);
 expect(send.mock.calls[0][1]?.headers).toMatchObject({'x-learning-owner':ownerKey});
});
it('retains work for expired login, throttling, malformed success and server outage',async()=>{
 for(const response of [new Response('',{status:401}),new Response('',{status:503}),Response.json({ok:true}),Response.json({...receipt,idempotencyKey:'other'}),new Response('not json',{status:200})]){
  expect((await deliverPageAttempt({ownerKey,command},vi.fn<typeof fetch>().mockResolvedValue(response))).status).toBe('pending');
 }
 expect(await deliverPageAttempt({ownerKey,command},vi.fn<typeof fetch>().mockResolvedValue(new Response('',{status:429,headers:{'retry-after':'75'}})))).toEqual({status:'pending',retryAfterSeconds:75});
});
it('surfaces permanent conflict without changing owner or command, and never sends guest work',async()=>{
 const send=vi.fn<typeof fetch>().mockResolvedValue(Response.json({error:{code:'PAGE_ATTEMPT_OWNER_CHANGED'}},{status:409}));
 expect(await deliverPageAttempt({ownerKey,command},send)).toEqual({status:'conflict',code:'PAGE_ATTEMPT_OWNER_CHANGED'});
 send.mockClear();
 expect((await deliverPageAttempt({ownerKey:'guest',command},send)).status).toBe('conflict');
 expect(send).not.toHaveBeenCalled();
});
