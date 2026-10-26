import {useEffect} from 'react';
import {readPageAttemptOutbox} from './pageAttemptOutbox';
import {flushPageAttempts} from './flushPageAttempts';
import {resolveLearningResumeOwnerScope} from './learningResumeStore';
import {StaleOwnerGenerationError,listLessonResumes} from './indexedDb';
import {parseLessonReadingSession} from '../learning/lessonReadingSession';
import {queueReadingPageAttempts} from './queueReadingPageAttempts';
import {validatePageHistory} from '../learning/lessonPageHistory';
import {enqueuePageAttempt} from './pageAttemptOutbox';

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
    for(const record of await listLessonResumes(scope)){
     if(record.entryKey.startsWith('lesson-page-history:v1:')){
      for(const entry of validatePageHistory(record.value,ownerKey,scope.resetEpoch))await enqueuePageAttempt(scope,entry.command);
      continue;
     }
     if(!record.entryKey.startsWith('lesson-reading:v1:'))continue;
     const value=record.value as {lessonId?:unknown};
     const snapshot=typeof value?.lessonId==='string'?parseLessonReadingSession(value,value.lessonId):null;
     if(!snapshot)throw new Error('Unreadable saved reading source; keep it.');
     await queueReadingPageAttempts({expectedOwnerGeneration:scope.ownerGeneration,resetEpoch:scope.resetEpoch,entryKey:record.entryKey},snapshot);
    }
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
