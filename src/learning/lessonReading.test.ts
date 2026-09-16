import {describe,expect,it} from 'vitest';
import {emptyLessonReading,isEditableLessonReading,validateLessonReading} from './lessonReading';
import {isLessonPageDocument,type LessonPageDocument} from './lessonPages';
import {parseLessonReadingSession} from './lessonReadingSession';
import {duplicateLessonPage} from './lessonPageEditing';
import draft from '../../content/drafts/thien-lo-hsk3-timeline-v2.json';

describe('long reading lesson blocks',()=>{
  it('allows incomplete authoring but requires complete parallel text for publication',()=>{
    const reading=emptyLessonReading();
    expect(isEditableLessonReading(reading)).toBe(true);
    expect(validateLessonReading(reading).length).toBeGreaterThan(0);
    const block=(draft.lessonPages as LessonPageDocument).pages[1].blocks[0];
    expect(validateLessonReading(block.reading)).toEqual([]);
    expect(validateLessonReading({...block.reading,paragraphs:[block.reading!.paragraphs[0],block.reading!.paragraphs[0]]}).length).toBeGreaterThan(0);
  });
  it('restores learner notes, selected evidence and exposed translations with the pinned text',()=>{
    const document=draft.lessonPages as LessonPageDocument;
    expect(isLessonPageDocument(document)).toBe(true);
    const block=document.pages[1].blocks[0];
    const session={version:1,lessonId:draft.lessonId,document,index:1,showTranscript:false,drafts:{[block.id]:{text:'Báo đổi lịch xuất bản.',answerIds:['change'],revealed:false,everRevealed:true,showPinyin:true,compared:false}}};
    expect(parseLessonReadingSession(session,draft.lessonId)).toEqual(session);
    expect(parseLessonReadingSession({...session,drafts:{[block.id]:{...session.drafts[block.id],showPinyin:'yes'}}},draft.lessonId)).toBeNull();
    const copy=duplicateLessonPage(document.pages[1]);
    expect(copy.blocks[0].reading!.paragraphs.map(p=>p.id)).not.toEqual(block.reading!.paragraphs.map(p=>p.id));
    expect(copy.blocks[0].reading!.paragraphs.map(p=>p.hanzi)).toEqual(block.reading!.paragraphs.map(p=>p.hanzi));
  });
});
