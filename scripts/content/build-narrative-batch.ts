import type {PersonalNarrative} from './hsk3-personal-narratives';
import {LESSON_BY_ID,WORD_BY_ID} from '../../src/data/curriculum';
import {getRichLessonContent} from '../../src/learning/richLessonContent';
import {emptyLessonBlock,validateLessonPages,type LessonBlock,type LessonPageDocument} from '../../src/learning/lessonPages';
import {emptyLessonActivity} from '../../src/learning/lessonActivities';
import {validateLessonActivitySources} from '../../src/learning/lessonActivitySources';

export type NarrativeBatchOptions={
 lessonPrefix:string;
 level:'hsk3'|'hsk4';
 manuscripts:PersonalNarrative[];
 answerReadings:Record<string,[string,string]>;
 support?:Record<string,string>;
 mediaDate?:string;
 extraPages?:(id:string,taskId:string,manuscript:PersonalNarrative)=>LessonPageDocument['pages'];
};
export function buildNarrativeBatch(options:NarrativeBatchOptions){
 return options.manuscripts.map(m=>{
 const id=`${options.lessonPrefix}-${m.suffix}`;const lesson=LESSON_BY_ID.get(id);const rich=getRichLessonContent(id);
 if(!lesson||!rich?.tasks.length)throw Error(`Missing lesson or source task: ${id}`);
 const answerReading=options.answerReadings[m.suffix];
 if(!answerReading?.[0]||!answerReading[1])throw Error(`Missing answer reading: ${id}`);
 if(m.paragraphs.length<3||m.answer<0||m.answer>=m.choices.length)throw Error(`Invalid narrative: ${id}`);
 const b=(key:string,fields:Partial<LessonBlock>):LessonBlock=>({...emptyLessonBlock(`${id}:v2:block:${key}`),...fields});
 const target=(skill:'reading'|'writing')=>({skill,objective:m.goal,sources:[{kind:'task' as const,id:rich.tasks[0].id}]});
 const illustration=m.scene?{src:`/lessons/ngoc-dien/${m.scene}-v1.webp`,alt:`Bối cảnh: ${lesson.title}`,provenance:`OpenAI imagegen · nguyên bản HANZI.OS · ${options.mediaDate??'2026-09-22'} · AI-assisted, humanReviewed:false`}:undefined;
 const paragraphs=m.paragraphs.map(([hanzi,pinyin,meaningVi],i)=>({id:`${id}:paragraph-${i}`,hanzi,pinyin,meaningVi}));
 const core=m.core.map(text=>{const words=lesson.wordIds.map(id=>WORD_BY_ID.get(id)!).filter(w=>w.simplified===text);if(words.length!==1)throw Error(`Choose exact word ID for ${text}`);return words[0];});
 const doc:LessonPageDocument={version:1,art:'reading',pages:[
  {id:`${id}:v2:context`,title:m.goal,layout:illustration?'scene':'focus',stage:'context',illustration,blocks:[b('goal',{title:'Nhiệm vụ đọc của bạn',body:`${m.goal}. Đọc các đoạn, đánh dấu bằng chứng rồi viết lại theo dữ kiện mới.${illustration?' Ảnh chỉ minh họa bối cảnh, không cung cấp thêm sự kiện.':''}`}),b('support',{title:'Từ hỗ trợ',body:m.support})]},
  {id:`${id}:v2:reading`,title:'Đọc và giữ bằng chứng',layout:'focus',stage:'understand',blocks:[b('text',{kind:'reading',title:lesson.title,reading:{instruction:`Đọc ${m.paragraphs.length===4?'bốn':m.paragraphs.length} đoạn. Chọn câu/đoạn làm bằng chứng cho ghi chú; có thể mở Pinyin và nghĩa khi cần.`,notePrompt:'Ghi người, việc thay đổi, lý do và kết quả. Điều gì còn chưa biết?',paragraphs}})]},
  {id:`${id}:v2:connections`,title:'Hiểu quan hệ giữa các câu',layout:'focus',stage:'understand',blocks:[b('rule',{title:'Cách nối ý và giới hạn của thông tin',body:m.rule}),b('pitfall',{title:'Không suy quá bằng chứng',body:m.pitfall})]},
  {id:`${id}:v2:core-words`,title:'Từ trọng tâm trong văn bản',layout:'split',stage:'understand',blocks:core.map(w=>{const sentence=paragraphs.find(p=>p.hanzi.includes(w.simplified));return b(`word-${w.id}`,{kind:'dialogue',title:`${w.simplified} · ${w.pinyin}`,body:`${w.meaning}\nTừ trọng tâm của bài; các từ liên quan còn lại vẫn có trong Tra từ trong bài.`,hanzi:sentence?.hanzi??w.example,pinyin:sentence?.pinyin??w.examplePinyin,meaningVi:sentence?.meaningVi??w.exampleMeaning});})},
  {id:`${id}:v2:choice`,title:'Đọc để quyết định',layout:'focus',stage:'practice',blocks:[b('choice',{kind:'activity',title:'Chọn kết luận có căn cứ',body:m.question,activity:{...emptyLessonActivity(),options:m.choices.map(([text,feedback],i)=>({id:`o-${i}`,text,feedback})),answerIds:[`o-${m.answer}`],explanation:m.choices[m.answer][1],learningTarget:target('reading')}})]},
  {id:`${id}:v2:guided`,title:'Tự nối lại ý',layout:'workshop',stage:'practice',blocks:[b('cloze',{kind:'activity',title:'Điền theo quan hệ được yêu cầu',body:m.cloze.prompt,activity:{...emptyLessonActivity(),type:'cloze',acceptedAnswers:[m.cloze.answer],explanation:m.cloze.feedback,learningTarget:target('reading')}})]},
  {id:`${id}:v2:transfer`,title:'Viết với dữ kiện mới',layout:'workshop',stage:'transfer',blocks:[b('transfer',{kind:'activity',title:'Tự viết trước khi mở mẫu',body:m.transfer,activity:{...emptyLessonActivity(),type:'rubric',rubric:m.criteria.map((label,i)=>({id:`criterion-${i}`,label,guidance:label})),explanation:`Một phương án để đối chiếu:\n${m.model.join('\n')}\nCách diễn đạt khác đúng dữ kiện vẫn có thể phù hợp. Tự đối chiếu không phải điểm viết độc lập.`,learningTarget:target('writing')}})]},
  {id:`${id}:v2:recap`,title:'Tự sửa trước khi tiếp tục',layout:'focus',stage:'transfer',blocks:[b('recap',{title:'Kiểm lại bài viết',body:m.criteria.join('\n')+'\nSửa ít nhất một điểm chưa rõ trong bản viết, rồi thử kể lại khi không nhìn mẫu. Dùng Tra từ trong bài để ôn từ liên quan; xem hết trang không đồng nghĩa thành thạo.'})]},
 ]};
 if(options.support?.[m.suffix])doc.pages[0].blocks[1].body+='\n'+options.support[m.suffix];
 const extra=options.extraPages?.(id,rich.tasks[0].id,m)??[];
 doc.pages.splice(doc.pages.length-1,0,...extra);
 const dialogue=paragraphs.map((p,i)=>({speaker:`Đoạn ${i+1}`,hanzi:p.hanzi,pinyin:p.pinyin,meaningVi:p.meaningVi}));
 // Answers have their own readings; never use the first paragraph as a surrogate answer.
 const studioContent={targetLessonId:id,titleZh:lesson.chineseTitle,objectiveVi:m.goal,conceptVi:m.goal,ruleVi:m.rule,pitfallVi:m.pitfall,checkpointVi:m.criteria.join('\n'),prerequisites:lesson.prerequisiteIds,vocabulary:lesson.wordIds,skills:lesson.skills,dialogue,grammar:[{pattern:m.goal,explanationVi:m.rule,modelExample:dialogue[2],guidedPractice:{promptVi:m.transfer,modelAnswerHanzi:m.model[0],modelAnswerPinyin:m.model[1],modelAnswerMeaningVi:m.model[2]}}],exercises:[{promptVi:m.question,answer:m.choices[m.answer][0],answerPinyin:answerReading[0],answerMeaningVi:answerReading[1],distractors:m.choices.filter((_,i)=>i!==m.answer).map(c=>c[0]),explanationVi:m.choices[m.answer][1]}],lessonPages:doc,sourceVocabularyIds:lesson.wordIds,sourceLessonIds:[id],sourceGrammarIds:rich.grammar.map(g=>g.id),sourceTaskIds:rich.tasks.map(t=>t.id),sourceTopicIds:rich.topics.map(t=>t.id),review:{humanReviewed:false,aiSelfReview:{accuracy:false,levelFit:false,pedagogy:false,answerIntegrity:false,originality:false}}};
 const errors=[...validateLessonPages(doc),...validateLessonActivitySources(id,doc)];if(errors.length)throw Error(errors.join('\n'));
 return {lessonId:id,title:lesson.title,level:options.level,lessonPages:doc,studioContent,coreVocabularyIds:core.map(w=>w.id),editorialStatus:'draft-needs-language-and-source-review'};
});
}
