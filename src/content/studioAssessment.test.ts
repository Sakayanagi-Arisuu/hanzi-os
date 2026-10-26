import { describe,it,expect } from 'vitest';
import { assessmentItemErrors } from './studioAssessment';
const item={contentKind:'assessment-item',skill:'vocabulary',prompt:'你',instruction:'Chọn nghĩa',options:['Bạn','Tôi','Họ','Cô ấy'],answerIndex:0,explanationVi:'你 là bạn.',provenance:'Nguyên bản.',stimulusText:''};
describe('Diagnostic authoring validation',()=>{
  it('rejects empty, duplicate or oversized options and missing answer',()=>{
    expect(assessmentItemErrors(item)).toEqual([]);
    for(const patch of [{options:['a','a','b','c']},{answerIndex:-1},{options:['a','b','c','x'.repeat(501)]},{skill:'speaking'},{provenance:''}])expect(assessmentItemErrors({...item,...patch}).length).toBeGreaterThan(0);
  });
  it('requires a spoken stimulus for synthetic listening',()=>{
    expect(assessmentItemErrors({...item,skill:'listening'}).length).toBeGreaterThan(0);
    expect(assessmentItemErrors({...item,skill:'listening',stimulusText:'你好'})).toEqual([]);
  });
});
