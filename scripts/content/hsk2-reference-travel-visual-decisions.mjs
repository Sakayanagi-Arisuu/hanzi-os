import {LESSON_SCENES} from '../../src/learning/lessonPresentation.ts';
export const hsk2ReferenceTravelVisuals={
  "hsk2-travel-leisure-lesson-01": {
    "asset": "hsk2-school-gate-directions-v1.webp",
    "opening": "请问，从学校门口到图书馆怎么走？",
    "context": "Bạn đang ở cửa trường",
    "caption": "Đi thẳng, rẽ trái ở ngã rẽ thứ hai; thư viện cạnh ngân hàng. Xem sơ đồ để theo đúng tuyến.",
    "pages": [
      "context",
      "dialogue"
    ]
  },
  "hsk2-travel-leisure-lesson-02": {
    "asset": "hsk2-stairs-return-v1.webp",
    "opening": "我在门外等你。你先进去。",
    "context": "A đứng ngoài cửa tầng một",
    "caption": "A giữ nguyên mốc ngoài cửa tầng một. B lên tầng hai lấy sách rồi quay lại phía A.",
    "pages": [
      "context",
      "dialogue"
    ]
  },
  "hsk2-travel-leisure-lesson-05": {
    "asset": "hsk2-basketball-meeting-v1.webp",
    "opening": "你今天几点起来的？",
    "context": "Hai bạn nói chuyện lúc 8:20 sáng.",
    "caption": "Lúc nói là 08:20; giờ chốt gặp là 09:40 ngoài cổng đông, cùng đi chơi bóng rổ.",
    "pages": [
      "context",
      "dialogue"
    ]
  },
  "hsk2-reference-description-comparison-lesson-01": {
    "asset": "hsk2-tea-three-v1.webp",
    "opening": "书店在哪儿？",
    "context": "Bạn đứng trước cổng nhìn vào trường.",
    "caption": "Ba giáo viên, mỗi người hai gói trà; sáu gói được chọn, không phải tổng số gói trong cửa hàng. Địa điểm xem sơ đồ.",
    "pages": [
      "context",
      "dialogue"
    ]
  },
  "hsk2-reference-description-comparison-lesson-02": {
    "asset": "hsk2-office-phone-v1.webp",
    "opening": "你去过北京几次？",
    "context": "Linh từng đến Bắc Kinh hai lần",
    "caption": "Làm 08:00–17:00 rồi gọi cho mẹ. Hai lần đến Bắc Kinh là số lần, không phải thời lượng.",
    "pages": [
      "context",
      "dialogue"
    ]
  }
};
export function applyHsk2ReferenceTravelVisual(source){
 const choice=hsk2ReferenceTravelVisuals[source.targetLessonId];if(!choice)throw Error('Unreviewed lesson');
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
