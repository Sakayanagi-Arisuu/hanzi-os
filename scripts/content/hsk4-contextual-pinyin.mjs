import {readFileSync} from 'node:fs';
export const contextualPinyinPlan=JSON.parse(readFileSync(new URL('../../content/drafts/hsk4-contextual-pinyin-corrections-v1.json',import.meta.url),'utf8'));
export function correctHsk4ContextualPinyin(source){
 const scope=contextualPinyinPlan.lessons.find(l=>l.lessonId===source.targetLessonId);
 if(!scope)throw Error('Unreviewed contextual Pinyin lesson');
 const content=structuredClone(source);
 for(const change of scope.changes){
  const keys=change.path.split('.');const key=keys.pop();
  const parent=keys.reduce((value,k)=>value?.[k],content);
  if(!/pinyin$/i.test(key)||parent?.[key]!==change.before)throw Error('Context changed; re-audit before correction');
  parent[key]=change.after;
 }
 return content;
}
