import { writeFileSync } from 'node:fs';
import { LESSON_BY_ID } from '../../src/data/curriculum';
import { getRichLessonContent } from '../../src/learning/richLessonContent';
import { emptyLessonBlock, lessonPagesFromRich, validateLessonPages } from '../../src/learning/lessonPages';
import { emptyLessonActivity } from '../../src/learning/lessonActivities';
import { dictationTeaching, dictationWordExamples } from './dictation-teaching';
import { buildDictationPages } from './build-dictation-pages';
import { dictationManuscripts } from './hsk2-dictation-manuscripts';

const decisions = [
  {promptVi:'Sau khi nghe 八点半开始，带两本书, lời ghi nào giữ đúng thông tin?',answer:'八点半，两本书。',answerPinyin:'Bā diǎn bàn, liǎng běn shū.',answerMeaningVi:'8:30, hai quyển sách.',distractors:['八点，两本书。','八点半，三本书。'],explanationVi:'半 giữ mốc 8:30; 两 giữ số hai. Mỗi lựa chọn khác làm đổi một dữ kiện.'},
  {promptVi:'Lời nhắn 请在车站门口等我。从门口往右走 chỉ nơi chờ và hướng nào?',answer:'车站门口，往右走。',answerPinyin:'Chēzhàn ménkǒu, wǎng yòu zǒu.',answerMeaningVi:'Cửa ga, đi về phía phải.',distractors:['学校门口，往右走。','车站门口，往左走。'],explanationVi:'车站 là ga, không phải trường; 右 là phải, không phải trái. Xác định mốc cửa trước khi đi.'},
  {promptVi:'Thông báo đổi buổi học từ 8 giờ ở tầng hai sang 9 giờ ở tầng ba. Xác nhận nào đúng kế hoạch cuối?',answer:'九点在三楼见。',answerPinyin:'Jiǔ diǎn zài sān lóu jiàn.',answerMeaningVi:'Hẹn 9 giờ ở tầng ba.',distractors:['八点在二楼见。','九点在二楼见。'],explanationVi:'Phải cập nhật cả giờ và tầng. Giữ một phần kế hoạch cũ vẫn dẫn đến đi sai buổi học.'},
];
const items = dictationManuscripts.map((m, index) => {
  const lesson = LESSON_BY_ID.get(m.lessonId)!;
  const rich = getRichLessonContent(m.lessonId)!;
  const lessonPages = buildDictationPages(m);
  // Preserve vocabulary identities and the dictionary path; the listening scripts remain hidden.
  const wordPages = lessonPagesFromRich(rich).pages.filter(p => p.id.includes(':words:'));
  for(const page of wordPages)for(const block of page.blocks){
    const index=Number(block.id.split(':word:')[1]);
    const example=dictationWordExamples[lesson.wordIds[index]];
    if(example)[block.hanzi,block.pinyin,block.meaningVi]=example;
  }
  const teaching=dictationTeaching[m.lessonId];
  lessonPages.pages.splice(1, 0, ...wordPages,...teaching.flatMap((t,i)=>[
    {id:`${m.lessonId}:dictation:teaching-${i}`,title:'Hiểu cụm thông tin trước khi nghe',layout:'focus' as const,stage:'understand' as const,blocks:[
      {...emptyLessonBlock(`${m.lessonId}:dictation:rule-${i}`),title:'Cách nghe và hiểu',body:t.rule},
      {...emptyLessonBlock(`${m.lessonId}:dictation:model-${i}`),kind:'dialogue' as const,title:'Ví dụ hướng dẫn',hanzi:t.hanzi,pinyin:t.pinyin,meaningVi:t.meaningVi},
    ]},
    {id:`${m.lessonId}:dictation:guided-${i}`,title:'Thử hiểu dữ kiện',layout:'workshop' as const,stage:'understand' as const,blocks:[
      {...emptyLessonBlock(`${m.lessonId}:dictation:guided-block-${i}`),kind:'activity' as const,title:'Điền để kiểm tra cách hiểu',body:t.prompt,activity:{...emptyLessonActivity(),type:'cloze' as const,acceptedAnswers:[t.answer],explanation:t.feedback,learningTarget:{skill:'reading' as const,objective:'Hiểu thông tin và quan hệ trong câu viết trước khi nghe',sources:[{kind:'task' as const,id:rich.tasks[0].id}]}}},
    ]},
  ]));
  const dialogue = m.items.map((item,i) => ({speaker:`Đoạn ${i+1}`,hanzi:item.hanzi,pinyin:item.pinyin,meaningVi:item.meaningVi}));
  const studioContent = {
    targetLessonId:lesson.id,titleZh:lesson.chineseTitle,objectiveVi:m.objective,conceptVi:m.context,
    ruleVi:m.preparation,pitfallVi:m.items.map(i=>i.feedback).join('\n'),checkpointVi:m.criteria.join('\n'),
    prerequisites:lesson.prerequisiteIds,vocabulary:lesson.wordIds,skills:lesson.skills,dialogue,
    grammar:[{pattern:'Theo dõi dữ kiện và quan hệ giữa các câu',explanationVi:m.items.map(i=>`${i.focus} ${i.feedback}`).join('\n'),
      modelExample:dialogue[0],guidedPractice:{promptVi:'Chép thông báo mới rồi xác nhận thông tin cuối cùng.',modelAnswerHanzi:m.transfer.hanzi,modelAnswerPinyin:m.transfer.pinyin,modelAnswerMeaningVi:m.transfer.meaningVi}}],
    exercises:[decisions[index]],lessonPages,sourceVocabularyIds:lesson.wordIds,sourceLessonIds:[lesson.id],
    sourceGrammarIds:rich.grammar.map(g=>g.id),sourceTaskIds:rich.tasks.map(t=>t.id),sourceTopicIds:rich.topics.map(t=>t.id),
    review:{humanReviewed:false,aiSelfReview:{accuracy:false,levelFit:false,pedagogy:false,answerIntegrity:false,originality:false}},
  };
  const errors=validateLessonPages(lessonPages);if(errors.length)throw Error(errors.join('\n'));
  return {lessonId:lesson.id,title:lesson.title,level:'hsk2',lessonPages,studioContent,editorialStatus:'draft-needs-vocabulary-example-and-language-review'};
});
writeFileSync('content/drafts/thien-lo-hsk2-dictation-v2.json',JSON.stringify({schemaVersion:1,humanReviewed:false,status:'draft-not-published',items},null,2)+'\n');
console.log(items.map(i=>({lesson:i.lessonId,pages:i.lessonPages.pages.length})));
