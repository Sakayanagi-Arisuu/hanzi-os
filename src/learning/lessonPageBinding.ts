import {sha256Hex} from '../sync/canonicalHash';
import type {LessonPageDocument} from './lessonPages';
export type LessonPageBinding={activityId:string;activityVersion:string;pageId:string;blockId:string;revisionId:string};
export const lessonPageDocumentHash=(document:LessonPageDocument)=>sha256Hex(document);
export function isLessonPageBinding(value:unknown):value is LessonPageBinding {
 if(!value||typeof value!=='object')return false;
 const v=value as Record<string,unknown>;
 return ['activityId','activityVersion','pageId','blockId','revisionId'].every(k=>typeof v[k]==='string'&&v[k].length>0&&v[k].length<=2000)
  &&/^lesson-page-v1:sha256:[a-f0-9]{64}$/.test(String(v.activityVersion));
}
export async function matchLessonPageBindings(value:unknown,lessonId:string,document:LessonPageDocument):Promise<Record<string,LessonPageBinding>>{
 if(!value||typeof value!=='object')return {};
 const v=value as {version?:unknown;lessonId?:unknown;documentHash?:unknown;activities?:unknown};
 if(v.version!==1||v.lessonId!==lessonId||v.documentHash!==await lessonPageDocumentHash(document)||!Array.isArray(v.activities))return {};
 const expected=document.pages.flatMap(p=>p.blocks.filter(b=>b.kind==='activity').map(b=>({pageId:p.id,blockId:b.id})));
 if(v.activities.length!==expected.length||!v.activities.every(isLessonPageBinding))return {};
 const bindings=v.activities as LessonPageBinding[];
 const result:Record<string,LessonPageBinding>={};
 for(const item of expected){
  const matches=bindings.filter(b=>b.pageId===item.pageId&&b.blockId===item.blockId);
  if(matches.length!==1)return {};
  const binding=matches[0];
  if(binding.activityId!==`lesson-page:${JSON.stringify([lessonId,item.pageId,item.blockId])}`)return {};
  result[item.blockId]=binding;
 }
 return result;
}
