import {existsSync} from 'node:fs';
import {expect,it} from 'vitest';
import draft from '../../content/drafts/thien-lo-hsk3-nature-v2.json';
import {LESSON_BY_ID} from '../data/curriculum';
import {LESSON_SCENES} from '../learning/lessonPresentation';
import {validateLessonPages,type LessonPageDocument} from '../learning/lessonPages';
import {validateLessonActivitySources} from '../learning/lessonActivitySources';
import {evaluateLessonActivity} from '../learning/lessonActivities';

it('uses distinct compass layouts for the model and changed-situation writing',()=>{
 const item=draft.items.find(i=>i.lessonId.endsWith('landscape-place'))!;
 const maps=(item.lessonPages as LessonPageDocument).pages.flatMap(p=>p.blocks).filter(b=>b.diagram).map(b=>b.diagram!);
 expect(maps).toHaveLength(2);
 const position=(map:typeof maps[number],label:string)=>{const node=map.nodes.find(n=>n.label===label)!;return [node.x,node.y];};
 expect(position(maps[0],'花园')).toEqual([2,1]);
 expect(position(maps[1],'花园')).toEqual([1,2]);
 expect(position(maps[0],'湖')).toEqual([0,1]);
 expect(position(maps[1],'湖')).toEqual([1,0]);
 for(const map of maps)expect(position(map,'游客中心')).toEqual([1,1]);
});

it('preserves the five source lessons and exposes editable, contextual activities and art',()=>{
 expect(draft.items).toHaveLength(5);
 expect(new Set(draft.items.map(i=>i.lessonPages.pages[0].illustration!.src)).size).toBe(5);
 for(const item of draft.items){
  const lesson=LESSON_BY_ID.get(item.lessonId)!;
  const doc=item.lessonPages as LessonPageDocument;
  expect(validateLessonPages(doc)).toEqual([]);
  expect(validateLessonActivitySources(item.lessonId,doc)).toEqual([]);
  expect(item.studioContent.vocabulary).toEqual(lesson.wordIds);
  expect(item.studioContent.prerequisites).toEqual(lesson.prerequisiteIds);
  expect(item.studioContent.lessonPages).toEqual(doc);
  expect(item.studioContent.review.humanReviewed).toBe(false);
  const src=doc.pages[0].illustration!.src;
  expect(existsSync(`public${src}`)).toBe(true);
  expect(LESSON_SCENES.some(s=>s.src===src)).toBe(true);
  for(const block of doc.pages.flatMap(p=>p.blocks)){
   if(block.reading)expect(block.reading.paragraphs).toHaveLength(4);
   if(!block.activity)continue;
   const a=block.activity;
   expect(a.learningTarget?.sources[0].id).toContain(item.lessonId);
   if(a.type==='choice')for(const option of a.options){
    expect(evaluateLessonActivity(a,{text:'',answerIds:[option.id]})).toBe(a.answerIds.includes(option.id)?'correct':'incorrect');
   }
   if(a.type==='cloze'){
    expect(evaluateLessonActivity(a,{text:a.acceptedAnswers[0]})).toBe('correct');
    expect(evaluateLessonActivity(a,{text:'错'})).toBe('incorrect');
   }
  }
 }
});

