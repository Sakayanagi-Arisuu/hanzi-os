import {expect,it} from 'vitest';
import {captureLessonPageFirstAttempt,isLessonPageFirstAttempt} from './lessonPageAttempt';
it('preserves the first answer and assistance even after corrections and reload',()=>{
 const first=captureLessonPageFirstAttempt({text:'错',answerIds:['wrong'],usedHint:true,compared:false,revealed:false},'2026-09-14T10:00:00.000Z');
 const restored=JSON.parse(JSON.stringify(first));
 const corrected=captureLessonPageFirstAttempt({...restored,text:'对',answerIds:['right'],usedHint:false,everChecked:true},'2026-09-15T10:00:00.000Z');
 expect(corrected.firstAttempt).toEqual(first.firstAttempt);
 expect(corrected.text).toBe('对');
 expect(corrected.firstAttempt.text).toBe('错');
 expect(corrected.firstAttempt.usedHint).toBe(true);
});
it('marks old already-reviewed snapshots as exposed rather than inventing an independent first try',()=>{
 const attempt=captureLessonPageFirstAttempt({text:'答案',compared:false,everChecked:true,revealed:false,everRevealed:true},'2026-09-14T10:00:00Z').firstAttempt;
 expect(attempt.priorFeedback).toBe(true);
 expect(attempt.priorReveal).toBe(true);
 expect(isLessonPageFirstAttempt(attempt)).toBe(true);
 for(const patch of [{version:2},{text:'x'.repeat(12001)},{occurredAt:'invalid'},{usedHint:'false'},{answerIds:[1]}])expect(isLessonPageFirstAttempt({...attempt,...patch})).toBe(false);
});
