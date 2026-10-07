import { isLessonPageDocument, type LessonPageDocument } from './lessonPages';
import {isLessonPageFirstAttempt,type LessonPageFirstAttempt} from './lessonPageAttempt';

export type ReadingDraft = { text: string; revealed: boolean; compared: boolean; everRevealed?: boolean; answerIds?: string[]; usedHint?: boolean; everChecked?: boolean; showPinyin?: boolean; firstAttempt?:LessonPageFirstAttempt; timerStartedAt?:string };
export type ReadingPosition = { index: number; blockIndex?: number; drafts: Record<string, ReadingDraft>; showTranscript: boolean };
export type LessonReadingSession = ReadingPosition & { version: 1; lessonId: string; document: LessonPageDocument; title?: string; objective?: string };
export const emptyReadingPosition = (): ReadingPosition => ({ index: 0, drafts: {}, showTranscript: false });
export const lessonReadingEntryKey = (lessonId: string) => `lesson-reading:v1:${JSON.stringify(lessonId)}`;

export function parseLessonReadingSession(value: unknown, lessonId: string): LessonReadingSession | null {
  if (!value || typeof value !== 'object') return null;
  const session = value as LessonReadingSession;
  if (session.version !== 1 || session.lessonId !== lessonId || !isLessonPageDocument(session.document)
    || !Number.isInteger(session.index) || session.index < 0 || session.index >= session.document.pages.length
    || typeof session.showTranscript !== 'boolean' || !session.drafts || typeof session.drafts !== 'object' || Array.isArray(session.drafts)
    || (session.title !== undefined && typeof session.title !== 'string')
    || (session.objective !== undefined && typeof session.objective !== 'string')) return null;
  // Older v1 snapshots have no blockIndex and continue at the first item.
  // Reject malformed positions without overwriting the saved document/drafts.
  if (session.blockIndex !== undefined && (!Number.isInteger(session.blockIndex)
    || session.blockIndex < 0 || session.blockIndex >= session.document.pages[session.index].blocks.length)) return null;
  const ids = new Set(session.document.pages.flatMap(page => page.blocks.filter(block => (block.kind === 'dictation' || block.kind === 'audio' || block.kind === 'reflection' || block.kind === 'activity' || block.kind === 'reading')).map(block => block.id)));
  for (const [id, draft] of Object.entries(session.drafts)) {
    if (!ids.has(id) || !draft || typeof draft.text !== 'string' || draft.text.length > 12000
      || typeof draft.revealed !== 'boolean' || typeof draft.compared !== 'boolean'
      || (draft.answerIds !== undefined && (!Array.isArray(draft.answerIds)||draft.answerIds.length>30||draft.answerIds.some(id=>typeof id!=='string')))
      || (draft.showPinyin !== undefined && typeof draft.showPinyin !== 'boolean')
      || (draft.firstAttempt !== undefined && !isLessonPageFirstAttempt(draft.firstAttempt))
      || (draft.timerStartedAt !== undefined && (typeof draft.timerStartedAt !== 'string'||!Number.isFinite(Date.parse(draft.timerStartedAt))))
      || (draft.usedHint !== undefined && typeof draft.usedHint !== 'boolean')
      || (draft.everChecked !== undefined && typeof draft.everChecked !== 'boolean')
      || (draft.everRevealed !== undefined && typeof draft.everRevealed !== 'boolean')) return null;
  }
  return session;
}
