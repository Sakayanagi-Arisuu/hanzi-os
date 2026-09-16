import {isEditableActivityTarget,validateActivityTarget,type LessonActivityTarget} from './lessonActivityTarget';
export type LessonActivity = {
  learningTarget?:LessonActivityTarget;
  type: 'choice' | 'order' | 'cloze' | 'rubric';
  options: Array<{ id: string; text: string; feedback: string }>;
  answerIds: string[];
  acceptedAnswers: string[];
  explanation: string;
  hint: string;
  rubric: Array<{ id: string; label: string; guidance: string }>;
};
export const emptyLessonActivity = (): LessonActivity => ({ type:'choice',options:[],answerIds:[],acceptedAnswers:[],explanation:'',hint:'',rubric:[] });
const record = (v:unknown):v is Record<string,unknown> => !!v&&typeof v==='object'&&!Array.isArray(v);
const text = (v:unknown):v is string => typeof v==='string'&&v.length<=12000;
export function isEditableLessonActivity(v:unknown):v is LessonActivity {
  return record(v)&&['choice','order','cloze','rubric'].includes(String(v.type))
    &&(v.learningTarget===undefined||isEditableActivityTarget(v.learningTarget))
    &&text(v.explanation)&&text(v.hint)
    &&Array.isArray(v.options)&&v.options.length<=30&&v.options.every(o=>record(o)&&text(o.id)&&text(o.text)&&text(o.feedback))
    &&Array.isArray(v.answerIds)&&v.answerIds.length<=30&&v.answerIds.every(text)
    &&Array.isArray(v.acceptedAnswers)&&v.acceptedAnswers.length<=30&&v.acceptedAnswers.every(text)
    &&Array.isArray(v.rubric)&&v.rubric.length<=12&&v.rubric.every(r=>record(r)&&text(r.id)&&text(r.label)&&text(r.guidance));
}
export const normalizeLessonAnswer = (text:string) => text.normalize('NFKC').trim().replace(/[\s，。！？,.!?]/gu,'');
export function validateLessonActivity(value:unknown):string[] {
  if(!isEditableLessonActivity(value))return ['Bài tập có cấu trúc chưa hợp lệ.'];
  const errors:string[]=[];
  if(value.learningTarget!==undefined)errors.push(...validateActivityTarget(value.learningTarget));
  const ids=value.options.map(o=>o.id);
  if(!value.explanation.trim())errors.push('Bài tập cần giải thích sau khi làm.');
  if(value.type==='choice'||value.type==='order') {
    if(value.options.length<2||ids.some(id=>!id)||new Set(ids).size!==ids.length||value.options.some(o=>!o.text.trim()))errors.push('Cần ít nhất hai lựa chọn có mã riêng và nội dung.');
    if(value.answerIds.some(id=>!ids.includes(id))||new Set(value.answerIds).size!==value.answerIds.length)errors.push('Đáp án phải tham chiếu lựa chọn hợp lệ, không lặp mã.');
    if(value.type==='choice'&&(value.answerIds.length!==1||value.options.some(o=>!o.feedback.trim())))errors.push('Câu chọn cần một đáp án đúng và phản hồi cho từng lựa chọn.');
    if(value.type==='order'&&value.answerIds.length!==ids.length)errors.push('Đáp án sắp xếp phải dùng đủ mỗi mảnh đúng một lần.');
  }
  if(value.type==='cloze'&&(!value.acceptedAnswers.length||value.acceptedAnswers.some(a=>!normalizeLessonAnswer(a))))errors.push('Điền chỗ trống cần ít nhất một đáp án được chấp nhận.');
  if(value.type==='rubric'&&(!value.rubric.length||new Set(value.rubric.map(r=>r.id)).size!==value.rubric.length||value.rubric.some(r=>!r.id||!r.label.trim()||!r.guidance.trim())))errors.push('Câu mở cần tiêu chí riêng kèm hướng dẫn tự kiểm.');
  return errors;
}
export function evaluateLessonActivity(activity:LessonActivity, response:{text:string;answerIds?:string[]}):'correct'|'incorrect'|'self-review' {
  if(activity.type==='rubric')return 'self-review';
  if(activity.type==='cloze')return activity.acceptedAnswers.some(a=>normalizeLessonAnswer(a)===normalizeLessonAnswer(response.text))?'correct':'incorrect';
  return JSON.stringify(response.answerIds??[])===JSON.stringify(activity.answerIds)?'correct':'incorrect';
}
