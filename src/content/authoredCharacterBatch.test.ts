import {expect,it} from 'vitest';
import batch from '../../content/drafts/thien-lo-character-batch-v2.json';
import {LESSON_BY_ID} from '../data/curriculum';
import {getRichLessonContent} from '../learning/richLessonContent';
import {validateStudioContent} from './studioContent';
import {characterFocus} from '../../scripts/content/character-batch-focus';
import {CHARACTER_CONTEXT_EXCEPTIONS} from '../learning/characterContextExceptions';
import type {LessonPageDocument} from '../learning/lessonPages';
import {characterTransfers} from '../../scripts/content/character-transfer-manuscripts';
import {evaluateLessonActivity} from '../learning/lessonActivities';

it('retains all 15 lesson identities and 246 linked character records in editable drafts',async()=>{
 expect(batch.items.map(i=>i.lessonId)).toEqual(characterFocus.map(f=>f.id));
 expect(batch.items.reduce((n,i)=>n+i.studioContent.sourceCharacterIds.length,0)).toBe(246);
 for(const item of batch.items){
  const lesson=LESSON_BY_ID.get(item.lessonId)!;
  const rich=getRichLessonContent(item.lessonId)!;
  expect(item.studioContent.vocabulary).toEqual(lesson.wordIds);
  expect(item.studioContent.prerequisites).toEqual(lesson.prerequisiteIds);
  expect(item.studioContent.skills).toEqual(lesson.skills);
  expect(item.studioContent.sourceCharacterIds).toEqual(rich.characters.map(c=>c.id));
  expect(item.studioContent.lessonPages).toEqual(item.lessonPages);
  const validation=await validateStudioContent('lesson',item.studioContent);
  expect(validation.result.errors.map(e=>e.path)).toEqual(['review.aiSelfReview']);
 }
});

it('embeds every exceptional reading explanation in editable content rather than relying on renderer code',()=>{
 const blocks=batch.items.flatMap(i=>i.lessonPages.pages.flatMap(p=>p.blocks));
 for(const item of CHARACTER_CONTEXT_EXCEPTIONS){
  const matching=blocks.filter(b=>b.title===`Chữ mục tiêu: ${item.hanzi}`&&b.hanzi===item.contextWord&&b.pinyin===item.contextPinyin);
  expect(matching.length).toBeGreaterThan(0);
  for(const block of matching)expect(block.body).toContain(item.note);
 }
});
it('offers delayed guided retrieval for every linked character without leaking repeated target glyphs',()=>{
 for(const item of batch.items){
  const rich=getRichLessonContent(item.lessonId)!;
  const pages=(item.lessonPages as LessonPageDocument).pages;
  const recall=pages.filter(p=>p.id.includes(':v2:recall-')).flatMap(p=>p.blocks);
  expect(recall).toHaveLength(rich.characters.length);
  expect(pages.findIndex(p=>p.id.includes(':v2:recall-'))).toBeGreaterThan(pages.findLastIndex(p=>p.id.includes(':v2:glyphs-')));
  for(const c of rich.characters){
   const block=recall.find(b=>b.id.endsWith(`recall-${c.id}`))!;
   expect(block.activity?.acceptedAnswers).toContain(c.hanzi);
   const masked=block.body.split(': ')[1].split('. ')[0];
   expect(masked).not.toContain(c.hanzi);
   expect(masked.split('□').join(c.hanzi)).toBe(c.contextWord);
  }
 }
});
it('accepts an ambiguous doing character and disambiguates Sunday by the requested reading',()=>{
 const blocks=batch.items.flatMap(i=>(i.lessonPages as LessonPageDocument).pages.flatMap(p=>p.blocks));
 const doing=blocks.find(b=>b.id.includes('recall-')&&b.activity?.acceptedAnswers.includes('做'))!;
 expect(evaluateLessonActivity(doing.activity!,{text:'作'})).toBe('correct');
 expect(evaluateLessonActivity(doing.activity!,{text:'坐'})).toBe('incorrect');
 expect(doing.activity!.explanation).toContain('工作');
 const sunday=batch.items.find(i=>i.lessonId==='characters-8')!;
 const guided=(sunday.lessonPages as LessonPageDocument).pages.find(p=>p.id.endsWith(':guided'))!.blocks[0];
 expect(guided.body).toContain('đọc xīngqīrì');
 expect(guided.activity!.explanation).toContain('星期天 cũng là chủ nhật');
 expect(sunday.studioContent.exercises[0].promptVi).toContain('đọc xīngqīrì');
});

it('gives whole-expression readings and asks for a missing character without repeating the solved expression',()=>{
 for(const item of batch.items){
  const focus=characterFocus.find(f=>f.id===item.lessonId)!;
  const example=item.studioContent.dialogue[0];
  expect(example.hanzi).toBe(focus.context);
  expect(example.pinyin.trim()).not.toBe('');
  expect(item.studioContent.dialogue[1].hanzi).not.toBe(example.hanzi);
  const exercise=item.studioContent.exercises[0];
  expect(exercise.promptVi).not.toContain(focus.context);
  expect(exercise.promptVi).toContain('____');
  const masked=exercise.promptVi.split(': ').at(-1)!;
  expect(masked).not.toContain(focus.target);
  expect(masked.replaceAll('____',exercise.answer).replace(/\.$/u,'')).toBe(focus.context);
  expect(exercise.answerPinyin).toBe(focus.pinyin);
  expect(exercise.distractors).not.toContain(exercise.answer);
 }
 expect(batch.items.find(i=>i.lessonId==='characters-3')!.studioContent.dialogue[0].pinyin).toBe('māma');
 expect(batch.items.find(i=>i.lessonId==='characters-14')!.studioContent.dialogue[0].pinyin).toBe('yī běn shū');
});
it('varies correct option positions while keeping each answer and its feedback bound to the target',()=>{
 const positions:number[]=[];
 for(const item of batch.items){
  const focus=characterFocus.find(f=>f.id===item.lessonId)!;
  const activity=(item.lessonPages as LessonPageDocument).pages.find(p=>p.id.endsWith(':choice'))!.blocks[0].activity!;
  const answerIndex=activity.options.findIndex(o=>o.id===activity.answerIds[0]);
  positions.push(answerIndex);
  expect(activity.options[answerIndex].text).toBe(focus.answer);
  expect(activity.options[answerIndex].feedback).toContain(`${focus.answer} đúng vị trí`);
 }
 expect([0,1,2].map(position=>positions.filter(p=>p===position).length)).toEqual([5,5,5]);
 const repeated=batch.items.find(i=>i.lessonId==='characters-3')!.studioContent.exercises[0].promptVi;
 expect(repeated).toContain('hai ô dùng cùng một chữ');
 expect(repeated).not.toContain('妈');
});
it('binds every transfer to its own situation, model and concrete comparison criteria',()=>{
 expect(new Set(Object.values(characterTransfers).map(t=>t.hanzi)).size).toBe(15);
 for(const item of batch.items){
  const transfer=characterTransfers[item.lessonId];
  const block=(item.lessonPages as LessonPageDocument).pages.find(p=>p.id.endsWith(':transfer'))!.blocks[0];
  expect(block.body).toContain(transfer.prompt);
  expect(block.activity?.rubric.map(c=>c.guidance)).toEqual(transfer.criteria);
  for(const value of [transfer.hanzi,transfer.pinyin,transfer.meaning])expect(block.activity?.explanation).toContain(value);
  expect(item.studioContent.checkpointVi).toBe(transfer.prompt);
 }
});
