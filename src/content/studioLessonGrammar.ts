import type {RichGrammarPoint} from '../learning/richLessonContent';
export type StudioLessonGrammar = {
  pattern:string;
  explanationVi:string;
  modelExample?:RichGrammarPoint['modelExample'];
  guidedPractice?:RichGrammarPoint['guidedPractice'];
};
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const fields=(v:unknown,keys:string[])=>record(v)&&keys.every(key=>typeof v[key]==='string'&&v[key].trim().length>0&&v[key].length<=2400);
export function validStudioGrammarExamples(value:unknown):boolean {
  if(!record(value))return false;
  return (value.modelExample===undefined||fields(value.modelExample,['hanzi','pinyin','meaningVi']))
    &&(value.guidedPractice===undefined||fields(value.guidedPractice,['promptVi','modelAnswerHanzi','modelAnswerPinyin','modelAnswerMeaningVi']));
}
/** Legacy rows without a bound example remain unbound; never borrow a random dialogue turn. */
export function projectStudioGrammar(row:StudioLessonGrammar,id:string):RichGrammarPoint {
  const safeText=(value:unknown)=>typeof value==='string'?value:'';
  const model:Record<string,unknown>=record(row.modelExample)?row.modelExample:{};
  const practice:Record<string,unknown>=record(row.guidedPractice)?row.guidedPractice:{};
  return {id,category:'BIÊN TẬP VIỆN',label:row.pattern,officialContent:row.pattern,explanationVi:row.explanationVi,
    modelExample:{hanzi:safeText(model.hanzi),pinyin:safeText(model.pinyin),meaningVi:safeText(model.meaningVi)},
    guidedPractice:{promptVi:safeText(practice.promptVi),modelAnswerHanzi:safeText(practice.modelAnswerHanzi),modelAnswerPinyin:safeText(practice.modelAnswerPinyin),modelAnswerMeaningVi:safeText(practice.modelAnswerMeaningVi)}};
}
