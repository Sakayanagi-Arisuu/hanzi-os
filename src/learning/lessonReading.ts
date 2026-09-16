export type LessonReading = {
  instruction: string;
  notePrompt: string;
  paragraphs: Array<{ id:string; hanzi:string; pinyin:string; meaningVi:string }>;
};
export const emptyLessonReading=():LessonReading=>({instruction:'Đọc trọn văn bản trước, sau đó chọn đoạn làm bằng chứng cho ghi chú của bạn.',notePrompt:'Ý chính và bằng chứng bạn tìm được',paragraphs:[]});
export function isEditableLessonReading(value:unknown):value is LessonReading {
  if(!value||typeof value!=='object')return false;
  const r=value as LessonReading;
  return typeof r.instruction==='string'&&r.instruction.length<=4000&&typeof r.notePrompt==='string'&&r.notePrompt.length<=1000
    &&Array.isArray(r.paragraphs)&&r.paragraphs.length<=30&&r.paragraphs.every(p=>p&&['id','hanzi','pinyin','meaningVi'].every(key=>typeof p[key as keyof typeof p]==='string'&&p[key as keyof typeof p].length<=12000));
}
export function validateLessonReading(value:unknown):string[] {
  if(!isEditableLessonReading(value))return ['Văn bản đọc có cấu trúc chưa hợp lệ.'];
  const errors:string[]=[];
  if(!value.instruction.trim()||!value.notePrompt.trim())errors.push('Văn bản cần nhiệm vụ đọc và yêu cầu ghi chú.');
  if(!value.paragraphs.length||value.paragraphs.some(p=>!p.id.trim()||!p.hanzi.trim()||!p.pinyin.trim()||!p.meaningVi.trim())||new Set(value.paragraphs.map(p=>p.id)).size!==value.paragraphs.length)errors.push('Mỗi đoạn cần mã riêng, Hán tự, Pinyin và nghĩa Việt.');
  return errors;
}
