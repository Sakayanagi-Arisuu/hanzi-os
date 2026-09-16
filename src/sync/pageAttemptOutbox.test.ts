import 'fake-indexeddb/auto';
import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {flushPageAttempts} from './flushPageAttempts';
import {enqueuePageAttempt,readPageAttemptOutbox,recordPageAttemptDelivery,recoverReleasedHistoryConflicts} from './pageAttemptOutbox';
import {ACTIVE_OWNER_GENERATION_KEY,openSyncDatabase,SYNC_DOCUMENT_STORE,readOrInitializeOwnerGeneration,resetSyncDatabaseForTests,writeSyncMeta,writeLessonResume,type ActiveOwnerLearningScope} from './indexedDb';
import type {PageAttemptCommand,PageAttemptReceipt} from '../learning/pageAttemptCommand';
import {queueReadingPageAttempts} from './queueReadingPageAttempts';
import {listLessonResumes} from './indexedDb';
import {emptyLessonBlock} from '../learning/lessonPages';
import {emptyLessonActivity} from '../learning/lessonActivities';
import type {LessonReadingSession} from '../learning/lessonReadingSession';
let scope:ActiveOwnerLearningScope;
const command:PageAttemptCommand={version:1,idempotencyKey:'one',resetEpoch:0,lessonId:'boot-1',activityId:'a',activityVersion:'v',occurredAt:'2026-09-14T10:00:00Z',response:{text:'在',answerIds:[],usedHint:false,priorFeedback:false,priorReveal:false}};
const receipt:PageAttemptReceipt={version:1,attemptId:'server',idempotencyKey:'one',resetEpoch:0,activityId:'a',activityVersion:'v',outcome:'correct',duplicate:false,masteryEligible:false};
async function clear(){await resetSyncDatabaseForTests();await new Promise<void>((resolve,reject)=>{const req=indexedDB.deleteDatabase('hanzi-os-sync-v1');req.onsuccess=()=>resolve();req.onerror=()=>reject(req.error);});}
beforeEach(async()=>{await clear();scope={ownerGeneration:(await readOrInitializeOwnerGeneration(`siwc_${'a'.repeat(64)}`)).ownerGeneration,resetEpoch:0};});
afterEach(clear);
it('recovers legacy version conflicts once across reloads without changing their command',async()=>{
 await enqueuePageAttempt(scope,command);
 await recordPageAttemptDelivery(scope,command,{status:'conflict',code:'PAGE_ATTEMPT_CONFLICT'});
 await Promise.all([recoverReleasedHistoryConflicts(scope),recoverReleasedHistoryConflicts(scope)]);
 await resetSyncDatabaseForTests();
 expect((await readPageAttemptOutbox(scope))[0]).toMatchObject({command,delivery:null,releasedHistoryRetry:true});
 const send=vi.fn().mockResolvedValue(new Response(JSON.stringify({error:{code:'PAGE_ATTEMPT_CONFLICT'}}),{status:409}));
 expect((await flushPageAttempts(scope,{send})).sent).toBe(1);
 await resetSyncDatabaseForTests();
 expect((await flushPageAttempts(scope,{send})).sent).toBe(0);
 expect(send).toHaveBeenCalledTimes(1);
 expect(JSON.parse(send.mock.calls[0][1].body)).toEqual(command);
});
it('acknowledges a recovered history conflict and leaves owner/reset/rejected records alone',async()=>{
 const codes=['PAGE_ATTEMPT_OWNER_CHANGED','LEARNING_RESET_EPOCH_CONFLICT','INVALID_PAGE_ATTEMPT'];
 await enqueuePageAttempt(scope,command);
 await recordPageAttemptDelivery(scope,command,{status:'conflict',code:'PAGE_ATTEMPT_CONFLICT'});
 for(const code of codes){const c={...command,idempotencyKey:code};await enqueuePageAttempt(scope,c);await recordPageAttemptDelivery(scope,c,{status:'conflict',code});}
 const send=vi.fn().mockResolvedValue(new Response(JSON.stringify(receipt),{status:201}));
 expect((await flushPageAttempts(scope,{send})).sent).toBe(1);
 expect((await readPageAttemptOutbox(scope))[0].delivery).toEqual({status:'acknowledged',receipt});
 await recoverReleasedHistoryConflicts(scope);
 const records=await readPageAttemptOutbox(scope);
 for(const code of codes)expect(records.find(e=>e.command.idempotencyKey===code)?.delivery).toEqual({status:'conflict',code});
 await writeSyncMeta(ACTIVE_OWNER_GENERATION_KEY,{ownerKey:`siwc_${'b'.repeat(64)}`,generation:2});
 await expect(recoverReleasedHistoryConflicts(scope)).rejects.toThrow();
});
it('persists both concurrent enqueues and restores them after the database is reopened',async()=>{
 await Promise.all([enqueuePageAttempt(scope,command),enqueuePageAttempt(scope,{...command,idempotencyKey:'two'})]);
 await resetSyncDatabaseForTests();
 expect((await readPageAttemptOutbox(scope)).map(e=>e.command.idempotencyKey).sort()).toEqual(['one','two']);
 await expect(enqueuePageAttempt(scope,{...command,response:{...command.response,text:'changed'}})).rejects.toThrow('key conflict');
 expect((await readPageAttemptOutbox(scope))[0].command.response.text).toBe('在');
});
it('lists reading records only from the current owner and reset, rejecting a stale caller',async()=>{
 const cache={expectedOwnerGeneration:scope.ownerGeneration,resetEpoch:0,entryKey:'lesson-reading:v1:test'};
 await writeLessonResume({...cache,value:{lessonId:'boot-1'}});
 expect((await listLessonResumes(scope)).map(r=>r.value)).toEqual([{lessonId:'boot-1'}]);
 const other={ownerGeneration:{ownerKey:`siwc_${'b'.repeat(64)}`,generation:2},resetEpoch:0};
 await writeSyncMeta(ACTIVE_OWNER_GENERATION_KEY,other.ownerGeneration);
 expect(await listLessonResumes(other)).toEqual([]);
 await expect(listLessonResumes(scope)).rejects.toThrow();
 await expect(listLessonResumes({...other,resetEpoch:1})).rejects.toThrow();
});
it('never downgrades a durable acknowledgement on retry or a later network failure',async()=>{
 await enqueuePageAttempt(scope,command);
 await recordPageAttemptDelivery(scope,command,{status:'acknowledged',receipt});
 await Promise.all([enqueuePageAttempt(scope,command),recordPageAttemptDelivery(scope,command,{status:'pending',retryAfterSeconds:30})]);
 expect((await readPageAttemptOutbox(scope))[0].delivery).toEqual({status:'acknowledged',receipt});
});
it('blocks stale owner and reset scope and leaves the original account queue intact',async()=>{
 await enqueuePageAttempt(scope,command);
 await writeSyncMeta(ACTIVE_OWNER_GENERATION_KEY,{ownerKey:`siwc_${'b'.repeat(64)}`,generation:2});
 await expect(recordPageAttemptDelivery(scope,command,{status:'acknowledged',receipt})).rejects.toThrow();
 await expect(readPageAttemptOutbox(scope)).rejects.toThrow();
 await writeSyncMeta(ACTIVE_OWNER_GENERATION_KEY,{...scope.ownerGeneration,generation:3});
 const returned={...scope,ownerGeneration:{...scope.ownerGeneration,generation:3}};
 expect((await readPageAttemptOutbox(returned))[0].delivery).toBeNull();
 await expect(enqueuePageAttempt({...returned,resetEpoch:1},{...command,resetEpoch:1})).rejects.toThrow();
});
it('preserves unreadable future journal data and refuses mismatched acknowledgements',async()=>{
 await enqueuePageAttempt(scope,command);
 await expect(recordPageAttemptDelivery(scope,command,{status:'acknowledged',receipt:{...receipt,idempotencyKey:'other'}})).rejects.toThrow('Mismatched');
 await writeLessonResume({expectedOwnerGeneration:scope.ownerGeneration,resetEpoch:0,entryKey:'page-attempt-outbox:v1',value:{version:2,entries:{future:true}}});
 await expect(enqueuePageAttempt(scope,command)).rejects.toThrow('Unreadable');
 await expect(readPageAttemptOutbox(scope)).rejects.toThrow('Unreadable');
});
it('rejects an in-flight acknowledgement after the canonical reset epoch advances',async()=>{
 await enqueuePageAttempt(scope,command);
 const database=await openSyncDatabase();
 const transaction=database.transaction(SYNC_DOCUMENT_STORE,'readwrite');
 transaction.objectStore(SYNC_DOCUMENT_STORE).put({ownerKey:scope.ownerGeneration.ownerKey,revision:1,document:{reset:{epoch:1}},updatedAt:new Date().toISOString()});
 await new Promise<void>((resolve,reject)=>{transaction.oncomplete=()=>resolve();transaction.onabort=()=>reject(transaction.error);});
 await expect(recordPageAttemptDelivery(scope,command,{status:'acknowledged',receipt})).rejects.toThrow();
 const next={...scope,resetEpoch:1};
 expect(await readPageAttemptOutbox(next)).toEqual([]);
 await enqueuePageAttempt(next,{...command,resetEpoch:1});
 expect((await readPageAttemptOutbox(next))[0].command.resetEpoch).toBe(1);
});
it('recovers saved first answers after enqueue was interrupted and ignores corrected draft text',async()=>{
 const cache={expectedOwnerGeneration:scope.ownerGeneration,resetEpoch:0,entryKey:'lesson-reading:v1:"boot-1"'};
 const snapshot:LessonReadingSession={version:1,lessonId:'boot-1',index:0,showTranscript:false,document:{version:1,pages:[{id:'p',title:'Trang',layout:'focus',blocks:[{...emptyLessonBlock('b'),kind:'activity',activity:emptyLessonActivity()}]}]},drafts:{b:{text:'corrected answer',revealed:false,compared:true,firstAttempt:{version:1,text:'first wrong answer',answerIds:[],occurredAt:'2026-09-14T10:00:00Z',usedHint:false,priorFeedback:false,priorReveal:false,binding:{activityId:'lesson-page:["boot-1","p","b"]',activityVersion:`lesson-page-v1:sha256:${'a'.repeat(64)}`,pageId:'p',blockId:'b',revisionId:'r'}}}}};
 await writeLessonResume({...cache,value:snapshot});
 expect(await readPageAttemptOutbox(scope)).toEqual([]);
 await resetSyncDatabaseForTests();
 await queueReadingPageAttempts(cache,snapshot);
 await queueReadingPageAttempts(cache,snapshot);
 const entries=await readPageAttemptOutbox(scope);
 expect(entries).toHaveLength(1);
 expect(entries[0].command.response.text).toBe('first wrong answer');
 await queueReadingPageAttempts(cache,{...snapshot,drafts:{b:{...snapshot.drafts.b,firstAttempt:{...snapshot.drafts.b.firstAttempt!,binding:undefined}}}});
 expect(await readPageAttemptOutbox(scope)).toHaveLength(1);
});
it('persists throttling across database reopen and delays the entire pending queue',async()=>{
 await enqueuePageAttempt(scope,command);
 await enqueuePageAttempt(scope,{...command,idempotencyKey:'two'});
 const send=vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('',{status:429,headers:{'retry-after':'60'}}));
 expect(await flushPageAttempts(scope,{send,now:()=>1000})).toEqual({sent:1,retryAt:61000});
 await resetSyncDatabaseForTests();
 expect(await flushPageAttempts(scope,{send,now:()=>60000})).toEqual({sent:0,retryAt:61000});
 expect(send).toHaveBeenCalledTimes(1);
 send.mockImplementation(async(_url,options)=>{
  const sent=JSON.parse(String(options?.body)) as PageAttemptCommand;
  return Response.json({...receipt,idempotencyKey:sent.idempotencyKey});
 });
 expect((await flushPageAttempts(scope,{send,now:()=>61000})).sent).toBe(2);
 expect((await readPageAttemptOutbox(scope)).every(e=>e.delivery?.status==='acknowledged')).toBe(true);
 expect((await flushPageAttempts(scope,{send,now:()=>62000})).sent).toBe(0);
});
it('stops on an account switch during delivery without marking stale work acknowledged',async()=>{
 await enqueuePageAttempt(scope,command);
 await enqueuePageAttempt(scope,{...command,idempotencyKey:'two'});
 const send=vi.fn<typeof fetch>().mockImplementation(async()=>{
  await writeSyncMeta(ACTIVE_OWNER_GENERATION_KEY,{ownerKey:`siwc_${'b'.repeat(64)}`,generation:2});
  return Response.json(receipt);
 });
 await expect(flushPageAttempts(scope,{send})).rejects.toThrow();
 expect(send).toHaveBeenCalledTimes(1);
 await writeSyncMeta(ACTIVE_OWNER_GENERATION_KEY,{...scope.ownerGeneration,generation:3});
 expect((await readPageAttemptOutbox({...scope,ownerGeneration:{...scope.ownerGeneration,generation:3}})).every(e=>e.delivery===null)).toBe(true);
});
it('sends only a bounded batch and leaves conflicts stored for inspection',async()=>{
 await enqueuePageAttempt(scope,command);
 await enqueuePageAttempt(scope,{...command,idempotencyKey:'two'});
 const send=vi.fn<typeof fetch>().mockResolvedValue(Response.json({error:{code:'PAGE_ATTEMPT_CONFLICT'}},{status:409}));
 expect((await flushPageAttempts(scope,{send,maximum:1})).sent).toBe(1);
 expect(await readPageAttemptOutbox(scope)).toHaveLength(2);
 expect((await readPageAttemptOutbox(scope))[0].delivery?.status).toBe('conflict');
 const abort=new AbortController();abort.abort();
 expect((await flushPageAttempts(scope,{send,signal:abort.signal})).sent).toBe(0);
 expect(send).toHaveBeenCalledTimes(1);
});
