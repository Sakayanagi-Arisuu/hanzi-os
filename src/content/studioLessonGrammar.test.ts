import {describe,expect,it} from 'vitest';
import {projectStudioGrammar,validStudioGrammarExamples} from './studioLessonGrammar';
describe('explicit grammar example binding',()=>{
  it('does not fabricate an example or exercise for legacy rows',()=>{
    const row={pattern:'A 在 B',explanationVi:'A ở vị trí B.'};
    expect(validStudioGrammarExamples(row)).toBe(true);
    const projected=projectStudioGrammar(row,'grammar-1');
    expect(projected.modelExample.hanzi).toBe('');
    expect(projected.guidedPractice.modelAnswerHanzi).toBe('');
  });
  it('keeps the authored pair and rejects partial pairs at publication',()=>{
    const row={pattern:'A 在 B',explanationVi:'A ở vị trí B.',modelExample:{hanzi:'我在学校。',pinyin:'Wǒ zài xuéxiào.',meaningVi:'Tôi ở trường.'},guidedPractice:{promptVi:'Nói bạn đang ở nhà.',modelAnswerHanzi:'我在家。',modelAnswerPinyin:'Wǒ zài jiā.',modelAnswerMeaningVi:'Tôi ở nhà.'}};
    expect(validStudioGrammarExamples(row)).toBe(true);
    expect(projectStudioGrammar(row,'grammar-1').modelExample).toEqual(row.modelExample);
    expect(projectStudioGrammar(row,'grammar-1').guidedPractice).toEqual(row.guidedPractice);
    expect(validStudioGrammarExamples({...row,modelExample:{...row.modelExample,pinyin:''}})).toBe(false);
    expect(validStudioGrammarExamples({...row,guidedPractice:{...row.guidedPractice,promptVi:''}})).toBe(false);
  });
});
