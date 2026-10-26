import { describe, expect, it } from 'vitest';
import { emptyLessonBlock, type LessonPageDocument } from '../learning/lessonPages';
import { emptyLessonActivity } from '../learning/lessonActivities';
import { collectLocalPageMistakes } from './localPageMistakes';
import { checkPageRemediation, pageRemediationAnswer, pageActivityLessonId } from './pageRemediation';

const activity = { ...emptyLessonActivity(), type: 'cloze' as const, acceptedAnswers: ['在', '正在'], explanation: 'Vị trí' };
const document: LessonPageDocument = { version: 1, pages: [{ id: 'page', title: 'Trang', layout: 'focus', blocks: [
  { ...emptyLessonBlock('block'), kind: 'activity', body: 'Điền từ', activity },
] }] };
const record = (text: string) => ({ entryKey: 'lesson-reading:v1:"boot-1"', value: {
  version: 1, lessonId: 'boot-1', document, index: 0, showTranscript: false,
  drafts: { block: { text: '在', revealed: false, compared: true,
    firstAttempt: { version: 1, text, answerIds: [], occurredAt: '2026-10-17T00:00:00Z', usedHint: false, priorFeedback: false, priorReveal: false } } },
} });

describe('page mistakes on the device', () => {
  it('uses the first answer, survives archived duplicates and preserves a correction after reload', async () => {
    const source = record('错');
    const entries = await collectLocalPageMistakes([source, { ...source, entryKey: `${source.entryKey}:history:old` }]);
    expect(entries).toHaveLength(1);
    expect(entries[0].item.resolved).toBe(false);
    const correction = { entryKey: entries[0].entryKey, value: { version: 1, originAt: entries[0].originAt,
      occurredAt: entries[0].originAt + 10, correct: true, usedHint: false } };
    expect((await collectLocalPageMistakes([source, correction]))[0].item.resolved).toBe(true);
    expect((await collectLocalPageMistakes([source, { ...correction, value: { ...correction.value, usedHint: true } }]))[0].item.resolved).toBe(false);
    expect((await collectLocalPageMistakes([source, { ...correction, value: { ...correction.value, originAt: 0 } }]))[0].item.resolved).toBe(false);
  });
  it('does not convert correct, rubric, missing or invalid first attempts into mistakes', async () => {
    expect(await collectLocalPageMistakes([record('在')])).toEqual([]);
    expect(await collectLocalPageMistakes([{ entryKey: 'lesson-reading:v1:x', value: {} }])).toEqual([]);
    const source = record('错');
    source.value.document = { ...document, pages: [{ ...document.pages[0], blocks: [{ ...document.pages[0].blocks[0],
      activity: { ...activity, type: 'rubric', rubric: [{ id: 'one', label: 'Tự xem', guidance: 'Đối chiếu' }] } }] }] };
    expect(await collectLocalPageMistakes([source])).toEqual([]);
  });
  it('keeps source versions separate and accepts only supported answers', async () => {
    const source = record('错');
    const revised = structuredClone(source);
    revised.entryKey += ':history:new';
    revised.value.document.pages[0].blocks[0].body = 'Yêu cầu mới';
    expect(await collectLocalPageMistakes([source, revised])).toHaveLength(2);
    expect(checkPageRemediation(activity, '正在。')).toBe(true);
    expect(checkPageRemediation(activity, '错')).toBe(false);
    expect(pageRemediationAnswer(activity)).toBe('在');
    expect(pageActivityLessonId('lesson-page:["boot-1","page","block"]')).toBe('boot-1');
    expect(pageActivityLessonId('lesson-page:bad')).toBeNull();
  });
});
