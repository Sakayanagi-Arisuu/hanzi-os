import {expect,it} from 'vitest';
import {referenceDecisions} from '../../scripts/content/hsk2-reference-decisions';
import {buildGrammarPages} from '../../scripts/content/build-grammar-pages';
import {buildReconstructionPages,reconstructionTasks} from '../../scripts/content/hsk2-reconstruction-activities';
import {getRichLessonContent} from '../learning/richLessonContent';
import {evaluateLessonActivity} from '../learning/lessonActivities';
import {validateLessonPages} from '../learning/lessonPages';
import {validateLessonActivitySources} from '../learning/lessonActivitySources';
import {referenceWordExamples} from '../../scripts/content/hsk2-reference-word-examples';
import {LESSON_BY_ID,WORD_BY_ID} from '../data/curriculum';
it('replaces fragmentary vocabulary examples without confusing hands with watches',()=>{
 const ids=[...[1,2,3,4].map(n=>`hsk2-reference-description-comparison-lesson-0${n}`),...Object.keys(reconstructionTasks)];
 for(const id of new Set(ids.flatMap(id=>LESSON_BY_ID.get(id)!.wordIds))){
  const word=WORD_BY_ID.get(id)!;
  const example=referenceWordExamples[id]??[word.example,word.examplePinyin,word.exampleMeaning];
  expect(example[0]).toContain(word.simplified);
  expect(example[0].length).toBeGreaterThan(word.simplified.length+1);
  expect(example[1]).toBeTruthy();expect(example[2]).toBeTruthy();
 }
 expect(referenceWordExamples['hsk-vocab-00433'][0]).not.toContain('手表');
});
it('binds all 36 reference rows to editable explanation and practice',()=>{
 const ids=[1,2,3,4].map(n=>`hsk2-reference-description-comparison-lesson-0${n}`);
 const sourceIds=ids.flatMap(id=>getRichLessonContent(id)!.grammar.map(g=>g.id));
 expect(referenceDecisions.map(d=>d.row).sort()).toEqual([...sourceIds].sort());
 expect(sourceIds).toHaveLength(36);
 for(const id of ids){
  const pages=buildGrammarPages(id,referenceDecisions);
  expect(pages).toHaveLength(18);
  expect(validateLessonPages({version:1,pages})).toEqual([]);
 }
});
it('distinguishes approximation, age difference and direction of comparison',()=>{
 const pages=[1,2,3,4].flatMap(n=>buildGrammarPages(`hsk2-reference-description-comparison-lesson-0${n}`,referenceDecisions));
 const activities=pages.flatMap(p=>p.blocks).flatMap(b=>b.activity?[b.activity]:[]);
 for(const [row,correct,wrong] of [['059','23','3'],['060','没有','比'],['073','不知道','知道'],['030','地','得']]){
  const activity=activities.find(a=>a.learningTarget?.sources[0].id===`hsk2-grammar-row-${row}`)!;
  expect(evaluateLessonActivity(activity,{text:correct})).toBe('correct');
  expect(evaluateLessonActivity(activity,{text:wrong})).toBe('incorrect');
 }
});
it('builds actual order tasks with unique pieces, explicit constraints and source identity',()=>{
 for(const id of Object.keys(reconstructionTasks)){
  const pages=buildReconstructionPages(id);
  expect(validateLessonPages({version:1,pages})).toEqual([]);
  expect(validateLessonActivitySources(id,{version:1,pages})).toEqual([]);
  for(const page of pages){
   const activity=page.blocks[0].activity!;
   expect(activity.type).toBe('order');
   expect(evaluateLessonActivity(activity,{text:'',answerIds:activity.answerIds})).toBe('correct');
   expect(evaluateLessonActivity(activity,{text:'',answerIds:activity.options.map(o=>o.id)})).toBe('incorrect');
   expect(new Set(activity.answerIds).size).toBe(activity.options.length);
   expect(page.blocks[0].body).toMatch(/Bắt đầu|Đặt|Đưa|Xếp/i);
  }
 }
});
