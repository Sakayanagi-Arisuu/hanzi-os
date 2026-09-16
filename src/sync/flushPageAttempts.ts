import {readActiveOwnerLearningScope,StaleOwnerGenerationError,type ActiveOwnerLearningScope} from './indexedDb';
import {readPageAttemptOutbox,recordPageAttemptDelivery,recoverReleasedHistoryConflicts} from './pageAttemptOutbox';
import {deliverPageAttempt} from './pageAttemptDelivery';

/** Drain a bounded batch. No caller may infer mastery from acknowledgements.
 * Rechecking scope before every send also covers cross-tab login/reset changes.
 * Simultaneous tabs can send duplicates; the immutable key deduplicates server-side.
 */
export async function flushPageAttempts(scope:ActiveOwnerLearningScope,options:{signal?:AbortSignal;send?:typeof fetch;now?:()=>number;maximum?:number}={}){
 const now=options.now??Date.now;
 if(options.maximum!==undefined&&(!Number.isFinite(options.maximum)||options.maximum<1))throw new Error('Invalid page delivery batch limit');
 const maximum=Math.min(20,Math.max(1,Math.floor(options.maximum??10)));
 if(!options.signal?.aborted)await recoverReleasedHistoryConflicts(scope);
 const entries=await readPageAttemptOutbox(scope);
 const cooldown=entries.reduce((latest,entry)=>entry.delivery?.status==='pending'?Math.max(latest,entry.retryAt??0):latest,0);
 if(cooldown>now())return {sent:0,retryAt:cooldown};
 let sent=0;
 let retryAt:number|null=null;
 for(const entry of entries){
  if(options.signal?.aborted||sent>=maximum)break;
  if(entry.delivery?.status==='acknowledged'||entry.delivery?.status==='conflict')continue;
  if(entry.retryAt!==undefined&&entry.retryAt>now()){
   retryAt=retryAt===null?entry.retryAt:Math.min(retryAt,entry.retryAt);continue;
  }
  const active=await readActiveOwnerLearningScope();
  if(!active||active.resetEpoch!==scope.resetEpoch||active.ownerGeneration.ownerKey!==scope.ownerGeneration.ownerKey||active.ownerGeneration.generation!==scope.ownerGeneration.generation)throw new StaleOwnerGenerationError();
  if(options.signal?.aborted)break;
  const result=await deliverPageAttempt({ownerKey:scope.ownerGeneration.ownerKey,command:entry.command,signal:options.signal},options.send);
  await recordPageAttemptDelivery(scope,entry.command,result,now());
  sent++;
  if(result.status==='pending'){
   retryAt=now()+Math.max(1,result.retryAfterSeconds)*1000;
   break; // Honor server throttling/outage for the entire queue.
  }
  if(result.status==='conflict'&&result.code==='PAGE_ATTEMPT_OWNER_CHANGED')break;
 }
 return {sent,retryAt};
}
