import {readFileSync,writeFileSync} from 'node:fs';
import {LESSON_BY_ID} from '../../src/data/curriculum';
import {getRichLessonContent} from '../../src/learning/richLessonContent';
import {emptyLessonBlock,validateLessonPages,type LessonBlock,type LessonPageDocument} from '../../src/learning/lessonPages';
import {emptyLessonActivity} from '../../src/learning/lessonActivities';
import {validateLessonActivitySources} from '../../src/learning/lessonActivitySources';
import {productionManuscripts} from './hsk3-production-manuscripts';

const sourceFiles=['personal','study-work','nature','culture','society'];
const sourcePages=new Map<string,LessonPageDocument>();
for(const group of sourceFiles){
 const draft=JSON.parse(readFileSync(`content/drafts/thien-lo-hsk3-${group}-v2.json`,'utf8')) as {items:Array<{lessonId:string;lessonPages:LessonPageDocument}>};
 for(const item of draft.items)sourcePages.set(item.lessonId,item.lessonPages);
}

const items=productionManuscripts.map(m=>{
 const id=`hsk3-${m.group}-lesson-0${m.n}`,lesson=LESSON_BY_ID.get(id),rich=getRichLessonContent(id);
 if(!lesson||!rich?.tasks.length||m.choices.length<3||m.answer<0||m.answer>=m.choices.length||m.criteria.length<3)throw Error(`Incomplete manuscript: ${id}`);
 const paragraphs=m.sources.flatMap((sourceId,sourceIndex)=>{
  const doc=sourcePages.get(sourceId),reading=doc?.pages.flatMap(page=>page.blocks).find(block=>block.kind==='reading')?.reading;
  if(!doc||!reading)throw Error(`Source lesson has no reviewed reading draft: ${sourceId}`);
  return reading.paragraphs.map((row,index)=>({id:`${id}:source-${sourceIndex}-${index}`,hanzi:row.hanzi,pinyin:row.pinyin,meaningVi:row.meaningVi}));
 });
 if(paragraphs.length>30)throw Error(`${id}: too many source paragraphs`);
 const b=(key:string,fields:Partial<LessonBlock>):LessonBlock=>({...emptyLessonBlock(`${id}:v2:block:${key}`),...fields});
 const target=(skill:'reading'|'writing'|'speaking',objective:string)=>({skill,objective,sources:[{kind:'task' as const,id:rich.tasks[0].id}]});
 const outputSkill=m.mode==='retell'||m.mode==='explain'?'speaking':m.mode==='writing'?'writing':'reading';
 const marker={notes:['线索','xiànsuǒ'],cohesion:['顺序','shùnxù'],retell:['事件','shìjiàn'],writing:['要点','yàodiǎn'],explain:['依据','yījù']}[m.mode];
 const number=[['一','yī'],['二','èr'],['三','sān'],['四','sì']];
 const diagram={type:(m.mode==='notes'||m.mode==='explain'?'comparison':'sequence') as 'comparison'|'sequence',description:`${m.goal}. Sơ đồ chỉ giữ dữ kiện trong văn bản; đối chiếu từng mục với đoạn nguồn trước khi kết luận.`,nodes:m.diagram.map((fact,index)=>({id:`step-${index}`,label:`${marker[0]}${number[index][0]}`,pinyin:`${marker[1]} ${number[index][1]}`,meaningVi:fact,note:index===m.diagram.length-1?'Kiểm lại phạm vi kết luận.':'Tìm câu làm bằng chứng.',x:index%2,y:Math.floor(index/2)}))};
 const doc:LessonPageDocument={version:1,art:'reading',pages:[
  {id:`${id}:v2:context`,title:m.goal,layout:'focus',stage:'context',blocks:[b('goal',{title:'Nhiệm vụ của bạn',body:m.goal}),b('source-link',{title:'Bài đã học cần dùng lại',body:`${m.sources.map(sourceId=>LESSON_BY_ID.get(sourceId)?.title??sourceId).join(' · ')}. Nội dung nguồn xuất hiện ngay ở trang tiếp theo; mở lại bài gốc từ Thiên Lộ khi cần.`})]},
  {id:`${id}:v2:reading`,title:'Đọc nguồn và đánh dấu bằng chứng',layout:'focus',stage:'understand',blocks:[b('reading',{kind:'reading',title:'Ngữ liệu đã học · dùng lại trong nhiệm vụ mới',reading:{instruction:'Đọc từng đoạn, tìm dữ kiện liên quan. Phần Pinyin và nghĩa Việt là trợ giúp; đọc lại không tự chứng minh đã nhớ độc lập.',notePrompt:m.notes,paragraphs}})]},
  {id:`${id}:v2:diagram`,title:'Sơ đồ dữ kiện',layout:'focus',stage:'understand',blocks:[b('diagram',{kind:'diagram',title:'Đặt dữ kiện đúng quan hệ',diagram})]},
  {id:`${id}:v2:method`,title:'Cách xử lý nhiệm vụ',layout:'focus',stage:'understand',blocks:[b('method',{title:'Làm từng bước',body:m.method}),b('limit',{title:'Kiểm lại bằng chứng',body:m.notes})]},
  {id:`${id}:v2:choice`,title:'Kiểm tra cách hiểu',layout:'focus',stage:'practice',blocks:[b('choice',{kind:'activity',title:'Chọn câu có căn cứ',body:m.question,activity:{...emptyLessonActivity(),options:m.choices.map(([text,feedback],index)=>({id:`o-${index}`,text,feedback})),answerIds:[`o-${m.answer}`],explanation:m.choices[m.answer][1],learningTarget:target('reading',m.question)}})]},
  {id:`${id}:v2:guided`,title:'Luyện một quan hệ then chốt',layout:'workshop',stage:'practice',blocks:[b('guided',{kind:'activity',title:'Điền rồi tự giải thích',body:m.cloze[0],activity:{...emptyLessonActivity(),type:'cloze',acceptedAnswers:[m.cloze[1]],explanation:m.cloze[2],learningTarget:target('reading',m.cloze[0])}})]},
  {id:`${id}:v2:transfer`,title:m.mode==='retell'||m.mode==='explain'?'Tập trình bày tình huống mới':'Vận dụng với dữ kiện mới',layout:'workshop',stage:'transfer',blocks:[b('transfer',{kind:'activity',title:'Tự làm trước khi xem mẫu',body:m.transfer,activity:{...emptyLessonActivity(),type:'rubric',rubric:m.criteria.map((label,index)=>({id:`criterion-${index}`,label,guidance:label})),explanation:`Một phương án tham khảo:\n${m.model.join('\n')}\nCách diễn đạt khác đúng dữ kiện vẫn có thể phù hợp. Bản chữ và tự đối chiếu không phải điểm nói/viết độc lập.`,learningTarget:target(outputSkill,m.goal)}})]},
  {id:`${id}:v2:recap`,title:'Sửa và thử lại',layout:'focus',stage:'transfer',blocks:[b('recap',{title:'Checklist trước khi tiếp tục',body:`${m.criteria.join('\n')}\nSửa ít nhất một chỗ chưa rõ, rồi thử lại khi che nguồn và mẫu. Xem hết trang không đồng nghĩa thành thạo.`})]},
 ]};
 const dialogue=paragraphs.map((p,index)=>({speaker:`Nguồn ${index+1}`,hanzi:p.hanzi,pinyin:p.pinyin,meaningVi:p.meaningVi}));
 const studioContent={targetLessonId:id,titleZh:lesson.chineseTitle,objectiveVi:m.goal,conceptVi:m.goal,ruleVi:m.method,pitfallVi:m.notes,checkpointVi:m.criteria.join('\n'),prerequisites:lesson.prerequisiteIds,vocabulary:lesson.wordIds,skills:lesson.skills,dialogue,grammar:[{pattern:m.goal,explanationVi:m.method,modelExample:dialogue[0],guidedPractice:{promptVi:m.transfer,modelAnswerHanzi:m.model[0],modelAnswerPinyin:m.model[1],modelAnswerMeaningVi:m.model[2]}}],exercises:[{promptVi:m.question,answer:m.choices[m.answer][0],answerPinyin:m.answerReading[0],answerMeaningVi:m.answerReading[1],distractors:m.choices.filter((_,index)=>index!==m.answer).map(c=>c[0]),explanationVi:m.choices[m.answer][1]}],lessonPages:doc,sourceVocabularyIds:lesson.wordIds,sourceLessonIds:[id,...m.sources],sourceGrammarIds:rich.grammar.map(g=>g.id),sourceTaskIds:rich.tasks.map(t=>t.id),sourceTopicIds:rich.topics.map(t=>t.id),review:{humanReviewed:false,aiSelfReview:{accuracy:false,levelFit:false,pedagogy:false,answerIntegrity:false,originality:false}}};
 const errors=[...validateLessonPages(doc),...validateLessonActivitySources(id,doc)];
 if(errors.length)throw Error(`${id}: ${errors.join('; ')}`);
 return {lessonId:id,title:lesson.title,level:'hsk3',lessonPages:doc,studioContent,editorialStatus:'draft-needs-language-and-source-review'};
});
if(items.length!==14||new Set(items.map(item=>item.lessonId)).size!==14)throw Error('Expected 14 distinct production manuscripts');
writeFileSync('content/drafts/thien-lo-hsk3-production-v2.json',JSON.stringify({schemaVersion:1,humanReviewed:false,status:'draft-not-published',items},null,2)+'\n');
console.log({lessons:items.length,pages:items.reduce((sum,item)=>sum+item.lessonPages.pages.length,0),activities:items.reduce((sum,item)=>sum+item.lessonPages.pages.flatMap(page=>page.blocks.filter(block=>block.activity)).length,0)});
