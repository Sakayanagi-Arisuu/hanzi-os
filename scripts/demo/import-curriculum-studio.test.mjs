import { describe, it, expect } from 'vitest';
import { curriculumStudioPlan } from './import-curriculum-studio.mjs';
import { RELEASED_LESSONS, RELEASED_VOCABULARY } from '../../src/data/curriculum.ts';
import { getRichLessonContent } from '../../src/learning/richLessonContent.ts';

describe('source-linked editorial curriculum import', () => {
  it('keeps every linked word and preserves the original rich content', () => {
    const plan = curriculumStudioPlan();
    expect(new Set(plan.map(item => item.stableKey)).size).toBe(plan.length);
    const linked = new Set(RELEASED_LESSONS.flatMap(lesson => lesson.wordIds));
    const words = plan.filter(item => item.itemType === 'vocabulary');
    expect(words).toHaveLength(RELEASED_VOCABULARY.filter(word => linked.has(word.id)).length);
    for (const item of plan) {
      expect(item.content.review.humanReviewed).toBe(false);
      expect(item.content.sourceLessonIds.length).toBeGreaterThan(0);
      if (item.itemType !== 'communicative_function') continue;
      const lesson = RELEASED_LESSONS.find(lesson => lesson.id === item.content.sourceLessonIds[0]);
      expect(item.content.sourceRichLesson).toEqual(getRichLessonContent(lesson.id));
      expect(item.content.tasks.length).toBeGreaterThan(0);
      expect(new Set(item.content.tasks.map(task => task.answer)).size).toBe(item.content.tasks.length);
      for (const task of item.content.tasks) {
        expect(lesson.wordIds).toContain(task.sourceVocabularyId);
        const source = RELEASED_VOCABULARY.find(word => word.id === task.sourceVocabularyId);
        expect([task.answer,task.answerPinyin,task.answerMeaningVi]).toEqual([source.example,source.examplePinyin,source.exampleMeaning]);
      }
    }
  }, 60000);
});
