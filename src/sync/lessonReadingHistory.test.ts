import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {pageHistoryFixture} from '../learning/testing/pageHistoryFixture';
import {lessonReadingEntryKey} from '../learning/lessonReadingSession';
import {projectLessonHistory} from '../learning/lessonHistory';
import {persistLessonReadingHistory} from './lessonReadingHistory';
import {queueReadingPageAttempts} from './queueReadingPageAttempts';
import {flushPageAttempts} from './flushPageAttempts';
import {readLocalLessonHistory} from './lessonHistory';
import {enqueuePageAttempt,readPageAttemptOutbox,recordPageAttemptDelivery} from './pageAttemptOutbox';
import {preparePageAttemptCommand} from '../learning/pageAttemptCommand';
import {ACTIVE_OWNER_GENERATION_KEY,SYNC_DOCUMENT_STORE,clearOwnerScopedLearningCaches,openSyncDatabase,readLessonResume,
  readOrInitializeOwnerGeneration,resetSyncDatabaseForTests,writeLessonResume,writeSyncMeta,type ActiveOwnerLearningScope} from './indexedDb';

let scope:ActiveOwnerLearningScope;
const cache=()=>({expectedOwnerGeneration:scope.ownerGeneration,resetEpoch:scope.resetEpoch,entryKey:lessonReadingEntryKey('boot-1')});
async function clear(){
  await resetSyncDatabaseForTests();
  await new Promise<void>((resolve,reject)=>{const request=indexedDB.deleteDatabase('hanzi-os-sync-v1');request.onsuccess=()=>resolve();request.onerror=()=>reject(request.error);});
}
beforeEach(async()=>{await clear();scope={ownerGeneration:(await readOrInitializeOwnerGeneration('guest:page')).ownerGeneration,resetEpoch:0};});
afterEach(async()=>{vi.restoreAllMocks();await clear();});

it('commits guest practice with its source, reopens after crash and keeps first failure after correcting',async()=>{
  const snapshot=pageHistoryFixture();
  const durable=await persistLessonReadingHistory(cache(),snapshot);
  const before=await readLocalLessonHistory(scope);
  expect(before).toHaveLength(19);
  await resetSyncDatabaseForTests();
  snapshot.drafts.cloze.text='在';
  await persistLessonReadingHistory(cache(),snapshot);
  expect(await readLocalLessonHistory(scope)).toEqual(before);
  expect(durable.pageHistory.find(record=>record.event.itemId.includes('cloze')&&record.event.taskType==='page-objective')?.event.outcome).toBe('incorrect');
  await clearOwnerScopedLearningCaches(scope.ownerGeneration);
  expect(await readLocalLessonHistory(scope)).toEqual(before);
});

it('merges two stale tabs without losing another first response or exposure, and refuses content overwrite',async()=>{
  const left=pageHistoryFixture(),right=pageHistoryFixture();
  left.drafts={cloze:left.drafts.cloze};left.observations=left.observations!.slice(0,2);
  right.drafts={reflection:right.drafts.reflection};right.observations=right.observations!.slice(2,4);
  await Promise.all([persistLessonReadingHistory(cache(),left),persistLessonReadingHistory(cache(),right)]);
  await resetSyncDatabaseForTests();
  expect(await readLocalLessonHistory(scope)).toHaveLength(6);
  const previous=await readLessonResume(cache());
  right.document.pages[0].blocks[0].body='Bản mới';
  await expect(persistLessonReadingHistory(cache(),right)).rejects.toThrow('version changed');
  expect(await readLessonResume(cache())).toEqual(previous);
});

it('rolls back snapshot and journal on quota, rejects corrupt/future records without destroying old data',async()=>{
  const snapshot=pageHistoryFixture();
  await persistLessonReadingHistory(cache(),snapshot);
  const previous=await readLessonResume(cache());
  const put=IDBObjectStore.prototype.put;
  const failure=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementation(function(this:IDBObjectStore,value,key){
    if(this.name==='lesson-resumes'&&value.entryKey?.startsWith('lesson-page-history:'))throw new DOMException('Full','QuotaExceededError');
    return put.call(this,value,key);
  });
  snapshot.drafts.cloze.text='在';
  await expect(persistLessonReadingHistory(cache(),snapshot)).rejects.toThrow('Full');
  failure.mockRestore();
  expect(await readLessonResume(cache())).toEqual(previous);
  const journal={...cache(),entryKey:'lesson-page-history:v1:"boot-1"'};
  await writeLessonResume({...journal,value:{version:99,raw:'keep'}});
  await expect(persistLessonReadingHistory(cache(),snapshot)).rejects.toThrow('Unreadable');
  expect((await readLessonResume(journal))?.value).toEqual({version:99,raw:'keep'});
  expect(await readLessonResume(cache())).toEqual(previous);
  await expect(readLocalLessonHistory(scope)).rejects.toThrow('Unreadable');
});
it('keeps the first committed answer when another tab submits a different answer to the same page item',async()=>{
  const left=pageHistoryFixture(),right=pageHistoryFixture();
  left.drafts={cloze:left.drafts.cloze};left.observations=[];
  right.drafts={cloze:right.drafts.cloze};right.observations=[];
  right.drafts.cloze.firstAttempt={...right.drafts.cloze.firstAttempt!,text:'在',occurredAt:'2026-10-18T03:01:00Z'};
  await persistLessonReadingHistory(cache(),left);
  await persistLessonReadingHistory(cache(),right);
  const events=await readLocalLessonHistory(scope);
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({outcome:'incorrect',occurredAt:'2026-10-18T03:00:00.000Z'});
  expect((await readLessonResume<ReturnType<typeof pageHistoryFixture>>(cache()))?.value.drafts.cloze.firstAttempt?.text).toBe('错');
});

