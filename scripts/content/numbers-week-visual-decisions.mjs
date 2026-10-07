import {LESSON_SCENES} from '../../src/learning/lessonPresentation.ts';
export const numbersWeekVisuals={
 'hsk1-time-place-events-01-numbers':{asset:'two-books-room-203-v1.webp',opening:'你有几本书？',context:'Có hai quyển sách;',caption:'Hai quyển sách là số lượng; 203 trên cửa là mã phòng.'},
 'hsk1-time-place-events-03-week-and-day-parts':{asset:'weekly-study-rest-meeting-v1.webp',opening:'你星期一上午上课吗？',context:'sáng thứ hai có lớp;',caption:'Từ trái sang phải: sáng thứ hai học; chiều thứ hai nghỉ; chủ nhật gặp bạn.'},
};
export function applyNumbersWeekVisual(source){
 const choice=numbersWeekVisuals[source.targetLessonId];if(!choice)throw Error('Unreviewed lesson');
 const content=structuredClone(source);const scene=LESSON_SCENES.find(s=>s.src.endsWith('/'+choice.asset));if(!scene)throw Error('Missing scene');
 for(const suffix of ['context','dialogue']){
  const page=content.lessonPages.pages.find(p=>p.id===`${source.targetLessonId}:v2:${suffix}`);
  if(!page||page.illustration||page.layout!==(suffix==='context'?'scene':'dialogue'))throw Error('Preserve changed page');
  if(suffix==='context'&&!page.blocks[0].body.includes(choice.context))throw Error('Context changed');
  if(suffix==='dialogue'&&page.blocks[0].hanzi!==choice.opening)throw Error('Dialogue changed');
  page.illustration={...structuredClone(scene),caption:choice.caption};
 }
 return content;
}
