import {LESSON_SCENES} from '../../src/learning/lessonPresentation.ts';
export const hsk2GrammarVisuals={
  "hsk2-aspect-time-experience-lesson-01": {
    "asset": "hsk2-subway-wait-v1.webp",
    "opening": "你经常坐地铁去上课吗？",
    "context": "Lâm thường đi tàu điện ngầm",
    "caption": "08:50 đang đợi; lớp bắt đầu 09:00. Đã mua vé, bạn chưa tới; việc đến muộn mới là khả năng.",
    "pages": [
      "context",
      "dialogue"
    ]
  },
  "hsk2-aspect-time-experience-lesson-02": {
    "asset": "hsk2-club-open-door-v1.webp",
    "opening": "门口站着几位老师？",
    "context": "Tại câu lạc bộ, cửa đang mở",
    "caption": "Cửa đang mở, ba giáo viên đứng ở cửa. Thời gian học và số lần trải nghiệm không tự là mức thành thạo.",
    "pages": [
      "context",
      "dialogue"
    ]
  },
  "hsk2-clause-linking-lesson-01": {
    "asset": "hsk2-rain-reading-v1.webp",
    "opening": "你们为什么没出去？",
    "context": "Mưa làm nhóm không ra ngoài.",
    "caption": "Vì mưa nên ở lại; tuy mệt vẫn đọc. Ăn xong rồi mới về là dự định tiếp theo.",
    "pages": [
      "context",
      "dialogue"
    ]
  },
  "hsk2-clause-linking-lesson-02": {
    "asset": "hsk2-exam-home-v1.webp",
    "opening": "你今晚去图书馆，还是在家学习？",
    "context": "Ngày mai thi nên tối nay Lan cần học.",
    "caption": "Lan chọn ở nhà ôn vì ngày mai thi; định vừa về nhà là mở sách.",
    "pages": [
      "context",
      "dialogue"
    ]
  },
  "hsk2-complements-and-motion-lesson-01": {
    "asset": "hsk2-enter-class-v1.webp",
    "opening": "老师，我可以进来吗？",
    "context": "Người nói là giáo viên đang trong lớp.",
    "caption": "Giáo viên ở trong lớp là mốc của 进来. Đọc xong chưa có nghĩa đã hiểu.",
    "pages": [
      "context",
      "dialogue"
    ]
  },
  "hsk2-complements-and-motion-lesson-02": {
    "asset": "hsk2-door-book-gift-v1.webp",
    "opening": "平，我在教室外面，你出来一下吧。",
    "context": "An đứng ngoài lớp",
    "caption": "Hai bạn ở ngoài; giáo viên ở trong gọi 进来. Theo lời hai bạn đi vào là 进去.",
    "pages": [
      "context",
      "dialogue"
    ]
  }
};
export function applyHsk2GrammarVisual(source){
 const choice=hsk2GrammarVisuals[source.targetLessonId];if(!choice)throw Error('Unreviewed lesson');
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
