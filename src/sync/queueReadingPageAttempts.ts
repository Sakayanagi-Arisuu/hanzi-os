import type {LessonReadingSession} from '../learning/lessonReadingSession';
import {enqueuePageAttempt,readPageAttemptOutbox} from './pageAttemptOutbox';
import {canonicalStringify} from './canonicalHash';
import type {OwnerScopedCacheScope} from './indexedDb';
import {readingPageHistory} from '../learning/lessonPageHistory';

/** Only call after the snapshot is durable. Replaying on restore closes a crash
 * between snapshot save and enqueue without inventing a first-attempt binding.
 */
export async function queueReadingPageAttempts(scope:OwnerScopedCacheScope,snapshot:LessonReadingSession,_previous?:LessonReadingSession){
 const ownerKey=scope.expectedOwnerGeneration.ownerKey;
 if(!/^siwc_[a-f0-9]{64}$/.test(ownerKey))return;
 const existing=await readPageAttemptOutbox({ownerGeneration:scope.expectedOwnerGeneration,resetEpoch:scope.resetEpoch});
 for(const record of await readingPageHistory(ownerKey,scope.resetEpoch,snapshot)){
  if(record.command.observation?.action==='first-response'&&existing.some(entry=>!entry.command.observation
    &&entry.command.lessonId===record.command.lessonId&&entry.command.activityId===record.command.activityId
    &&entry.command.occurredAt===record.command.occurredAt&&canonicalStringify(entry.command.response)===canonicalStringify(record.command.response)))continue;
  await enqueuePageAttempt({ownerGeneration:scope.expectedOwnerGeneration,resetEpoch:scope.resetEpoch},record.command);
 }
}
