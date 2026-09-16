import {canonicalStringify} from './canonicalHash';
import {readLessonResume,updateLessonResume,type ActiveOwnerLearningScope,type OwnerScopedCacheScope} from './indexedDb';
import {matchPageAttemptReceipt,parsePageAttemptCommand,type PageAttemptCommand} from '../learning/pageAttemptCommand';
import type {PageAttemptDelivery} from './pageAttemptDelivery';

type Entry={command:PageAttemptCommand;delivery:PageAttemptDelivery|null;retryAt?:number;releasedHistoryRetry?:true};
type Journal={version:1;entries:Record<string,Entry>};
const cacheScope=(scope:ActiveOwnerLearningScope):OwnerScopedCacheScope=>({expectedOwnerGeneration:scope.ownerGeneration,resetEpoch:scope.resetEpoch,entryKey:'page-attempt-outbox:v1'});
function parseJournal(value:unknown,epoch:number):Journal{
 if(value===undefined)return {version:1,entries:{}};
 const journal=value as Journal;
 if(!journal||journal.version!==1||!journal.entries||typeof journal.entries!=='object'||Array.isArray(journal.entries))throw new Error('Unreadable page attempt outbox');
 for(const [key,entry] of Object.entries(journal.entries)){
  const command=parsePageAttemptCommand(entry?.command);
  if(!command||command.idempotencyKey!==key||command.resetEpoch!==epoch)throw new Error('Invalid stored page attempt');
  if(entry.retryAt!==undefined&&(!Number.isFinite(entry.retryAt)||entry.retryAt<0))throw new Error('Invalid page retry time');
  if(entry.releasedHistoryRetry!==undefined&&entry.releasedHistoryRetry!==true)throw new Error('Invalid history recovery marker');
  const result=entry.delivery;
  if(result!==null&&(!result||
   (result.status==='acknowledged'?!matchPageAttemptReceipt(result.receipt,command):
    result.status==='pending'?(!Number.isFinite(result.retryAfterSeconds)||result.retryAfterSeconds<0):
    result.status==='conflict'?typeof result.code!=='string':true)))throw new Error('Invalid stored page delivery');
 }
 return journal;
}
const requireAccount=(scope:ActiveOwnerLearningScope)=>{
 if(!/^siwc_[a-f0-9]{64}$/.test(scope.ownerGeneration.ownerKey))throw new Error('Page outbox requires an account owner');
};
/** Await this durable commit before attempting delivery. Replays preserve an
 * existing acknowledgement; another tab cannot overwrite it with pending work.
 */
export async function enqueuePageAttempt(scope:ActiveOwnerLearningScope,value:PageAttemptCommand){
 requireAccount(scope);
 const command=parsePageAttemptCommand(value);
 if(!command||command.resetEpoch!==scope.resetEpoch)throw new Error('Invalid page attempt scope');
 return updateLessonResume(cacheScope(scope),previous=>{
  const journal=parseJournal(previous,scope.resetEpoch),existing=Object.hasOwn(journal.entries,command.idempotencyKey)?journal.entries[command.idempotencyKey]:undefined;
  if(existing&&canonicalStringify(existing.command)!==canonicalStringify(command))throw new Error('Page attempt key conflict');
  return existing?journal:{...journal,entries:{...journal.entries,[command.idempotencyKey]:{command,delivery:null}}};
 });
}
export async function readPageAttemptOutbox(scope:ActiveOwnerLearningScope){
 requireAccount(scope);
 const record=await readLessonResume(cacheScope(scope));
 return Object.values(parseJournal(record?.value,scope.resetEpoch).entries);
}

/** Retry the old generic version-conflict response once now that the server
 * accepts immutable history. Mark before sending so reload/tabs cannot loop.
 * Never rewrite a command, owner/reset conflict, or acknowledgement. */
export async function recoverReleasedHistoryConflicts(scope:ActiveOwnerLearningScope){
 requireAccount(scope);
 return updateLessonResume(cacheScope(scope),previous=>{
  const journal=parseJournal(previous,scope.resetEpoch);
  const entries={...journal.entries};
  for(const [key,entry] of Object.entries(entries)){
   if(entry.releasedHistoryRetry||entry.delivery?.status!=='conflict'||entry.delivery.code!=='PAGE_ATTEMPT_CONFLICT')continue;
   entries[key]={...entry,delivery:null,retryAt:undefined,releasedHistoryRetry:true};
  }
  return {...journal,entries};
 });
}
/** Called after delivery; the transaction rechecks current owner AND reset. */
export async function recordPageAttemptDelivery(scope:ActiveOwnerLearningScope,command:PageAttemptCommand,delivery:PageAttemptDelivery,now=Date.now()){
 requireAccount(scope);
 if(!Number.isFinite(now)||now<0)throw new Error('Invalid page delivery time');
 return updateLessonResume(cacheScope(scope),previous=>{
  const journal=parseJournal(previous,scope.resetEpoch),existing=Object.hasOwn(journal.entries,command.idempotencyKey)?journal.entries[command.idempotencyKey]:undefined;
  if(!existing||canonicalStringify(existing.command)!==canonicalStringify(command))throw new Error('Page attempt missing or changed');
  if(delivery.status==='acknowledged'&&!matchPageAttemptReceipt(delivery.receipt,command))throw new Error('Mismatched page acknowledgement');
  // The successful response wins even if a slower request later fails.
  if(existing.delivery?.status==='acknowledged')return journal;
  const retryAt=delivery.status==='pending'?now+Math.max(1,delivery.retryAfterSeconds)*1000:undefined;
  const next={...journal,entries:{...journal.entries,[command.idempotencyKey]:{...existing,delivery,retryAt}}};
  return parseJournal(next,scope.resetEpoch);
 });
}
