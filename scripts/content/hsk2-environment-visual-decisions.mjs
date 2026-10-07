import {LESSON_SCENES} from '../../src/learning/lessonPresentation.ts';
export const hsk2EnvironmentVisuals={
  "hsk2-person-events-environment-lesson-01": {
    "asset": "hsk2-club-portrait-v1.webp",
    "opening": "左边头发很长的人是李梅吗？",
    "context": "Hai bạn đọc ba thẻ hồ sơ",
    "caption": "Từ trái: Lý Mai, Vương Lan, Lưu Phương. Thẻ hồ sơ là dữ kiện chính; không đo chiều cao từ tranh.",
    "pages": [
      "context",
      "dialogue"
    ]
  },
  "hsk2-person-events-environment-lesson-02": {
    "asset": "hsk2-bus-delay-v1.webp",
    "opening": "你今天为什么迟到了？",
    "context": "Lớp học bắt đầu lúc 9:00.",
    "caption": "Đợi xe 08:20–08:50, đến lớp 09:10 bằng taxi. Chưa biết vì sao xe buýt không đến.",
    "pages": [
      "context",
      "dialogue"
    ]
  },
  "hsk2-person-events-environment-lesson-03": {
    "asset": "hsk2-red-green-shirts-v1.webp",
    "opening": "这两件衣服有什么不同？",
    "context": "Quầy có hai áo cùng cỡ:",
    "caption": "Thẻ so sánh: áo đỏ 70 cm/120 tệ; áo xanh 65 cm/100 tệ. Tranh không phải thước đo.",
    "pages": [
      "context",
      "dialogue"
    ]
  },
  "hsk2-person-events-environment-lesson-04": {
    "asset": "hsk2-weather-plan-v1.webp",
    "opening": "今天天气怎么样？",
    "context": "Hôm nay trời âm u, hơi lạnh.",
    "caption": "Dự báo sáng mai nắng, chiều có thể mưa. Nếu mưa, đổi công viên thành thư viện.",
    "pages": [
      "context",
      "dialogue"
    ]
  },
  "hsk2-person-events-environment-lesson-05": {
    "asset": "hsk2-bedroom-window-v1.webp",
    "opening": "你住在哪儿？",
    "context": "Một nhà ở đối diện trường",
    "caption": "Trong phòng: một giường, một bàn cạnh cửa sổ. Vị trí nhà–trường–cửa hàng xem sơ đồ và lời thoại.",
    "pages": [
      "context",
      "dialogue"
    ]
  }
};
export function applyHsk2EnvironmentVisual(source){
 const choice=hsk2EnvironmentVisuals[source.targetLessonId];if(!choice)throw Error('Unreviewed lesson');
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
