import {LESSON_SCENES} from '../../src/learning/lessonPresentation.ts';
export const weatherVisualIds=['hsk1-time-place-events-06-weather-and-residence'];
export function applyWeatherVisualDecision(source){
 if(source.targetLessonId!==weatherVisualIds[0])throw Error('Unreviewed weather lesson');
 const content=structuredClone(source);
 const scene=LESSON_SCENES.find(s=>s.src.endsWith('/rainy-home-residence-v1.webp'));
 if(!scene)throw Error('Missing weather scene');
 for(const suffix of ['context','dialogue']){
  const page=content.lessonPages.pages.find(p=>p.id===`${source.targetLessonId}:v2:${suffix}`);
  if(!page||page.illustration||page.layout!==(suffix==='context'?'scene':'dialogue'))throw Error('Preserve changed weather page');
  if(suffix==='dialogue'&&page.blocks[0].hanzi!=='今天天气怎么样？')throw Error('Review changed dialogue');
  if(suffix==='context'&&!page.blocks[0].body.includes('Hôm nay trời lạnh và đang mưa.'))throw Error('Review changed context');
  page.illustration=structuredClone(scene);
 }
 return content;
}
