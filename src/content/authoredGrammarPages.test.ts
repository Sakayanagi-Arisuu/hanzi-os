import {expect,it} from 'vitest';
import {buildGrammarPages} from '../../scripts/content/build-grammar-pages';
import {grammarDecisions} from '../../scripts/content/hsk2-grammar-decisions';
import {getRichLessonContent} from '../learning/richLessonContent';
import {evaluateLessonActivity} from '../learning/lessonActivities';
import {grammarWordExamples} from '../../scripts/content/hsk2-grammar-word-examples';
import {LESSON_BY_ID,WORD_BY_ID} from '../data/curriculum';

const ids=['aspect-time-experience','clause-linking','complements-and-motion'].flatMap(group=>[1,2].map(n=>`hsk2-${group}-lesson-0${n}`));
it('keeps homographic vocabulary senses separate and replaces fragmentary examples',()=>{
 const vocabularyIds=new Set(ids.flatMap(id=>LESSON_BY_ID.get(id)!.wordIds));
 for(const [id,example] of Object.entries(grammarWordExamples)){
  expect(vocabularyIds.has(id)).toBe(true);
  expect(example[0]).toContain(WORD_BY_ID.get(id)!.simplified);
  expect(example[1]).toBeTruthy();expect(example[2]).toBeTruthy();
 }
 for(const id of vocabularyIds){
  const word=WORD_BY_ID.get(id)!;
  const example=grammarWordExamples[id]?.[0]??word.example;
  expect(example.length).toBeGreaterThan(word.simplified.length+1);
 }
 expect(grammarWordExamples['hsk-vocab-00347'][0]).toContain('过马路');
 expect(grammarWordExamples['hsk-vocab-00347'][1]).toContain('Guò');
 expect(grammarWordExamples['hsk-vocab-00351'][0]).toContain('没去过');
 expect(grammarWordExamples['hsk-vocab-00351'][1]).toContain('qùguo');
 expect(grammarWordExamples['hsk-vocab-00490'][0]).not.toContain('着急');
});
it('covers every actual grammar row with its own editable explanation and targeted practice',()=>{
 const expected=ids.flatMap(id=>getRichLessonContent(id)!.grammar.map(g=>g.id));
 expect(grammarDecisions.map(d=>d.row).sort()).toEqual([...expected].sort());
 for(const id of ids){
  const source=getRichLessonContent(id)!.grammar;
  const pages=buildGrammarPages(id,grammarDecisions);
  expect(pages).toHaveLength(source.length*2);
  expect(new Set(pages.flatMap(p=>p.blocks.map(b=>b.id))).size).toBe(source.length*3);
  const activities=pages.flatMap(p=>p.blocks).flatMap(b=>b.activity?[b.activity]:[]);
  expect(activities.map(a=>a.learningTarget?.sources)).toEqual(source.map(g=>[{kind:'grammar',id:g.id}]));
  expect(JSON.parse(JSON.stringify(pages))).toEqual(pages);
 }
});
it('fails closed for missing or duplicate editorial decisions',()=>{
 expect(()=>buildGrammarPages(ids[0],grammarDecisions.slice(1))).toThrow('Missing editorial decision');
 expect(()=>buildGrammarPages(ids[0],[...grammarDecisions,grammarDecisions[0]])).toThrow('Duplicate');
});
it('rejects wrong reference point, certainty and completed-versus-understood answers',()=>{
 const cases=[['004','一定'],['031','不'],['032','过'],['040','已经'],['049','地'],['050','点'],['062','过'],['064','他'],['045','懂'],['048','出去']];
 const activities=ids.flatMap(id=>buildGrammarPages(id,grammarDecisions)).flatMap(p=>p.blocks).flatMap(b=>b.activity?[b.activity]:[]);
 for(const [row,wrong] of cases){
  const activity=activities.find(a=>a.learningTarget?.sources[0].id===`hsk2-grammar-row-${row}`)!;
  expect(evaluateLessonActivity(activity,{text:wrong})).toBe('incorrect');
  expect(evaluateLessonActivity(activity,{text:activity.acceptedAnswers[0]})).toBe('correct');
 }
});
