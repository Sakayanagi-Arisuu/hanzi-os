import {LESSON_SCENES} from '../../src/learning/lessonPresentation.ts';
export const hsk2StudyVisuals={
  "hsk2-study-work-culture-lesson-01": {
    "asset": "hsk2-study-questions-v1.webp",
    "opening": "你什么时候开始学汉语的？",
    "context": "Tiểu An bắt đầu học tiếng Trung",
    "caption": "Làm hết bài tập nhưng còn hai câu chưa hiểu; ghi lại để hỏi giáo viên ở buổi tới.",
    "pages": [
      "context",
      "dialogue"
    ]
  },
  "hsk2-study-work-culture-lesson-02": {
    "asset": "hsk2-school-art-v1.webp",
    "opening": "你们什么时候开学？",
    "context": "Trường khai giảng thứ hai tuần sau.",
    "caption": "Lịch ngày đầu ở tầng hai: 08:30–10:00 học, nghỉ 15 phút rồi vẽ lúc 10:15.",
    "pages": [
      "context",
      "dialogue"
    ]
  },
  "hsk2-study-work-culture-lesson-03": {
    "asset": "hsk2-teacher-prepares-v1.webp",
    "opening": "你在哪儿工作？",
    "context": "Nhân vật giả định là giáo viên",
    "caption": "Đang chuẩn bị tiết chiều, chưa dạy tiết đó. Trường trong bài có 120 giáo viên, 10.000 học sinh.",
    "pages": [
      "context",
      "dialogue"
    ]
  },
  "hsk2-study-work-culture-lesson-04": {
    "asset": "hsk2-new-year-dumplings-v1.webp",
    "opening": "你在中国过过年吗？",
    "context": "Lý Minh kể một lần đón Tết",
    "caption": "Trải nghiệm năm ngoái ở nhà bạn tại Bắc Kinh; phong tục mỗi gia đình có thể khác nhau.",
    "pages": [
      "context",
      "dialogue"
    ]
  },
  "hsk2-study-work-culture-lesson-05": {
    "asset": "hsk2-teacher-greeting-v1.webp",
    "opening": "您好，请问您贵姓？",
    "context": "Tại buổi gặp giáo viên mới",
    "caption": "Người mới giới thiệu họ Trần, tên Trần Vũ; người học hỏi và được đồng ý gọi là thầy/cô Trần.",
    "pages": [
      "context",
      "dialogue"
    ]
  }
};
export function applyHsk2StudyVisual(source){
 const choice=hsk2StudyVisuals[source.targetLessonId];if(!choice)throw Error('Unreviewed lesson');
 const content=structuredClone(source);const scene=LESSON_SCENES.find(s=>s.src.endsWith('/'+choice.asset));if(!scene)throw Error('Missing scene');
 for(const suffix of choice.pages){
  const page=content.lessonPages.pages.find(p=>p.id===`${source.targetLessonId}:v2:${suffix}`);
  if(!page||page.illustration||page.layout!==(suffix==='context'?'scene':'dialogue'))throw Error('Preserve changed page');
  if(suffix==='context'&&!page.blocks[0].body.includes(choice.context))throw Error('Context changed');
  if(suffix!=='context'&&page.blocks[0].hanzi!==choice.opening)throw Error('Dialogue changed');
  page.illustration={...structuredClone(scene),caption:choice.caption};
 }
 return content;
}
