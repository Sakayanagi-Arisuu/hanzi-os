/** Compose one HSK4 domain at a time from its distinct long-form sources. */
import {readFileSync,writeFileSync} from 'node:fs';
import {LESSON_BY_ID,WORD_BY_ID} from '../../src/data/curriculum';
import {emptyLessonBlock,validateLessonPages,type LessonBlock,type LessonPageDocument} from '../../src/learning/lessonPages';
import {emptyLessonActivity} from '../../src/learning/lessonActivities';
import {validateLessonActivitySources} from '../../src/learning/lessonActivitySources';

type Paragraph={paragraphId:string;hanzi:string;vietnamese:string};
type Text={textId:string;kind:string;titleVi:string;paragraphs:Paragraph[]};
type Question={itemId:string;textId:string;kind:string;promptVi:string;optionsVi:string[];correctOptionIndex:number;evidenceParagraphIds:string[];rationaleVi:string;inferenceBoundaryVi:string|null};
type MapNode={nodeId:string;labelVi:string;modelVi:string;evidenceParagraphIds:string[]};
type NoteMap={textId:string;promptVi:string;nodes:MapNode[]};
type SourceLesson={lessonId:string;objectiveVi:string;targetLexemes:Array<{officialId:string;simplified:string;pinyin:string;vietnameseGlossDraft:string}>;texts:Text[];comprehensionItems:Question[];noteMaps:NoteMap[];synthesisPrompt:{promptVi:string;requiredElements:string[];modelHanzi:string;modelVi:string}};
type RichLesson={lessonId:string;grammar:Array<{id:string;label:string}>;tasks:Array<{id:string;titleVi:string}>;topics:Array<{id:string}>};