it('fences old owner/reset writes, hides old epochs and preserves the old journal',async()=>{
  await persistLessonReadingHistory(cache(),pageHistoryFixture());
  const before=await readLocalLessonHistory(scope),oldScope=scope;
  await writeSyncMeta(ACTIVE_OWNER_GENERATION_KEY,{ownerKey:'guest:other',generation:2});
  await expect(persistLessonReadingHistory(cache(),pageHistoryFixture())).rejects.toThrow();
  scope={ownerGeneration:{ownerKey:'guest:other',generation:2},resetEpoch:0};
  expect(await readLocalLessonHistory(scope)).toEqual([]);
  await writeSyncMeta(ACTIVE_OWNER_GENERATION_KEY,{...oldScope.ownerGeneration,generation:3});
  scope={...oldScope,ownerGeneration:{...oldScope.ownerGeneration,generation:3}};
  expect(await readLocalLessonHistory(scope)).toEqual(before);
  const database=await openSyncDatabase(),transaction=database.transaction(SYNC_DOCUMENT_STORE,'readwrite');
  transaction.objectStore(SYNC_DOCUMENT_STORE).put({ownerKey:scope.ownerGeneration.ownerKey,document:{reset:{epoch:1}},revision:1,updatedAt:new Date().toISOString()});
  await new Promise<void>((resolve,reject)=>{transaction.oncomplete=()=>resolve();transaction.onabort=()=>reject(transaction.error);});
  await expect(readLocalLessonHistory(scope)).rejects.toThrow();
  expect(await readLocalLessonHistory({...scope,resetEpoch:1})).toEqual([]);
});

it('rebuilds account work after a crash before enqueue, retries offline and reconciles receipts once',async()=>{
  await writeSyncMeta(ACTIVE_OWNER_GENERATION_KEY,{ownerKey:`siwc_${'a'.repeat(64)}`,generation:2});
  scope={ownerGeneration:{ownerKey:`siwc_${'a'.repeat(64)}`,generation:2},resetEpoch:0};
  const durable=await persistLessonReadingHistory(cache(),pageHistoryFixture());
  const pending=await readLocalLessonHistory(scope);
  await resetSyncDatabaseForTests();
  await queueReadingPageAttempts(cache(),durable);
  await flushPageAttempts(scope,{send:async()=>{throw new TypeError('offline');},now:()=>0});
  await resetSyncDatabaseForTests();
  expect(await readLocalLessonHistory(scope)).toEqual(pending);
  const send=vi.fn<typeof fetch>().mockImplementation(async(_url,init)=>{
    const command=JSON.parse(String(init?.body));
    return Response.json({version:1,attemptId:`receipt:${command.idempotencyKey}`,idempotencyKey:command.idempotencyKey,
      resetEpoch:0,activityId:command.activityId,activityVersion:command.activityVersion,outcome:'self-review',duplicate:true,masteryEligible:false});
  });
  await flushPageAttempts(scope,{send,now:()=>100000,maximum:20});
  await queueReadingPageAttempts(cache(),durable);
  expect((await flushPageAttempts(scope,{send,now:()=>100000,maximum:20})).sent).toBe(0);
  const confirmed=await readLocalLessonHistory(scope);
  expect(confirmed).toHaveLength(pending.length);
  expect(confirmed.every(event=>event.confirmationState==='confirmed'&&event.authority==='server-recorded'&&!event.masteryEligible)).toBe(true);
  expect(projectLessonHistory({ownerKey:scope.ownerGeneration.ownerKey,resetEpoch:0},[...pending,...confirmed])).toHaveLength(pending.length);
  expect((await readPageAttemptOutbox(scope)).every(entry=>entry.delivery?.status==='acknowledged')).toBe(true);
});
it('reconciles a legacy bound rubric journal with its saved page without creating a second self-review',async()=>{
  await writeSyncMeta(ACTIVE_OWNER_GENERATION_KEY,{ownerKey:`siwc_${'a'.repeat(64)}`,generation:2});
  scope={ownerGeneration:{ownerKey:`siwc_${'a'.repeat(64)}`,generation:2},resetEpoch:0};
  const snapshot=pageHistoryFixture();snapshot.observations=undefined;snapshot.drafts={rubric:snapshot.drafts.rubric};
  const first=snapshot.drafts.rubric.firstAttempt!;
  first.binding={activityId:'lesson-page:["boot-1","page","rubric"]',activityVersion:`lesson-page-v1:sha256:${'b'.repeat(64)}`,revisionId:'old-revision',pageId:'page',blockId:'rubric'};
  const command=(await preparePageAttemptCommand({ownerKey:scope.ownerGeneration.ownerKey,resetEpoch:0,lessonId:'boot-1',pageId:'page',blockId:'rubric',firstAttempt:first}))!;
  await enqueuePageAttempt(scope,command);
  await writeLessonResume({...cache(),value:snapshot});
  expect(await readLocalLessonHistory(scope)).toHaveLength(1);
  const durable=await persistLessonReadingHistory(cache(),snapshot);
  await queueReadingPageAttempts(cache(),durable);
  await recordPageAttemptDelivery(scope,command,{status:'acknowledged',receipt:{version:1,attemptId:'old-receipt',idempotencyKey:command.idempotencyKey,
    resetEpoch:0,activityId:command.activityId,activityVersion:command.activityVersion,outcome:'self-review',duplicate:true,masteryEligible:false}});
  const events=await readLocalLessonHistory(scope);
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({taskType:'page-self-review',outcome:'self-review',revisionId:'old-revision',confirmationState:'confirmed',masteryEligible:false});
  expect(await readPageAttemptOutbox(scope)).toHaveLength(1);
});
