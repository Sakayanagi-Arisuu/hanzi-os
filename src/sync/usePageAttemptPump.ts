import {useEffect} from 'react';
import {readPageAttemptOutbox} from './pageAttemptOutbox';
import {flushPageAttempts} from './flushPageAttempts';
import {resolveLearningResumeOwnerScope} from './learningResumeStore';
import {StaleOwnerGenerationError} from './indexedDb';

export const PAGE_ATTEMPT_QUEUED_EVENT='hanzi-page-attempt-queued';
/** Owner-scoped lifecycle. Local snapshots remain independent of network work. */
export function usePageAttemptPump(ownerKey:string){
 useEffect(()=>{
  if(!/^siwc_[a-f0-9]{64}$/.test(ownerKey))return;
  const controller=new AbortController();
  let timer:ReturnType<typeof setTimeout>|undefined;
  let running=false,wakeAgain=false;
  const schedule=(milliseconds:number)=>{
   if(controller.signal.aborted)return;
   if(timer)clearTimeout(timer);
   timer=setTimeout(()=>void run(),Math.max(500,milliseconds));
  };
  const run=async()=>{
   if(controller.signal.aborted)return;
   if(running){wakeAgain=true;return;}
   if(timer){clearTimeout(timer);timer=undefined;}
   if(!navigator.onLine)return;
   running=true;
   try{
    const scope=await resolveLearningResumeOwnerScope(ownerKey);
    const result=await flushPageAttempts(scope,{signal:controller.signal});
    if(result.sent>0&&!controller.signal.aborted)window.dispatchEvent(new Event('hanzi-page-attempts-updated'));
    if(result.retryAt!==null)schedule(result.retryAt-Date.now());
    else if((await readPageAttemptOutbox(scope)).some(e=>!e.delivery||e.delivery.status==='pending'))schedule(1000);
   }catch(error){schedule(error instanceof StaleOwnerGenerationError?3000:30000);}
   finally{
    running=false;
    if(wakeAgain){wakeAgain=false;schedule(500);}
   }
  };
  const wake=()=>{void run();};
  const visible=()=>{if(document.visibilityState==='visible')wake();};
  window.addEventListener('online',wake);
  window.addEventListener('focus',wake);
  document.addEventListener('visibilitychange',visible);
  window.addEventListener(PAGE_ATTEMPT_QUEUED_EVENT,wake);
  void run();
  return ()=>{
   controller.abort();if(timer)clearTimeout(timer);
   window.removeEventListener('online',wake);
   window.removeEventListener('focus',wake);
   document.removeEventListener('visibilitychange',visible);
   window.removeEventListener(PAGE_ATTEMPT_QUEUED_EVENT,wake);
  };
 },[ownerKey]);
}
