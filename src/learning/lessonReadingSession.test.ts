import { describe, expect, it } from 'vitest';
import { emptyLessonBlock, type LessonPageDocument } from './lessonPages';
import { emptyReadingPosition, lessonReadingEntryKey, parseLessonReadingSession } from './lessonReadingSession';
import {captureLessonPageFirstAttempt} from './lessonPageAttempt';

const document: LessonPageDocument = {version:1,pages:[{id:'page',title:'Tự nói',layout:'workshop',blocks:[{...emptyLessonBlock('answer'),kind:'reflection',body:'Hãy giới thiệu bản thân.'}]}]};
const session = () => ({...emptyReadingPosition(),version:1,lessonId:'lesson',document,drafts:{answer:{text:'我是学生。',revealed:false,compared:true,everRevealed:true}}});
describe('lesson reading resume',()=>{
  it('restores first-attempt snapshots and rejects malformed ones without replacing the session',()=>{
    const value=session();
    const answer=captureLessonPageFirstAttempt(value.drafts.answer,'2026-09-14T10:00:00Z');
    const updated={...value,drafts:{answer}};
    expect(parseLessonReadingSession(JSON.parse(JSON.stringify(updated)),'lesson')).toEqual(updated);
    expect(parseLessonReadingSession({...updated,drafts:{answer:{...answer,firstAttempt:{...answer.firstAttempt,usedHint:1}}}},'lesson')).toBeNull();
  });
  it('preserves the original content and assistance history with the draft',()=>{
    const value=session();
    expect(parseLessonReadingSession(JSON.parse(JSON.stringify(value)),'lesson')).toEqual(value);
    expect(parseLessonReadingSession(value,'lesson')?.drafts.answer.everRevealed).toBe(true);
  });
  it('does not restore another lesson, invalid pages or unknown response IDs',()=>{
    expect(parseLessonReadingSession(session(),'other')).toBeNull();
    expect(parseLessonReadingSession({...session(),index:1},'lesson')).toBeNull();
    expect(parseLessonReadingSession({...session(),drafts:{unknown:session().drafts.answer}},'lesson')).toBeNull();
    expect(parseLessonReadingSession({...session(),document:{version:2,pages:[]}},'lesson')).toBeNull();
  });
  it('bounds free text and keeps this cache separate from scored sessions',()=>{
    expect(parseLessonReadingSession({...session(),drafts:{answer:{...session().drafts.answer,text:'a'.repeat(12001)}}},'lesson')).toBeNull();
    expect(lessonReadingEntryKey('lesson')).toBe('lesson-reading:v1:"lesson"');
  });
  it('keeps old snapshots and restores a specific item without losing draft evidence',()=>{
    const old=session();
    expect(parseLessonReadingSession(old,'lesson')).toEqual(old);
    const documentWithTwoItems={...document,pages:[{...document.pages[0],blocks:[...document.pages[0].blocks,{...emptyLessonBlock('explanation'),body:'Mẫu đối chiếu.'}]}]};
    const current={...old,document:documentWithTwoItems,blockIndex:1};
    expect(parseLessonReadingSession(current,'lesson')).toEqual(current);
    for(const blockIndex of [-1,2,1.5,'1'])expect(parseLessonReadingSession({...current,blockIndex},'lesson')).toBeNull();
  });
});
