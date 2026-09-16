import {matchPageAttemptReceipt,parsePageAttemptCommand,type PageAttemptCommand,type PageAttemptReceipt} from '../learning/pageAttemptCommand';

export type PageAttemptDelivery =
 | {status:'acknowledged';receipt:PageAttemptReceipt}
 | {status:'pending';retryAfterSeconds:number}
 | {status:'conflict';code:string};

/** One delivery only. The caller must persist the command before calling and
 * retain it on pending/conflict. No timer or implicit account reassignment.
 */
export async function deliverPageAttempt(input:{ownerKey:string;command:PageAttemptCommand;signal?:AbortSignal},send:typeof fetch=fetch):Promise<PageAttemptDelivery>{
 if(!/^siwc_[a-f0-9]{64}$/.test(input.ownerKey)||!parsePageAttemptCommand(input.command))return {status:'conflict',code:'INVALID_LOCAL_PAGE_ATTEMPT'};
 try{
  const response=await send('/api/learning/page-attempts',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json','x-learning-owner':input.ownerKey},body:JSON.stringify(input.command),signal:input.signal});
  if(response.ok){
   const receipt:unknown=await response.json();
   return matchPageAttemptReceipt(receipt,input.command)?{status:'acknowledged',receipt}:{status:'pending',retryAfterSeconds:30};
  }
  if([409,413,415,422].includes(response.status)){
   const body=await response.json() as {error?:{code?:unknown}};
   const code=typeof body.error?.code==='string'?body.error.code:'PAGE_ATTEMPT_REJECTED';
   return {status:'conflict',code};
  }
  // Expired login, throttling, transient storage errors and unknown responses
  // all retain the pending item. A later owner-scope check controls retries.
  const seconds=Number(response.headers.get('retry-after'));
  return {status:'pending',retryAfterSeconds:Number.isFinite(seconds)&&seconds>0?Math.min(86400,Math.ceil(seconds)):30};
 }catch{
  return {status:'pending',retryAfterSeconds:30};
 }
}
