import {LESSON_SCENES} from '../../src/learning/lessonPresentation.ts';
export const journeyVisuals={
 'journey-1':{asset:'home-school-taxi-call-v1.webp',pages:['dialogue'],opening:'你怎么来学校？',caption:'Người hỏi ở trường dùng 来; người trả lời ở nhà dùng 去.'},
 'journey-2':{asset:'cinema-home-music-v1.webp',pages:['context','dialogue'],opening:'你今天做什么？',caption:'Hai người chọn khác nhau: đến rạp xem phim; ở nhà nghe nhạc.'},
 'professional-1':{asset:'secondary-school-introduction-v1.webp',pages:['listen'],opening:'你在哪个学校上学？',caption:'Hai học sinh hỏi và trả lời về trường đang học.'},
};
export function applyJourneyVisual(source){
 const choice=journeyVisuals[source.targetLessonId];if(!choice)throw Error('Unreviewed lesson');
 const content=structuredClone(source);const scene=LESSON_SCENES.find(s=>s.src.endsWith('/'+choice.asset));if(!scene)throw Error('Missing scene');
 for(const suffix of choice.pages){
  const page=content.lessonPages.pages.find(p=>p.id===`${source.targetLessonId}:v2:${suffix}`);
  if(!page||page.illustration||page.layout!==(suffix==='context'?'scene':'dialogue'))throw Error('Preserve changed page');
  if(suffix!=='context'&&page.blocks[0].hanzi!==choice.opening)throw Error('Dialogue changed');
  if(suffix==='context'&&!page.blocks[0].body.includes('xem phim ở rạp hoặc nghe nhạc ở nhà'))throw Error('Context changed');
  page.illustration={...structuredClone(scene),caption:choice.caption};
 }
 if(source.targetLessonId.startsWith('journey-')){
  const visual=content.lessonPages.pages.find(p=>p.id===`${source.targetLessonId}:v2:visual`);
  if(!visual||visual.illustration||visual.layout!=='scene'||visual.blocks.length!==1||visual.blocks[0].kind!=='diagram')throw Error('Preserve changed diagram');
  visual.layout='focus';
 }
 return content;
}
