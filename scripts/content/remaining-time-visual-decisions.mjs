import {LESSON_SCENES} from '../../src/learning/lessonPresentation.ts';
export const remainingTimeVisuals={
 'hsk1-time-place-events-02-calendar':{asset:'calendar-meeting-plan-v1.webp',opening:'今天几月几号？',context:'hôm nay là ngày 8 tháng 5;',caption:'Lịch giả định: hôm nay 8/5, hẹn gặp ngày mai 9/5.',pages:['context','dialogue']},
 'hsk1-time-place-events-04-clock-and-duration':{asset:'class-start-eight-v1.webp',opening:'现在几点？',context:'Một lớp bắt đầu lúc 8 giờ, kết thúc lúc 9 giờ.',caption:'Bắt đầu 8:00 → kết thúc 9:00. Thời lượng: một giờ.',pages:['context','dialogue']},
 'hsk1-time-place-events-05-location':{asset:'near-far-cups-location-v1.webp',opening:'',context:'Người nói chỉ chiếc cốc gần mình',caption:'Cốc gần người nói và cốc ở xa; sách trên bàn, mèo dưới bàn.',pages:['context']},
};
export function applyRemainingTimeVisual(source){
 const choice=remainingTimeVisuals[source.targetLessonId];if(!choice)throw Error('Unreviewed lesson');
 const content=structuredClone(source);const scene=LESSON_SCENES.find(s=>s.src.endsWith('/'+choice.asset));if(!scene)throw Error('Missing scene');
 for(const suffix of choice.pages){
  const page=content.lessonPages.pages.find(p=>p.id===`${source.targetLessonId}:v2:${suffix}`);
  if(!page||page.illustration||page.layout!==(suffix==='context'?'scene':'dialogue'))throw Error('Preserve changed page');
  if(suffix==='context'&&!page.blocks[0].body.includes(choice.context))throw Error('Context changed');
  if(suffix==='dialogue'&&page.blocks[0].hanzi!==choice.opening)throw Error('Dialogue changed');
  page.illustration={...structuredClone(scene),caption:choice.caption};
 }
 return content;
}
