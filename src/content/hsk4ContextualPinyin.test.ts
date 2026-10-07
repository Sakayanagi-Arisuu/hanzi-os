import {readFileSync,readdirSync} from 'node:fs';
import {expect,it} from 'vitest';
import {contextualPinyinPlan,correctHsk4ContextualPinyin} from '../../scripts/content/hsk4-contextual-pinyin.mjs';
it('corrects reviewed contextual pronunciation without changing the rest of the lesson',()=>{
 const items=readdirSync('content/drafts').filter(f=>/^thien-lo-hsk4-.*-v2.json$/.test(f)).flatMap(f=>JSON.parse(readFileSync(`content/drafts/${f}`,'utf8')).items??[]);
 for(const scope of contextualPinyinPlan.lessons){
  const original=items.find(i=>i.lessonId===scope.lessonId).studioContent;
  const next=correctHsk4ContextualPinyin(original);
  for(const change of scope.changes){
   const keys=change.path.split('.');const key=keys.pop()!;
   const parent=keys.reduce((v:Record<string,unknown>,k:string)=>v[k] as Record<string,unknown>,next);
   expect(parent[key]).toBe(change.after);
   parent[key]=change.before;
  }
  expect(next).toEqual(original);
  expect(()=>correctHsk4ContextualPinyin(correctHsk4ContextualPinyin(original))).toThrow('Context changed');
  const drift=structuredClone(original);drift.dialogue[0].pinyin+=' ';
  if(scope.changes.some((c:{path:string})=>c.path==='dialogue.0.pinyin'))expect(()=>correctHsk4ContextualPinyin(drift)).toThrow('Context changed');
 }
});
