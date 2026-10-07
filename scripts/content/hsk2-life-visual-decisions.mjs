import {LESSON_SCENES} from '../../src/learning/lessonPresentation.ts';
export const hsk2LifeVisuals={
  "hsk2-daily-needs-family-lesson-04": {
    "asset": "hsk2-headache-v1.webp",
    "opening": "你怎么了？",
    "context": "Vai B đau đầu từ sáng nay",
    "caption": "Hỏi triệu chứng và thời điểm bắt đầu; hai bạn dự định đi khám, chưa xác định nguyên nhân.",
    "pages": [
      "context",
      "dialogue"
    ]
  },
  "hsk2-daily-needs-family-lesson-05": {
    "asset": "hsk2-family-v1.webp",
    "opening": "你跟谁一起住？",
    "context": "Lan sống cùng chồng và con.",
    "caption": "Hôm nay Lan nấu cơm; ông bà nội của Lan nghỉ, chồng chơi với con.",
    "pages": [
      "context",
      "dialogue"
    ]
  },
  "hsk2-travel-leisure-lesson-03": {
    "asset": "hsk2-flight-v1.webp",
    "opening": "你什么时候去杭州旅游？",
    "context": "Hôm nay là thứ sáu.",
    "caption": "Đã mua vé cho thứ bảy tuần sau, chưa đi. Giờ đến sân bay 08:00 là dữ kiện luyện tiếng giả định.",
    "pages": [
      "context",
      "dialogue"
    ]
  },
  "hsk2-travel-leisure-lesson-04": {
    "asset": "hsk2-football-v1.webp",
    "opening": "周六下午一起去游泳吧？",
    "context": "Hai bạn đang bàn hoạt động chiều thứ bảy.",
    "caption": "Minh họa cuộc hẹn được bàn: 15:00 ở cửa công viên, chạy bộ trước rồi đá bóng.",
    "pages": [
      "context",
      "dialogue"
    ]
  }
};
export function applyHsk2LifeVisual(source){
 const choice=hsk2LifeVisuals[source.targetLessonId];if(!choice)throw Error('Unreviewed lesson');
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