const domain=process.argv.find(arg=>arg.startsWith('--domain='))?.slice(9)??'personal-community';
if(!/^[a-z-]+$/.test(domain))throw Error('Invalid HSK4 domain');
const source=JSON.parse(readFileSync(`content/drafts/hsk4-${domain}-long-form-2026.07.json`,'utf8')) as {lessons:SourceLesson[]};
const rich=JSON.parse(readFileSync('content/runtime/hsk4-level-rich-lessons.json','utf8')) as {lessons:RichLesson[]};
const language=JSON.parse(readFileSync('content/drafts/hsk4-local-language-support-2026.08.json','utf8')) as {pronunciations:Array<{hanzi:string;pinyin:string;humanReviewed:boolean}>};
const pinyin=new Map(language.pronunciations.map(row=>[row.hanzi,row.pinyin]));
const kindTitle:Record<string,string>={'main-claim':'Ý chính','supported-detail':'Chi tiết có căn cứ','cross-paragraph-evidence':'Nối bằng chứng nhiều đoạn','bounded-inference':'Suy luận có giới hạn','scope-limit':'Giới hạn kết luận'};
const numbers=[['一','yī'],['二','èr'],['三','sān'],['四','sì'],['五','wǔ'],['六','liù']];
const items=source.lessons.map(item=>{
 const id=item.lessonId,lesson=LESSON_BY_ID.get(id),meta=rich.lessons.find(row=>row.lessonId===id);
 if(!lesson||lesson.unitId!=='hsk4-deep-comprehension'||!meta||meta.tasks.length!==1||item.texts.length!==2||item.comprehensionItems.length!==10||item.noteMaps.length!==2)throw Error(`Incomplete source inventory: ${id}`);
 item.objectiveVi=item.objectiveVi.replace('Đọc hoặc nghe văn bản HSK4 nhiều đoạn','Đọc hai văn bản HSK4 nhiều đoạn');
 item.synthesisPrompt.promptVi=item.synthesisPrompt.promptVi.replace(/bài nghe/gi,'văn bản nguồn B').replace(/nguồn nghe/gi,'nguồn B');
 for(const question of item.comprehensionItems)if(question.textId.endsWith(':listening-01'))question.promptVi=question.promptVi.replace(/bài nghe/gi,'văn bản nguồn B').replace(/nguồn nghe/gi,'nguồn B');
 for(const question of item.comprehensionItems)question.promptVi=question.promptVi.replace(/^Claim nào/,'Nhận định nào');
 if(id.endsWith('concept-actor-map')){
  item.synthesisPrompt.modelHanzi=item.synthesisPrompt.modelHanzi.replace('两个社区方案','两个服务方案');
  item.synthesisPrompt.modelVi=item.synthesisPrompt.modelVi.replace('Cả hai phương án cộng đồng','Cả hai phương án dịch vụ');
  for(const question of item.comprehensionItems)question.rationaleVi=question.rationaleVi.replace('giao警','cảnh sát giao thông');
 }
 const b=(key:string,fields:Partial<LessonBlock>):LessonBlock=>({...emptyLessonBlock(`${id}:v2:block:${key}`),...fields});
 const target=(skill:'reading'|'writing',objective:string)=>({skill,objective,sources:[{kind:'task' as const,id:meta.tasks[0].id}]});
 const paragraphs=item.texts.map((text,textIndex)=>text.paragraphs.map((row,index)=>{
  const reading=pinyin.get(row.hanzi);
  if(!reading)throw Error(`Missing Pinyin: ${id}/${text.textId}/${row.paragraphId}`);
  return {id:`${id}:source-${textIndex}-${index}`,hanzi:row.hanzi,pinyin:reading,meaningVi:row.vietnamese};
 }));
 const pages:LessonPageDocument['pages']=[
  {id:`${id}:v2:context`,title:lesson.title,layout:'focus',stage:'context',blocks:[b('goal',{title:'Nhiệm vụ HSK4',body:`${item.objectiveVi}\nHai nguồn kể hai trường hợp cụ thể. Ghi đoạn làm bằng chứng trước khi so sánh hoặc kết luận.`}),b('audio-note',{title:'Cách dùng nguồn thứ hai',body:'Nguồn thứ hai hiện có transcript và giọng đọc tổng hợp để luyện theo văn bản. Chưa có audio bản ngữ; các câu hỏi dưới đây là đọc hiểu, không được tính là bằng chứng nghe độc lập.'})]},
 ];
 const core=item.targetLexemes.filter(w=>lesson.wordIds.includes(w.officialId)).slice(0,10);
 for(let offset=0;offset<core.length;offset+=5)pages.push({id:`${id}:v2:words:${offset}`,title:`Từ cần để đọc · ${offset+1}–${Math.min(offset+5,core.length)}`,layout:'split',stage:'understand',blocks:core.slice(offset,offset+5).map((word,index)=>{
  const actual=WORD_BY_ID.get(word.officialId);
  if(!actual||actual.simplified!==word.simplified)throw Error(`Vocabulary mismatch: ${word.officialId}`);
  return b(`word-${offset+index}`,{title:`${actual.simplified} · ${actual.pinyin}`,body:`${actual.meaning}. Tìm từ này trong ngữ liệu rồi đọc lại cả câu; không kết luận biết dùng từ chỉ từ một lần nhìn.`});
 })});
 for(const [sourceIndex,text] of item.texts.entries()){
  const sourceName=sourceIndex===0?'Nguồn A':'Nguồn B';
  pages.push({id:`${id}:v2:source:${sourceIndex}`,title:`${sourceName} · ${text.titleVi}`,layout:'focus',stage:'understand',blocks:[b(`source-${sourceIndex}`,{kind:'reading',title:text.titleVi,reading:{instruction:`Đọc ba đoạn ${sourceName}. Tìm ý chính, chi tiết và giới hạn. Ghi đoạn làm bằng chứng trước khi mở Pinyin/nghĩa.`,notePrompt:`${sourceName}: điều gì được nói rõ, điều gì còn chưa biết?`,paragraphs:paragraphs[sourceIndex]}})]});
  const map=item.noteMaps.find(row=>row.textId===text.textId);
  if(!map||map.nodes.length<2||map.nodes.length>6)throw Error(`Missing evidence map: ${text.textId}`);
  if(map.nodes.some(node=>node.evidenceParagraphIds.some(ref=>!text.paragraphs.some(paragraph=>paragraph.paragraphId===ref))))throw Error(`Map evidence missing: ${text.textId}`);
  pages.push({id:`${id}:v2:map:${sourceIndex}`,title:`Sơ đồ bằng chứng · ${sourceName}`,layout:'focus',stage:'understand',blocks:[b(`map-${sourceIndex}`,{kind:'diagram',title:`Dựng quan hệ trong ${sourceName}`,diagram:{type:'comparison',description:map.promptVi,nodes:map.nodes.map((node,index)=>({id:node.nodeId,label:`线索${numbers[index][0]}`,pinyin:`xiànsuǒ ${numbers[index][1]}`,meaningVi:node.modelVi,note:`${node.labelVi} · đối chiếu đoạn ${node.evidenceParagraphIds.map(ref=>text.paragraphs.findIndex(paragraph=>paragraph.paragraphId===ref)+1).join(', ')}`,x:index%2,y:Math.floor(index/2)}))}})]});
  const questions=item.comprehensionItems.filter(q=>q.textId===text.textId);
  if(questions.length!==5)throw Error(`Question count changed: ${text.textId}`);
  for(const [index,q] of questions.entries()){
   if(q.optionsVi.length<3||q.correctOptionIndex<0||q.correctOptionIndex>=q.optionsVi.length||new Set(q.optionsVi).size!==q.optionsVi.length||q.evidenceParagraphIds.some(ref=>!text.paragraphs.some(p=>p.paragraphId===ref)))throw Error(`Question invalid: ${q.itemId}`);
   const evidence=q.evidenceParagraphIds.map(ref=>text.paragraphs.findIndex(paragraph=>paragraph.paragraphId===ref)+1).join(', ');
   pages.push({id:`${id}:v2:question:${sourceIndex}:${index}`,title:`${sourceName} · ${kindTitle[q.kind]??'Kiểm tra bằng chứng'}`,layout:'focus',stage:'practice',blocks:[b(`question-${sourceIndex}-${index}`,{kind:'activity',title:kindTitle[q.kind]??'Kiểm tra bằng chứng',body:`${q.promptVi}\nTìm lại đoạn ${evidence} trước khi quyết định.`,activity:{...emptyLessonActivity(),options:q.optionsVi.map((option,optionIndex)=>({id:`o-${optionIndex}`,text:option,feedback:optionIndex===q.correctOptionIndex?`Đúng: ${q.rationaleVi}`:`Chưa đúng. ${q.inferenceBoundaryVi??q.rationaleVi} Đối chiếu lại đoạn ${evidence}.`})),answerIds:[`o-${q.correctOptionIndex}`],explanation:`${q.rationaleVi}${q.inferenceBoundaryVi?` Giới hạn: ${q.inferenceBoundaryVi}`:''}`,learningTarget:target('reading',q.promptVi)}})]});
  }
 }
 const synthesis=item.synthesisPrompt;
 pages.push({id:`${id}:v2:transfer`,title:'Tổng hợp hai nguồn',layout:'workshop',stage:'transfer',blocks:[b('transfer',{kind:'activity',title:'Viết trước khi mở mẫu',body:`${synthesis.promptVi}\nĐánh dấu ít nhất hai dữ kiện ở mỗi nguồn; chỉ mở mẫu sau bản đầu.`,activity:{...emptyLessonActivity(),type:'rubric',rubric:[...synthesis.requiredElements,'Mọi kết luận có đoạn nguồn; không khái quát quá hai trường hợp.'].map((label,index)=>({id:`criterion-${index}`,label,guidance:label})),explanation:`Một phương án để đối chiếu:\n${synthesis.modelHanzi}\n${synthesis.modelVi}\nTự soát và sửa; xem mẫu không cấp điểm viết độc lập.`,learningTarget:target('writing',synthesis.promptVi)}})]});
 pages.push({id:`${id}:v2:recap`,title:'Kiểm lại lập luận',layout:'focus',stage:'transfer',blocks:[b('recap',{title:'Tự sửa trước khi tiếp tục',body:`${synthesis.requiredElements.join('\n')}\nGhi lại ít nhất một chỗ bạn đã sửa về dữ kiện, quan hệ hoặc phạm vi. Thử tóm lược khi che nguồn và mẫu; hoàn thành trang chưa có nghĩa đã thành thạo.`})]});
 const doc:LessonPageDocument={version:1,art:'reading',pages};
 const dialogue=paragraphs.flatMap((rows,sourceIndex)=>rows.map((p,index)=>({speaker:`Nguồn ${sourceIndex===0?'A':'B'} · đoạn ${index+1}`,hanzi:p.hanzi,pinyin:p.pinyin,meaningVi:p.meaningVi})));
 const firstQuestion=item.comprehensionItems[0],first=paragraphs[0][0];
 const studioContent={targetLessonId:id,titleZh:lesson.chineseTitle,objectiveVi:item.objectiveVi,conceptVi:item.objectiveVi,ruleVi:'Nêu kết luận sau bằng chứng, giữ rõ nguồn và đoạn; giới hạn kết quả trong hai trường hợp đang đọc.',pitfallVi:'Dữ kiện của một nguồn không tự chuyển sang nguồn kia; giọng tổng hợp và transcript không tạo bằng chứng nghe độc lập.',checkpointVi:synthesis.requiredElements.join('\n'),prerequisites:lesson.prerequisiteIds,vocabulary:lesson.wordIds,skills:lesson.skills,dialogue,grammar:[{pattern:'Dẫn chứng trước khi suy luận',explanationVi:'Tìm câu nguồn, nêu ý được hỗ trợ, sau đó nói rõ điều chưa thể kết luận.',modelExample:dialogue[0],guidedPractice:{promptVi:synthesis.promptVi,modelAnswerHanzi:first.hanzi,modelAnswerPinyin:first.pinyin,modelAnswerMeaningVi:first.meaningVi}}],exercises:[{promptVi:'Chọn đoạn mở đầu nguồn A để xác định bối cảnh trước khi suy luận.',answer:first.hanzi,answerPinyin:first.pinyin,answerMeaningVi:first.meaningVi,distractors:paragraphs[0].slice(1).map(p=>p.hanzi),explanationVi:`${firstQuestion.rationaleVi} Xem tiếp các câu hỏi theo nguồn trong bộ trang học.`}],lessonPages:doc,sourceVocabularyIds:lesson.wordIds,sourceLessonIds:[id],sourceGrammarIds:meta.grammar.map(g=>g.id),sourceTaskIds:meta.tasks.map(t=>t.id),sourceTopicIds:meta.topics.map(t=>t.id),review:{humanReviewed:false,aiSelfReview:{accuracy:false,levelFit:false,pedagogy:false,answerIntegrity:false,originality:false}}};
 const errors=[...validateLessonPages(doc),...validateLessonActivitySources(id,doc)];if(errors.length)throw Error(`${id}: ${errors.join('; ')}`);
 return {lessonId:id,title:lesson.title,level:'hsk4',lessonPages:doc,studioContent,editorialStatus:'draft-needs-language-and-source-review'};
});
if(items.length!==6||new Set(items.map(item=>item.lessonId)).size!==6)throw Error('Expected six distinct HSK4 lessons');
writeFileSync(`content/drafts/thien-lo-hsk4-${domain}-v2.json`,JSON.stringify({schemaVersion:1,humanReviewed:false,status:'draft-not-published',sourcePack:`hsk4-${domain}-long-form-2026.07`,items},null,2)+'\n');
console.log({domain,lessons:items.length,pages:items.reduce((sum,item)=>sum+item.lessonPages.pages.length,0),activities:items.reduce((sum,item)=>sum+item.lessonPages.pages.flatMap(page=>page.blocks.filter(block=>block.activity)).length,0)});
