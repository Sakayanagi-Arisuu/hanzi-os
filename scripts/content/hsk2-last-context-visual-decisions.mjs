import {LESSON_SCENES} from '../../src/learning/lessonPresentation.ts';
export const hsk2LastContextVisuals={
  "hsk2-reference-description-comparison-lesson-03": {
    "asset": "hsk2-red-white-ownership-v1.webp",
    "opening": "红的是谁的？",
    "context": "Trên bàn có hai chiếc áo",
    "caption": "Áo đỏ của Mai, áo trắng của Lan. Cơm đã xong nhưng chưa biết ai nấu; không suy người nấu từ tranh.",
    "pages": [
      "context",
      "dialogue"
    ]
  },
  "hsk2-reference-description-comparison-lesson-04": {
    "asset": "hsk2-sisters-comparison-v1.webp",
    "opening": "你姐姐比你大几岁？",
    "context": "An 20 tuổi, chị An 23 tuổi.",
    "caption": "An 20 tuổi/1,60 m; chị 23 tuổi/1,70 m. Số liệu ở thẻ học, không đo tuổi hay chiều cao trên tranh.",
    "pages": [
      "context",
      "dialogue"
    ]
  },
  "hsk2-sentence-reconstruction-lesson-01": {
    "asset": "hsk2-hotel-message-v1.webp",
    "opening": "酒店离车站远吗？",
    "context": "Bạn sửa tin nhắn cho người bạn sắp tới khách sạn",
    "caption": "Khách sạn không xa ga, chưa biết đi bộ bao nhiêu phút. Ngày mai thi; tan học về nhà ngay.",
    "pages": [
      "context",
      "dialogue"
    ]
  },
  "hsk2-sentence-reconstruction-lesson-02": {
    "asset": "hsk2-unpacked-trip-v1.webp",
    "opening": "你下周去旅游，机票买好了吗？",
    "context": "Trước chuyến đi tuần sau",
    "caption": "Đã mua vé, chưa xếp hành lý. Người nghe nhờ nói chậm hơn; không phải đang chạy bộ.",
    "pages": [
      "context",
      "dialogue"
    ]
  },
  "hsk2-sentence-reconstruction-lesson-03": {
    "asset": "hsk2-study-help-v1.webp",
    "opening": "你觉得足球和篮球怎么样？",
    "context": "Minh thấy bóng đá thú vị hơn bóng rổ",
    "caption": "Minh thích bóng đá hơn; tuy mưa vẫn đến lớp. Tranh minh họa dự định ở nhà học và giúp bạn ôn tối nay.",
    "pages": [
      "context",
      "dialogue"
    ]
  }
};
export function applyHsk2LastContextVisual(source){
 const choice=hsk2LastContextVisuals[source.targetLessonId];if(!choice)throw Error('Unreviewed lesson');
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
