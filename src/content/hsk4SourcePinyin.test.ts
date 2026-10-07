import {readFileSync,readdirSync} from 'node:fs';
import {expect,it} from 'vitest';
import {pinyinCorrectionScopes,correctHsk4SourcePinyin} from '../../scripts/content/hsk4-pinyin-source-corrections.mjs';
it('propagates source pronunciation to the model and reading consumers without changing Hanzi or answers',()=>{
 const items=readdirSync('content/drafts').filter(f=>/^thien-lo-hsk4-.*-v2.json$/.test(f)).flatMap(f=>JSON.parse(readFileSync(`content/drafts/${f}`,'utf8')).items??[]);
 for(const [id,scope] of Object.entries(pinyinCorrectionScopes)){
  const original=items.find(i=>i.lessonId===id).studioContent;
  const next=correctHsk4SourcePinyin(original);
  expect(JSON.stringify(next)).not.toContain(scope.before);
  expect(JSON.stringify(next)).toContain(scope.after);
  const stripPinyin=(value:unknown):unknown=>Array.isArray(value)?value.map(stripPinyin):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>!/pinyin$/i.test(key)).map(([key,v])=>[key,stripPinyin(v)])):value;
  expect(stripPinyin(next)).toEqual(stripPinyin(original));
  expect(()=>correctHsk4SourcePinyin(next)).toThrow('Source consumers changed');
 }
});
