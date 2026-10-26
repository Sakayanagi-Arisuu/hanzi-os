import { normalizeLessonAnswer, type LessonActivity } from '../learning/lessonActivities';
import type { LessonBlock } from '../learning/lessonPages';

/** Practice only: exposure in the reading page never becomes independent mastery. */
export function pageRemediationPresentation(block: LessonBlock) {
  const activity = block.activity;
  if (!activity || activity.type === 'rubric') return null;
  return {
    kind: 'recall' as const,
    instruction: activity.type === 'order' ? 'Viết lại câu theo đúng thứ tự' : 'Tự trả lời lại câu trong bài',
    prompt: block.body,
    promptMeta: activity.type === 'order' ? activity.options.map(option => option.text).join(' · ') : undefined,
    options: activity.type === 'choice' ? activity.options.map(option => option.text) : [],
    hint: activity.hint || 'Đọc lại ngữ cảnh trong bài gốc rồi tự diễn đạt câu trả lời.',
  };
}

export function pageRemediationAnswer(activity: LessonActivity) {
  if (activity.type === 'cloze') return activity.acceptedAnswers[0] ?? '';
  return activity.answerIds.map(id => activity.options.find(option => option.id === id)?.text ?? '').join(' ');
}

export function checkPageRemediation(activity: LessonActivity, answer: string) {
  if (activity.type === 'rubric' || !normalizeLessonAnswer(answer)) return false;
  const candidates = activity.type === 'cloze' ? activity.acceptedAnswers : [pageRemediationAnswer(activity)];
  return candidates.some(candidate => normalizeLessonAnswer(candidate) === normalizeLessonAnswer(answer));
}

export function pageActivityLessonId(activityId: string): string | null {
  if (!activityId.startsWith('lesson-page:')) return null;
  try {
    const parts: unknown = JSON.parse(activityId.slice('lesson-page:'.length));
    return Array.isArray(parts) && parts.length === 3 && parts.every(part => typeof part === 'string' && part.length > 0)
      ? parts[0] : null;
  } catch { return null; }
}
