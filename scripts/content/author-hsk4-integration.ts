/** Build distinct HSK4 integrated-study sessions from source-bound manuscripts. */
import {readFileSync,writeFileSync} from 'node:fs';
import {LESSON_BY_ID} from '../../src/data/curriculum';
import {emptyLessonBlock,validateLessonPages,type LessonBlock,type LessonPageDocument} from '../../src/learning/lessonPages';
import {emptyLessonActivity} from '../../src/learning/lessonActivities';
import {validateLessonActivitySources} from '../../src/learning/lessonActivitySources';

type Paragraph={paragraphId:string;hanzi:string;vietnamese:string};
type SourceText={textId:string;titleVi:string;paragraphs:Paragraph[]};
type Evidence={textId:string;paragraphIds:string[]};
type Unit={promptUnitId:string;kind:string;primarySkill:string;promptVi:string;evidenceRefs:Evidence[];modelHanzi:string;modelVi:string;requiredMovesVi:string[];scopeBoundaryVi:string;responseContract:{unit:string;minimum:number;maximum:number;requiredSections:number;revisionPasses:number;minimumSources:number};timedPractice:boolean;timeLimitSeconds:number|null};
type Manuscript={lessonId:string;blueprintTitleVi:string;blueprintObjectiveVi:string;sourceBindings:Array<{textId:string;titleVi:string}>;promptUnits:Unit[];timed:boolean};
type Rich={lessonId:string;grammar:Array<{id:string;officialContent:string;explanationVi:string;modelExample:{hanzi:string;pinyin:string;meaningVi:string};guidedPractice:{promptVi:string;modelAnswerHanzi:string;modelAnswerPinyin:string;modelAnswerMeaningVi:string}}> ;tasks:Array<{id:string;titleVi:string}>;topics:Array<{id:string}>};

