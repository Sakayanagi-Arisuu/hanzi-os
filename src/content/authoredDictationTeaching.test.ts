import { expect, it } from 'vitest';
import { dictationManuscripts } from '../../scripts/content/hsk2-dictation-manuscripts';
import { buildDictationPages } from '../../scripts/content/build-dictation-pages';
import { isEditableLessonPageDocument, validateLessonPages } from '../learning/lessonPages';
import { emptyReadingPosition, parseLessonReadingSession } from '../learning/lessonReadingSession';

it('builds all three scripts as editable listening tasks with separate feedback and changed transfer data', () => {
  expect(dictationManuscripts.map(m => m.lessonId)).toEqual([1,2,3].map(n => `hsk2-dictation-lesson-0${n}`));
  for (const manuscript of dictationManuscripts) {
    const document = buildDictationPages(manuscript);
    expect(validateLessonPages(document)).toEqual([]);
    expect(isEditableLessonPageDocument(document)).toBe(true);
    const listening = document.pages.filter(p => p.blocks.some(b => b.kind === 'dictation'));
    expect(listening).toHaveLength(5);
    for (const [index, item] of [...manuscript.items, manuscript.transfer].entries()) {
      const page = listening[index];
      expect(page.blocks[0]).toMatchObject({kind:'dictation',hanzi:item.hanzi,pinyin:item.pinyin,meaningVi:item.meaningVi});
      expect(page.blocks[0].body).not.toContain(item.hanzi);
      expect(page.blocks[1].body).toContain(item.feedback);
      expect(page.blocks[0].media).toBeUndefined(); // No fabricated native recording.
      const draft = {text:'我的草稿',compared:true,revealed:false,everRevealed:true};
      const saved = {...emptyReadingPosition(),version:1,lessonId:manuscript.lessonId,document,drafts:{[page.blocks[0].id]:draft}};
      expect(parseLessonReadingSession(JSON.parse(JSON.stringify(saved)),manuscript.lessonId)).toEqual(saved);
    }
    expect(listening.at(-1)?.stage).toBe('transfer');
    expect(manuscript.items.map(i => i.hanzi)).not.toContain(manuscript.transfer.hanzi);
  }
});
