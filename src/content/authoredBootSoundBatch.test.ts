import {expect,it} from 'vitest';
import batch from '../../content/drafts/thien-lo-boot-sound-batch-v2.json';
import {LESSON_BY_ID} from '../data/curriculum';
import {validateStudioContent} from './studioContent';
import {validateLessonPages,type LessonPageDocument} from '../learning/lessonPages';
import {evaluateLessonActivity} from '../learning/lessonActivities';

it('preserves both foundation lesson identities and source links through the Studio payload',async()=>{
 expect(batch.items.map(i=>i.lessonId)).toEqual(['boot-3','boot-4']);
 for(const item of batch.items){
  const lesson=LESSON_BY_ID.get(item.lessonId)!;
  expect(item.studioContent.vocabulary).toEqual(lesson.wordIds);
  expect(item.studioContent.prerequisites).toEqual(lesson.prerequisiteIds);
  expect(item.studioContent.skills).toEqual(lesson.skills);
  expect(item.studioContent.lessonPages).toEqual(item.lessonPages);
  expect(validateLessonPages(item.lessonPages)).toEqual([]);
  const checked=await validateStudioContent('lesson',item.studioContent);
  expect(checked.result.errors.map(e=>e.path)).toEqual(['review.aiSelfReview']);
 }
});
it('keeps sandhi examples explicit and does not mistake an ordinal for an ordinary yi phrase',()=>{
 const item=batch.items.find(i=>i.lessonId==='boot-4')!;
 const blocks=(item.lessonPages as LessonPageDocument).pages.flatMap(p=>p.blocks);
 const first=blocks.find(b=>b.id.endsWith(':first'))!;
 expect(first.hanzi).toBe('第一');
 expect(first.pinyin).toBe('dì yī');
 const book=blocks.find(b=>b.id.endsWith(':book'))!;
 expect(book.pinyin).toBe('yī běn shū');
 expect(book.body).toContain('yì běn shū');
 const transfer=blocks.find(b=>b.id.endsWith(':transfer'))!;
 expect(transfer.body).toContain('一起');
 expect(transfer.activity!.explanation).toContain('yì qǐ');
 expect(blocks.filter(b=>b.kind==='dialogue').some(b=>b.hanzi==='一起')).toBe(false);
 const ordinal=blocks.find(b=>b.id.endsWith(':ordinal'))!.activity!;
 expect(evaluateLessonActivity(ordinal,{text:'',answerIds:[ordinal.options.find(o=>o.text==='yī')!.id]})).toBe('correct');
 expect(evaluateLessonActivity(ordinal,{text:'',answerIds:[ordinal.options.find(o=>o.text==='yì')!.id]})).toBe('incorrect');
});
it('teaches aspiration separately from placement and keeps pronunciation reflection unscored',()=>{
 const item=batch.items.find(i=>i.lessonId==='boot-3')!;
 const blocks=(item.lessonPages as LessonPageDocument).pages.flatMap(p=>p.blocks);
 expect(blocks.find(b=>b.id.endsWith(':air'))!.diagram!.nodes.map(n=>n.label)).toEqual(['j → q','zh → ch','z → c']);
 expect(blocks.find(b=>b.id.endsWith(':vowels'))!.body).toContain('khác phần âm sau');
 const reflection=blocks.find(b=>b.id.endsWith(':self-observe'))!.activity!;
 expect(evaluateLessonActivity(reflection,{text:'Tôi nói rất chuẩn'})).toBe('self-review');
 expect(reflection.explanation).toContain('chưa chứng minh');
});