const domain=process.argv.find(arg=>arg.startsWith('--domain='))?.slice(9)??'long-input-structure-map';
if(!/^[a-z-]+$/.test(domain))throw Error('Invalid HSK4 domain');
const manuscript=JSON.parse(readFileSync(`content/drafts/hsk4-${domain}-integration-2026.07.json`,'utf8')) as {lessons:Manuscript[]};
const rich=JSON.parse(readFileSync('content/runtime/hsk4-level-rich-lessons.json','utf8')) as {lessons:Rich[]};
const language=JSON.parse(readFileSync('content/drafts/hsk4-local-language-support-2026.08.json','utf8')) as {pronunciations:Array<{hanzi:string;pinyin:string}>};
const pinyin=new Map(language.pronunciations.map(row=>[row.hanzi,row.pinyin]));
const textById=new Map<string,SourceText>();
for(const sourceDomain of ['personal-community','education-work','nature-technology','society-economy','arts-sports-exchange','culture-history']){
 const pack=JSON.parse(readFileSync(`content/drafts/hsk4-${sourceDomain}-long-form-2026.07.json`,'utf8')) as {lessons:Array<{texts:SourceText[]}>};
 for(const lesson of pack.lessons)for(const text of lesson.texts)textById.set(text.textId,text);
}
const block=(id:string,fields:Partial<LessonBlock>):LessonBlock=>({...emptyLessonBlock(id),...fields});
const readInsteadOfListen=(copy:string)=>copy.replace(/Sau một lượt nghe/gi,'Sau một lượt đọc transcript').replace(/Nghe lại/gi,'Đọc lại transcript').replace(/Nghe hai nguồn/gi,'Đọc hai nguồn (nguồn nghe dùng transcript)').replace(/nguồn nghe/gi,'nguồn dạng transcript').replace(/đoạn nghe/gi,'đoạn nguồn').replace(/\bNghe\b/g,'Đọc transcript');
const stageFor=(kind:string):'understand'|'practice'|'transfer'=>kind.includes('structure-map')?'understand':kind.includes('source-evidence')||kind.includes('inference')?'practice':'transfer';
const items=manuscript.lessons.map(item=>{
 const id=item.lessonId,lesson=LESSON_BY_ID.get(id),meta=rich.lessons.find(row=>row.lessonId===id);
 if(!lesson||lesson.unitId!=='hsk4-timed-integration'||!meta||!item.sourceBindings.length||!item.promptUnits.length)throw Error(`Incomplete integrated lesson: ${id}`);
 const sources=item.sourceBindings.map(binding=>{const text=textById.get(binding.textId);if(!text||text.titleVi!==binding.titleVi||text.paragraphs.length!==3)throw Error(`Source binding mismatch: ${binding.textId}`);return text;});
 const cite=(refs:Evidence[])=>refs.map(ref=>{const index=sources.findIndex(text=>text.textId===ref.textId);if(index<0||ref.paragraphIds.some(pid=>!sources[index].paragraphs.some(p=>p.paragraphId===pid)))throw Error(`Evidence mismatch: ${id}`);return `Nguồn ${index+1} · đoạn ${ref.paragraphIds.map(pid=>sources[index].paragraphs.findIndex(p=>p.paragraphId===pid)+1).join(', ')}`;}).join('; ');
 const pages:LessonPageDocument['pages']=[{id:`${id}:v2:context`,title:lesson.title,layout:'focus',stage:'context',blocks:[block(`${id}:goal`,{title:'Nhiệm vụ tích hợp',body:`${readInsteadOfListen(item.blueprintObjectiveVi)}\nĐọc lại các nguồn, ghi căn cứ trước khi kết luận. Nếu bài có đồng hồ, đó chỉ là thời gian tự luyện.`}),block(`${id}:limit`,{title:'Giới hạn đánh giá',body:'Nguồn dự kiến cho nghe hiện mới có transcript và giọng tổng hợp. Hãy dùng như văn bản đọc; không có audio bản ngữ, điểm nghe, phát âm hay nói độc lập. Mở mẫu và dùng đồng hồ không cấp mastery.'})]}];
 for(const [sourceIndex,text] of sources.entries()){
  const paragraphs=text.paragraphs.map((row,index)=>{const pronunciation=pinyin.get(row.hanzi);if(!pronunciation)throw Error(`Missing Pinyin: ${text.textId}/${row.paragraphId}`);return {id:`${id}:source-${sourceIndex}-${index}`,hanzi:row.hanzi,pinyin:pronunciation,meaningVi:row.vietnamese};});
  pages.push({id:`${id}:v2:source:${sourceIndex}`,title:`Nguồn ${sourceIndex+1} · ${text.titleVi}`,layout:'focus',stage:'understand',blocks:[block(`${id}:source:${sourceIndex}`,{kind:'reading',title:text.titleVi,reading:{instruction:'Đọc ba đoạn; tìm mốc, tác nhân, dữ kiện và giới hạn trước khi làm nhiệm vụ.',notePrompt:'Ghi đoạn bạn sẽ dùng làm bằng chứng.',paragraphs}})]});
 }
 for(const [index,unit] of item.promptUnits.entries()){
  const skills=unit.primarySkill==='listening'?'Đọc transcript':unit.primarySkill==='speaking'?'Tự trình bày':unit.primarySkill==='writing'?'Viết':'Đọc';
  const prompt=readInsteadOfListen(unit.promptVi),stage=stageFor(unit.kind);
  const contract=`Sản phẩm: ${unit.responseContract.minimum}–${unit.responseContract.maximum} ${unit.responseContract.unit==='hanzi-characters'?'chữ Hán':unit.responseContract.unit==='evidence-notes'?'ghi chú có căn cứ':'đơn vị theo yêu cầu'}; ${unit.responseContract.requiredSections} phần; dùng ít nhất ${unit.responseContract.minimumSources} nguồn.`;
  const learningTarget=unit.primarySkill==='speaking'?undefined:{skill:unit.primarySkill==='writing'?'writing':'reading' as 'writing'|'reading',objective:prompt,sources:[{kind:'task' as const,id:`hsk4-local-task:${id}`}]};
  const required=[...unit.requiredMovesVi,unit.scopeBoundaryVi];
  pages.push({id:`${id}:v2:task:${index}`,title:`${skills} · bước ${index+1}`,layout:'workshop',stage,blocks:[block(`${id}:task:${index}`,{kind:'activity',title:`${item.blueprintTitleVi} · ${index+1}`,body:`${prompt}\n${contract}\nDẫn chứng: ${cite(unit.evidenceRefs)}. ${unit.timedPractice?'Bấm bắt đầu canh giờ khi sẵn sàng.':''}`,activity:{...emptyLessonActivity(),type:'rubric',timeLimitSeconds:unit.timedPractice&&unit.timeLimitSeconds?unit.timeLimitSeconds:undefined,rubric:required.map((label,criterion)=>({id:`criterion-${criterion}`,label,guidance:label})),explanation:`Bản tham khảo sau khi tự làm:\n${unit.modelHanzi}\n${unit.modelVi}\nGiới hạn: ${unit.scopeBoundaryVi}\nĐối chiếu và sửa bản đầu; đây là tự luyện, chưa chấm kỹ năng độc lập.`,learningTarget}})]});
 }
 pages.push({id:`${id}:v2:recap`,title:'Tự kiểm sau phiên',layout:'focus',stage:'transfer',blocks:[block(`${id}:recap`,{title:'Ghi điều đã sửa',body:'Chọn một kết luận bạn đã thu hẹp sau khi xem lại đoạn nguồn. Ghi số đoạn, bản cũ, bản đã sửa và điều còn chưa biết. Hoàn thành bài không đồng nghĩa đã đạt HSK4.'})]});
 const doc:LessonPageDocument={version:1,art:'reading',pages};
 const errors=[...validateLessonPages(doc),...validateLessonActivitySources(id,doc)];if(errors.length)throw Error(`${id}: ${errors.join('; ')}`);
 const dialogue=sources.flatMap((text,sourceIndex)=>text.paragraphs.map((row,index)=>({speaker:`Nguồn ${sourceIndex+1} · đoạn ${index+1}`,hanzi:row.hanzi,pinyin:pinyin.get(row.hanzi)!,meaningVi:row.vietnamese})));
 const first=dialogue[0];
 const studioContent={targetLessonId:id,titleZh:lesson.chineseTitle,objectiveVi:readInsteadOfListen(item.blueprintObjectiveVi),conceptVi:item.blueprintTitleVi,ruleVi:'Mỗi kết luận phải giữ đúng đoạn nguồn, phạm vi và điều kiện; nguồn transcript không là bằng chứng nghe.',pitfallVi:'Luyện có giờ, giọng tổng hợp, mở mẫu hoặc tự nói không cấp điểm kỹ năng độc lập.',checkpointVi:item.promptUnits.map(unit=>unit.scopeBoundaryVi).join('\n'),prerequisites:lesson.prerequisiteIds,vocabulary:lesson.wordIds,skills:lesson.skills,dialogue,grammar:meta.grammar.map(row=>({pattern:row.officialContent,explanationVi:row.explanationVi,modelExample:row.modelExample,guidedPractice:row.guidedPractice})),exercises:[{promptVi:'Chọn đoạn mở đầu nguồn 1 trước khi lập sơ đồ hoặc suy luận.',answer:first.hanzi,answerPinyin:first.pinyin,answerMeaningVi:first.meaningVi,distractors:dialogue.slice(1,3).map(row=>row.hanzi),explanationVi:'Bắt đầu ở đúng đoạn nguồn, sau đó kiểm ý chính và giới hạn.'}],lessonPages:doc,sourceVocabularyIds:lesson.wordIds,sourceLessonIds:[id,...new Set(sources.map(text=>text.textId.split(':')[0]))],sourceGrammarIds:meta.grammar.map(row=>row.id),sourceTaskIds:meta.tasks.map(row=>row.id),sourceTopicIds:meta.topics.map(row=>row.id),review:{humanReviewed:false,aiSelfReview:{accuracy:false,levelFit:false,pedagogy:false,answerIntegrity:false,originality:false}}};
 return {lessonId:id,title:lesson.title,level:'hsk4',lessonPages:doc,studioContent,editorialStatus:'draft-needs-source-review'};
});
if(items.length!==3||new Set(items.map(item=>item.lessonId)).size!==3)throw Error('Expected three distinct integrated lessons');
writeFileSync(`content/drafts/thien-lo-hsk4-${domain}-v2.json`,JSON.stringify({schemaVersion:1,humanReviewed:false,status:'draft-not-published',sourcePack:`hsk4-${domain}-integration-2026.07`,items},null,2)+'\n');
console.log({domain,lessons:items.length,pages:items.reduce((sum,item)=>sum+item.lessonPages.pages.length,0),activities:items.reduce((sum,item)=>sum+item.lessonPages.pages.flatMap(page=>page.blocks.filter(block=>block.activity)).length,0),timedActivities:items.reduce((sum,item)=>sum+item.lessonPages.pages.flatMap(page=>page.blocks.filter(block=>block.activity?.timeLimitSeconds)).length,0)});
