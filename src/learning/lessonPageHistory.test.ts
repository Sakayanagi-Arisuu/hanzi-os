import {expect,it} from 'vitest';
import {pageHistoryFixture} from './testing/pageHistoryFixture';
import {readingPageHistory,validatePageHistory,pageCommandHistoryEvent} from './lessonPageHistory';
import {isLessonHistoryEvent,projectLessonHistory} from './lessonHistory';
import {parsePageAttemptCommand} from './pageAttemptCommand';

it('covers every page block and separates first objective response, self-review, exposure and support',async()=>{
  const snapshot=pageHistoryFixture();
  snapshot.observations!.push({pageId:'page',blockId:'choice',action:'hint',occurredAt:'2026-10-18T03:01:00Z'},
    {pageId:'page',blockId:'audio',action:'audio',occurredAt:'2026-10-18T03:02:00Z'},
    {pageId:'page',blockId:'dictation',action:'tts',occurredAt:'2026-10-18T03:03:00Z'});
  const records=await readingPageHistory('guest:page',0,snapshot);
  expect(records.filter(record=>record.event.taskType==='page-objective')).toHaveLength(3);
  expect(records.filter(record=>record.event.taskType==='page-self-review')).toHaveLength(4);
  expect(records.filter(record=>record.event.taskType==='page-exposure')).toHaveLength(14);
  expect(records.filter(record=>record.event.taskType==='page-support')).toHaveLength(1);
  expect(records.every(record=>isLessonHistoryEvent(record.event)&&!record.event.masteryEligible)).toBe(true);
  expect(records.filter(record=>record.event.taskType==='page-objective').every(record=>record.event.outcome==='incorrect')).toBe(true);
  expect(records.find(record=>record.command.observation?.action==='tts')?.event.assistance.tts).toBe(true);
  expect(records.find(record=>record.command.observation?.action==='audio')?.event.assistance.tts).toBeNull();
});

it('retains the first response after correction and never backfills invented times or a visit from resume position',async()=>{
  const snapshot=pageHistoryFixture();
  const original=await readingPageHistory('guest:page',0,snapshot);
  snapshot.pageHistory=original;
  snapshot.drafts.cloze.text='在';
  const after=await readingPageHistory('guest:page',0,snapshot);
  expect(after).toEqual(original);
  expect(after.find(record=>record.event.taskType==='page-objective'&&record.event.itemId.includes('cloze'))?.command.response.text).toBe('错');
  snapshot.pageHistory=undefined;snapshot.observations=undefined;
  snapshot.drafts={reflection:{text:'Ghi chú cũ',revealed:false,compared:false,everRevealed:true}};
  const legacy=await readingPageHistory('guest:page',0,snapshot);
  expect(legacy).toHaveLength(2);
  expect(legacy.every(record=>record.event.occurredAt===null&&record.event.clockSource==='unknown')).toBe(true);
  expect(legacy.some(record=>record.event.taskType==='page-exposure')).toBe(false);
  expect(await readingPageHistory('guest:page',0,snapshot)).toEqual(legacy);
});

it('keeps exact released bindings for account objectives and reconciles without raising authority for self reports',async()=>{
  const ownerKey=`siwc_${'a'.repeat(64)}`,snapshot=pageHistoryFixture();
  snapshot.drafts.cloze.firstAttempt!.binding={activityId:'lesson-page:["boot-1","page","cloze"]',activityVersion:`lesson-page-v1:sha256:${'b'.repeat(64)}`,revisionId:'released-old',pageId:'page',blockId:'cloze'};
  const records=await readingPageHistory(ownerKey,0,snapshot);
  const record=records.find(entry=>!entry.command.observation)!;
  expect(record.event).toMatchObject({revisionId:'released-old',outcome:'unknown',taskType:'page-objective',authority:'unknown'});
  const confirmed={...record.event,outcome:'incorrect' as const,score:0,confirmationState:'confirmed' as const,authority:'server-verified' as const,receiptRef:'receipt'};
  expect(projectLessonHistory({ownerKey,resetEpoch:0},[record.event,confirmed,record.event])).toEqual([confirmed]);
  expect(records.every(entry=>entry.event.outcome==='unknown'||entry.event.outcome==='self-review')).toBe(true);
  snapshot.drafts.rubric.firstAttempt!.binding={activityId:'lesson-page:["boot-1","page","rubric"]',activityVersion:`lesson-page-v1:sha256:${'c'.repeat(64)}`,revisionId:'released-old',pageId:'page',blockId:'rubric'};
  const rubric=(await readingPageHistory(ownerKey,0,snapshot)).find(entry=>entry.command.activityId.includes('rubric')&&!entry.command.observation)!;
  expect(rubric.event.taskType).toBe('page-self-review');
  expect(rubric.command.idempotencyKey).toMatch(/^page-first-v1:/);
  const observation=records.find(entry=>entry.command.observation)!;
  expect(parsePageAttemptCommand({...observation.command,observation:{...observation.command.observation,score:100}})).toBeNull();
  expect(pageCommandHistoryEvent(ownerKey,observation.command).sourceType).toBe('lesson-page');
  expect(()=>validatePageHistory([{...record,event:{...record.event,schemaVersion:9}}],ownerKey,0)).toThrow();
  expect(()=>validatePageHistory(records,'other',0)).toThrow();
  expect(()=>validatePageHistory(records,ownerKey,1)).toThrow();
});
