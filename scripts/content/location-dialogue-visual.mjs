import {LESSON_SCENES} from '../../src/learning/lessonPresentation.ts';
export const locationVisualIds=['hsk1-time-place-events-05-location'];
export function applyLocationDialogueVisual(source){
 if(source.targetLessonId!==locationVisualIds[0])throw Error('Unreviewed location lesson');
 const content=structuredClone(source);
 const page=content.lessonPages.pages.find(p=>p.id===`${source.targetLessonId}:v2:dialogue`);
 if(!page||page.layout!=='dialogue'||page.illustration||page.blocks[0].hanzi!=='书在哪儿？')throw Error('Dialogue changed; review again');
 const scene=LESSON_SCENES.find(s=>s.src.endsWith('/book-desk-cat-location-v1.webp'));
 if(!scene)throw Error('Missing location art');
 page.illustration=structuredClone(scene);
 return content;
}
