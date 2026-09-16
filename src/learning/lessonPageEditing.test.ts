import { describe, expect, it } from 'vitest';
import { duplicateLessonPage } from './lessonPageEditing';
import { evaluateLessonActivity } from './lessonActivities';
import { validateLessonPages, type LessonPageDocument } from './lessonPages';
import school from '../../content/drafts/thien-lo-professional-1-v2.json';

describe('duplicating authored pages', () => {
  it('preserves answers and diagrams without sharing response keys or mutable data', () => {
    const original = structuredClone(school.lessonPages) as LessonPageDocument;
    const before = structuredClone(original);
    let sequence = 0;
    const copies = original.pages.map(page => duplicateLessonPage(page, () => `copy-${++sequence}`));
    expect(validateLessonPages({ ...original, pages: [...original.pages, ...copies] })).toEqual([]);
    const oldIds = new Set(original.pages.flatMap(page => [page.id, ...page.blocks.map(block => block.id)]));
    expect(copies.flatMap(page => [page.id, ...page.blocks.map(block => block.id)]).every(id => !oldIds.has(id))).toBe(true);
    for (const page of copies) for (const block of page.blocks) {
      if (block.activity?.type === 'choice' || block.activity?.type === 'order') {
        expect(evaluateLessonActivity(block.activity, { text: '', answerIds: block.activity.answerIds })).toBe('correct');
        block.activity.options[0].text = 'Changed copy';
      }
      if (block.diagram) block.diagram.nodes[0].label = 'Changed copy';
    }
    expect(original).toEqual(before);
  });
});
