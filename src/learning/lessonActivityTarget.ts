import type {Skill} from '../types';
export const ACTIVITY_SKILL_LABELS:Record<Skill,string>={pronunciation:'Hiểu âm và thanh điệu',listening:'Nghe hiểu',speaking:'Nói',reading:'Đọc hiểu',writing:'Viết',vocabulary:'Từ vựng',grammar:'Ngữ pháp'};
export const ACTIVITY_SOURCE_LABELS={vocabulary:'Từ vựng',character:'Chữ Hán',grammar:'Ngữ pháp',pronunciation:'Âm và thanh điệu',task:'Nhiệm vụ giao tiếp'};
export type LessonActivityTarget={skill:Skill;objective:string;sources:Array<{kind:keyof typeof ACTIVITY_SOURCE_LABELS;id:string}>};
export function isEditableActivityTarget(value:unknown):value is LessonActivityTarget {
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const v=value as LessonActivityTarget;
 return Object.hasOwn(ACTIVITY_SKILL_LABELS,v.skill)&&typeof v.objective==='string'&&v.objective.length<=1200
  &&Array.isArray(v.sources)&&v.sources.length<=30&&v.sources.every(s=>s&&typeof s==='object'&&Object.hasOwn(ACTIVITY_SOURCE_LABELS,s.kind)&&typeof s.id==='string'&&s.id.length<=240);
}
export function validateActivityTarget(value:unknown):string[] {
 if(!isEditableActivityTarget(value))return ['Mục tiêu hoạt động có cấu trúc chưa hợp lệ.'];
 const ids=value.sources.map(s=>`${s.kind}:${s.id.trim()}`);
 return [
  ...(!value.objective.trim()?['Mục tiêu cần mô tả người học sẽ làm được gì.']:[]),
  ...(!ids.length||value.sources.some(s=>!s.id.trim())?['Chọn ít nhất một nguồn cho mục tiêu hoạt động.']:[]),
  ...(new Set(ids).size!==ids.length?['Nguồn mục tiêu không được trùng.']:[]),
 ];
}
