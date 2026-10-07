import {LESSON_SCENES} from '../../src/learning/lessonPresentation.ts';
export const professionalVisuals={
 'professional-2':{asset:'classmate-introduction-v1.webp',opening:'他是你的老师吗？',context:'Một người bạn mới nhầm bạn học của bạn là giáo viên.',caption:'Nghe lời đính chính để phân biệt bạn học và giáo viên.',pages:['mission','talk']},
 'professional-3':{asset:'book-beside-computer-v1.webp',opening:'你学习汉语吗？',context:'Bạn và một người bạn chuẩn bị học tiếng Trung.',caption:'Quyển sách cần tìm ở cạnh máy tính.',pages:['mission','conversation']},
 'professional-4':{asset:'office-evening-class-v1.webp',opening:'你在哪里工作？',context:'Buổi tối bạn còn có lớp tiếng Trung.',caption:'Lịch trong hội thoại: 17:00 tan làm; 19:00 học tiếng Trung.',pages:['mission','talk']},
};
export function applyProfessionalVisual(source){
 const choice=professionalVisuals[source.targetLessonId];if(!choice)throw Error('Unreviewed lesson');
 const content=structuredClone(source);const scene=LESSON_SCENES.find(s=>s.src.endsWith('/'+choice.asset));if(!scene)throw Error('Missing scene');
 for(const suffix of choice.pages){
  const page=content.lessonPages.pages.find(p=>p.id===`${source.targetLessonId}:v2:${suffix}`);
  if(!page||page.illustration||page.layout!==(suffix==='mission'?'scene':'dialogue'))throw Error('Preserve changed page');
  if(suffix==='mission'&&!page.blocks[0].body.includes(choice.context))throw Error('Context changed');
  if(suffix!=='mission'&&page.blocks[0].hanzi!==choice.opening)throw Error('Dialogue changed');
  page.illustration={...structuredClone(scene),caption:choice.caption};
 }
 return content;
}
