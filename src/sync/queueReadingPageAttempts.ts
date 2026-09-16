import {preparePageAttemptCommand} from '../learning/pageAttemptCommand';
import type {LessonReadingSession} from '../learning/lessonReadingSession';
import {enqueuePageAttempt} from './pageAttemptOutbox';
import type {OwnerScopedCacheScope} from './indexedDb';

/** Only call after the snapshot is durable. Replaying on restore closes a crash
 * between snapshot save and enqueue without inventing a first-attempt binding.
 */
export async function queueReadingPageAttempts(scope:OwnerScopedCacheScope,snapshot:LessonReadingSession,previous?:LessonReadingSession){
 const ownerKey=scope.expectedOwnerGeneration.ownerKey;
 if(!/^siwc_[a-f0-9]{64}$/.test(ownerKey))return;
 for(const page of snapshot.document.pages)for(const block of page.blocks){
  if(block.kind!=='activity')continue;
  const firstAttempt=snapshot.drafts[block.id]?.firstAttempt;
  if(!firstAttempt||JSON.stringify(firstAttempt)===JSON.stringify(previous?.drafts[block.id]?.firstAttempt))continue;
  const command=await preparePageAttemptCommand({ownerKey,resetEpoch:scope.resetEpoch,lessonId:snapshot.lessonId,pageId:page.id,blockId:block.id,firstAttempt});
  if(command){
   await enqueuePageAttempt({ownerGeneration:scope.expectedOwnerGeneration,resetEpoch:scope.resetEpoch},command);
   if(typeof window!=='undefined')window.dispatchEvent(new Event('hanzi-page-attempt-queued'));
  }
 }
}
