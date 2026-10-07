import {LESSON_SCENES} from '../../src/learning/lessonPresentation.ts';
export const hsk2DailyVisuals={
  "hsk2-daily-needs-family-lesson-01": {
    "asset": "hsk2-help-open-door-v1.webp",
    "opening": "不好意思，你能帮我一个忙吗？",
    "context": "Bạn đang đứng trước hai cánh cửa",
    "caption": "Nhờ mở cửa này: hỏi rõ rồi xác nhận trước khi giúp.",
    "pages": [
      "context",
      "dialogue"
    ]
  },
  "hsk2-daily-needs-family-lesson-02": {
    "asset": "hsk2-plan-restaurant-dinner-v1.webp",
    "opening": "你经常在饭馆吃晚饭吗？",
    "context": "Hai bạn chọn bữa tối hôm nay.",
    "caption": "Chưa chuẩn bị cơm hôm nay; hai bạn bàn món ăn và hẹn gặp ở nhà hàng lúc 18:00.",
    "pages": [
      "context",
      "dialogue"
    ]
  },
  "hsk2-daily-needs-family-lesson-03": {
    "asset": "hsk2-black-blue-trousers-v1.webp",
    "opening": "这条裤子怎么样？",
    "context": "Bạn cần quần ngắn hơn chiếc đang thử",
    "caption": "Dữ kiện hội thoại: quần đen dài, 100 tệ; quần xanh lam ngắn hơn, 80 tệ.",
    "pages": [
      "context",
      "dialogue"
    ]
  }
};
export function applyHsk2DailyVisual(source){
 const choice=hsk2DailyVisuals[source.targetLessonId];if(!choice)throw Error('Unreviewed lesson');
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
