export const ASSESSMENT_SKILLS = { vocabulary: 'Từ vựng', pronunciation: 'Nhận diện âm', reading: 'Đọc hiểu', grammar: 'Ngữ pháp', listening: 'Nghe (âm tổng hợp)' } as const;
export type StudioAssessmentItem = { contentKind: 'assessment-item'; skill: keyof typeof ASSESSMENT_SKILLS; prompt: string; instruction: string; options: string[]; answerIndex: number; explanationVi: string; stimulusText: string; provenance: string };
export function assessmentItemErrors(value: unknown): string[] {
  const item = value as Partial<StudioAssessmentItem> | null;
  if (!item || typeof item !== 'object') return ['Nội dung câu hỏi không hợp lệ.'];
  const errors: string[] = [];
  if (!Object.hasOwn(ASSESSMENT_SKILLS, item.skill ?? '')) errors.push('Chọn kỹ năng cần khảo nghiệm.');
  for (const [key,label,max] of [['prompt','Câu hỏi',1000],['instruction','Hướng dẫn',500],['explanationVi','Giải thích',2000],['provenance','Nguồn và quyền sử dụng',1000]] as const) if (typeof item[key] !== 'string' || !item[key]!.trim() || item[key]!.length>max) errors.push(`${label} còn thiếu hoặc quá dài.`);
  if (!Array.isArray(item.options) || item.options.length !== 4 || item.options.some(option=>typeof option!=='string'||!option.trim()||option.length>500) || new Set(item.options.map(option=>String(option).trim().normalize('NFC'))).size!==4) errors.push('Cần bốn lựa chọn có nội dung khác nhau.');
  if (!Number.isInteger(item.answerIndex) || Number(item.answerIndex)<0 || Number(item.answerIndex)>3) errors.push('Chọn một đáp án đúng.');
  if (item.skill==='listening' && (typeof item.stimulusText!=='string'||!item.stimulusText.trim()||item.stimulusText.length>500)) errors.push('Câu nghe cần văn bản tiếng Trung để đọc.');
  return errors;
}
