import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {saveMistakeSupport} from './mistakeSupport';
import {readWorkspace,syncWorkspace} from './workspaceSync';
import {readLocalActivityHistory} from './activityHistory';
import {readActiveOwnerLearningScope,readOrInitializeOwnerGeneration,resetSyncDatabaseForTests,transitionOwnerCheckpoint,type ActiveOwnerLearningScope} from './indexedDb';
import {createInitialSyncDocument} from './document';
import {INITIAL_LEARNING_STATE} from '../store/LearningStore';
import type {RemediationObservatoryItem} from '../mistakes/remediationObservatory';

let scope:ActiveOwnerLearningScope;
const item:RemediationObservatoryItem={id:'support-item',contentVersion:'archived-content',activityVersion:'archived-item',referenceLessonId:'daily-1',
 skill:'reading',skillLabel:'Đọc',kindLabel:'Câu',originSource:'lesson',originLabel:'Bài học',originDetail:'Nguồn cũ',instruction:'Trả lời',prompt:'private question',
 options:[],hint:'private hint',spokenText:'private stimulus',previousAnswer:'private first response',occurrenceCount:1,correctedStreak:0,resolved:false,lastAttemptAt:1};
const clear=async()=>{await resetSyncDatabaseForTests();await new Promise<void>((resolve,reject)=>{const request=indexedDB.deleteDatabase('hanzi-os-sync-v1');request.onsuccess=()=>resolve();request.onerror=()=>reject(request.error);});};
beforeEach(async()=>{await clear();vi.stubGlobal('window',new EventTarget());await readOrInitializeOwnerGeneration('account:mistake-support');scope=(await readActiveOwnerLearningScope())!;});
afterEach(async()=>{vi.restoreAllMocks();vi.unstubAllGlobals();await clear();});

it('keeps standalone hint and synthetic TTS request as support, without answers, measurements or scoring',async()=>{
 await saveMistakeSupport(scope,item,'hint','hint-one');await saveMistakeSupport(scope,item,'synthetic-tts','tts-one');
 const events=await readLocalActivityHistory(scope);
 expect(events).toHaveLength(2);
 expect(events.every(e=>e.module==='mistakes'&&e.outcome==='unknown'&&e.score===null&&e.masteryEligible===false&&e.firstResponseRef===null&&e.confirmationState==='provisional')).toBe(true);
 expect(events.find(e=>e.business?.details?.kind==='hint')).toMatchObject({contentVersion:'archived-content',activityVersion:'archived-item',sourceLessonIds:['daily-1'],assistance:{hint:true,tts:null},business:{category:'support',details:{kind:'hint',measurementEligible:false}}});
 expect(events.find(e=>e.business?.details?.kind==='synthetic-tts')).toMatchObject({modality:'audio',assistance:{tts:true},business:{details:{playback:'requested',syntheticTts:true,measurementEligible:false}}});
 expect((await readWorkspace(scope)).entries.map(e=>e.key)).toEqual(expect.arrayContaining(['activity.record:["mistakes","hint-one"]','activity.record:["mistakes","tts-one"]']));
 expect(JSON.stringify(await readWorkspace(scope))).not.toMatch(/private/);
});

it('deduplicates concurrent retry and reload; acknowledgment confirms storage without changing authority into recall',async()=>{
 await Promise.all([saveMistakeSupport(scope,item,'hint','same'),saveMistakeSupport(scope,item,'hint','same')]);
 const before=await readWorkspace(scope);
 await expect(syncWorkspace(scope,new AbortController().signal,async()=>{throw Error('offline');})).rejects.toThrow('offline');
 await resetSyncDatabaseForTests();expect(await readWorkspace(scope)).toEqual(before);
 await syncWorkspace(scope,new AbortController().signal,async(_url,init)=>Response.json({version:1,resetEpoch:scope.resetEpoch,entries:JSON.parse(init!.body as string).entries}));
 expect(await readLocalActivityHistory(scope)).toMatchObject([{confirmationState:'confirmed',authority:'server-recorded',outcome:'unknown',score:null,masteryEligible:false}]);
 await saveMistakeSupport(scope,item,'hint','new-request');expect(await readLocalActivityHistory(scope)).toHaveLength(2);
});

it('rejects unavailable support or conflicting retry and retains the first operation and unknown legacy versions',async()=>{
 await saveMistakeSupport(scope,{...item,contentVersion:undefined,activityVersion:undefined,referenceLessonId:undefined},'hint','legacy');
 const before=await readWorkspace(scope);
 await expect(saveMistakeSupport(scope,{...item,hint:''},'hint','empty')).rejects.toThrow('unavailable');
 await expect(saveMistakeSupport(scope,{...item,spokenText:null},'synthetic-tts','empty')).rejects.toThrow('unavailable');
 await expect(saveMistakeSupport(scope,item,'synthetic-tts','legacy')).rejects.toThrow('Conflicting');
 expect(await readWorkspace(scope)).toEqual(before);
 expect(await readLocalActivityHistory(scope)).toMatchObject([{contentVersion:'unknown',activityVersion:'unknown',sourceLessonIds:[],firstResponseRef:null}]);
});

it('keeps committed sources on quota and stale reset/owner, with guest support remaining local practice',async()=>{
 await saveMistakeSupport(scope,item,'hint','existing');const before=await readWorkspace(scope);
 const put=IDBObjectStore.prototype.put;
 const failure=vi.spyOn(IDBObjectStore.prototype,'put').mockImplementation(function(this:IDBObjectStore,value,key){if(this.name==='lesson-resumes')throw new DOMException('quota','QuotaExceededError');return key===undefined?put.call(this,value):put.call(this,value,key);});
 await expect(saveMistakeSupport(scope,item,'hint','failed')).rejects.toThrow();failure.mockRestore();
 await expect(saveMistakeSupport({...scope,resetEpoch:scope.resetEpoch+1},item,'hint','reset')).rejects.toThrow();
 expect(await readWorkspace(scope)).toEqual(before);
 await transitionOwnerCheckpoint(scope.ownerGeneration,'anonymous:mistake-support',0,createInitialSyncDocument(INITIAL_LEARNING_STATE,'2026-10-25T00:00:00Z','guest'),INITIAL_LEARNING_STATE);
 await expect(saveMistakeSupport(scope,item,'hint','old-owner')).rejects.toThrow();
 const guest=(await readActiveOwnerLearningScope())!;await saveMistakeSupport(guest,item,'hint','guest');
 expect(await readLocalActivityHistory(guest)).toMatchObject([{authority:'local-practice',confirmationState:'provisional',masteryEligible:false,outcome:'unknown'}]);
});
