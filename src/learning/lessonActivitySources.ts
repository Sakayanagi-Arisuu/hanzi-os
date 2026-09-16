import {LESSON_BY_ID,WORD_BY_ID} from '../data/curriculum';
import {KNOWLEDGE_ITEM_BLUEPRINTS} from '../data/knowledgeItemBlueprints';
import {getRichLessonContent} from './richLessonContent';
import type {LessonActivityTarget} from './lessonActivityTarget';
import type {LessonPageDocument} from './lessonPages';
export type ActivitySourceOption=LessonActivityTarget['sources'][number]&{label:string};
/** Existing foundation lesson sources; new catalogue sources must be registered
 * in the shared curriculum before they can be offered as activity targets. */
export function lessonActivitySources(lessonId:string):ActivitySourceOption[]{
 const lesson=LESSON_BY_ID.get(lessonId);if(!lesson)return [];
 const rich=getRichLessonContent(lessonId);
 return [
  ...lesson.wordIds.flatMap(id=>{const word=WORD_BY_ID.get(id);return word?[{kind:'vocabulary' as const,id,label:`${word.simplified} · ${word.pinyin} · ${word.meaning}`}]:[];}),
  ...(rich?.characters??[]).map(c=>({kind:'character' as const,id:c.id,label:`${c.hanzi} · ${c.contextWord} · ${c.contextMeaningVi}`})),
  ...(rich?.grammar??[]).map(g=>({kind:'grammar' as const,id:g.id,label:g.label})),
  ...(rich?.tasks??[]).map(t=>({kind:'task' as const,id:t.id,label:t.titleVi})),
  ...KNOWLEDGE_ITEM_BLUEPRINTS.flatMap(k=>k.sourceLessonId===lessonId&&k.itemType==='pronunciation'?[{kind:'pronunciation' as const,id:k.itemId,label:k.targets.join(' · ')}]:[]),
 ];
}
export function validateLessonActivitySources(lessonId:string,document:LessonPageDocument):string[]{
 const allowed=new Set(lessonActivitySources(lessonId).map(s=>`${s.kind}:${s.id}`));
 return document.pages.flatMap(page=>page.blocks.flatMap(block=>
  (block.activity?.learningTarget?.sources??[]).filter(source=>!allowed.has(`${source.kind}:${source.id}`)).map(()=>`Trang “${page.title}”, mục “${block.title}”: nguồn mục tiêu không thuộc bài học đích.`)));
}
