import { emptyLessonBlock, type LessonPageDocument } from '../../src/learning/lessonPages';
import { LESSON_SCENES } from '../../src/learning/lessonPresentation';
import type { DictationManuscript } from './hsk2-dictation-manuscripts';

/** Editable ordinary blocks, rendered identically by Studio and the learner. */
export function buildDictationPages(manuscript: DictationManuscript): LessonPageDocument {
  const prefix = `${manuscript.lessonId}:dictation`;
  const pages: LessonPageDocument['pages'] = [{
    id: `${prefix}:prepare`, title: 'Nhận nhiệm vụ nghe', layout: 'focus', stage: 'context',
    blocks: [{ ...emptyLessonBlock(`${prefix}:context`), title: manuscript.objective, body: manuscript.context },
      { ...emptyLessonBlock(`${prefix}:method`), title: 'Cách nghe và tự kiểm', body: manuscript.preparation }],
  }];
  for (const item of [...manuscript.items, manuscript.transfer]) {
    pages.push({
      id: `${prefix}:${item.id}`, title: item === manuscript.transfer ? 'Nghe thông tin mới' : `Lượt nghe ${pages.length}`,
      layout: 'workshop', stage: item === manuscript.transfer ? 'transfer' : 'practice',
      blocks: [{ ...emptyLessonBlock(`${prefix}:${item.id}:write`), kind: 'dictation', title: 'Nghe rồi viết lại',
        body: 'Nghe một lượt để nắm ý, nghe lại để chép. Thử viết trước khi mở lời mẫu.',
        hanzi: item.hanzi, pinyin: item.pinyin, meaningVi: item.meaningVi },
      { ...emptyLessonBlock(`${prefix}:${item.id}:feedback`), title: 'Kiểm tra dữ kiện vừa nghe', body: `${item.focus} ${item.feedback}` }],
    });
  }
  pages.push({ id: `${prefix}:self-check`, title: 'Tự kiểm sau khi nghe', layout: 'focus', stage: 'transfer',
    blocks: manuscript.criteria.map((body, i) => ({ ...emptyLessonBlock(`${prefix}:criterion:${i}`), title: `Điểm tự kiểm ${i + 1}`, body })) });
  const scene=LESSON_SCENES[Number(manuscript.lessonId.slice(-2))-1];
  if(scene){pages[0].layout='scene';pages[0].illustration={...scene};}
  return { version: 1, art: 'sound', pages };
}
