import {LESSON_SCENES} from '../../src/learning/lessonPresentation.ts';
export const bootVisuals={'boot-1':{pages:['mission']},'boot-2':{pages:['meet','exchange']},'boot-3':{pages:['mission']},'boot-4':{pages:['mission']}};
export function applyBootVisual(source){
 const choice=bootVisuals[source.targetLessonId];if(!choice)throw Error('Unreviewed lesson');
 const content=structuredClone(source);
 for(const suffix of choice.pages){
  const page=content.lessonPages.pages.find(p=>p.id===`${source.targetLessonId}:v2:${suffix}`);
  if(!page||page.illustration||page.layout!==(suffix==='exchange'?'dialogue':'scene'))throw Error('Preserve changed page');
  if(source.targetLessonId==='boot-2'){
   if(suffix==='exchange'&&page.blocks[0].hanzi!=='你好！')throw Error('Greeting changed');
   const scene=LESSON_SCENES.find(s=>s.src.endsWith('/first-class-greeting-v1.webp'));if(!scene)throw Error('Missing greeting');
   page.illustration=structuredClone(scene);
  }else{
   if(!['boot-1','boot-3','boot-4'].includes(source.targetLessonId))throw Error('Unreviewed sound page');
   page.layout='focus';
  }
 }
 return content;
}
