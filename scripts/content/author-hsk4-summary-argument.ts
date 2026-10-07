/** Turn source-bound HSK4 writing manuscripts into editable Thiên Lộ pages. */
import {readFileSync,writeFileSync} from 'node:fs';
import {LESSON_BY_ID} from '../../src/data/curriculum';
import {emptyLessonBlock,validateLessonPages,type LessonBlock,type LessonPageDocument} from '../../src/learning/lessonPages';
import {emptyLessonActivity} from '../../src/learning/lessonActivities';
import {validateLessonActivitySources} from '../../src/learning/lessonActivitySources';

type SourceParagraph={paragraphId:string;hanzi:string;vietnamese:string};
type SourceText={textId:string;titleVi:string;paragraphs:SourceParagraph[]};
type SourcePack={lessons:Array<{lessonId:string;texts:SourceText[]}>};
type Evidence={textId:string;paragraphIds:string[]};
type Grammar={grammarRowId:string;officialContent:string;functionVi:string;modelHanzi:string;modelVi:string;scopeBoundaryVi:string};
type Audit={itemId:string;claimHanzi:string;claimVi:string;classification:'fact'|'interpretation';evidenceRefs:Evidence[];rationaleVi:string;inferenceBoundaryVi:string};
type Paraphrase={itemId:string;promptVi:string;modelHanzi:string;modelVi:string;preservedFactsVi:string[];prohibitedExpansionVi:string;evidenceRefs:Evidence[]};
type Prompt={promptVi:string;modelHanzi:string;modelVi:string;requiredElementsVi:string[];prohibitedExpansionVi?:string;counterargumentVi?:string;conclusionBoundaryVi?:string;evidenceRefs:Evidence[]};
type Defense={promptVi:string;requiredMovesVi:string[];modelOutlineHanzi:string[];modelOutlineVi:string[];evidenceRefs:Evidence[]};
type Manuscript={lessonId:string;blueprintTitleVi:string;blueprintObjectiveVi:string;mappedTaskIds:string[];sourceBindings:Array<{textId:string;titleVi:string}>;grammarTargets:Grammar[];sourceAuditItems:Audit[];paraphraseItems:Paraphrase[];summaryPrompt:Prompt;argumentPrompt:Prompt;spokenDefensePrompt:Defense};
type Rich={lessonId:string;grammar:Array<{id:string;label:string;officialContent:string;explanationVi:string;modelExample:{hanzi:string;pinyin:string;meaningVi:string};guidedPractice:{promptVi:string;modelAnswerHanzi:string;modelAnswerPinyin:string;modelAnswerMeaningVi:string}}> ;tasks:Array<{id:string;titleVi:string}>;topics:Array<{id:string}>};

const domain=process.argv.find(arg=>arg.startsWith('--domain='))?.slice(9)??'precision-reference-quantity';
if(!/^[a-z-]+$/.test(domain))throw Error('Invalid HSK4 domain');
const manuscript=JSON.parse(readFileSync(`content/drafts/hsk4-${domain}-summary-argument-2026.07.json`,'utf8')) as {lessons:Manuscript[]};
const rich=JSON.parse(readFileSync('content/runtime/hsk4-level-rich-lessons.json','utf8')) as {lessons:Rich[]};
const language=JSON.parse(readFileSync('content/drafts/hsk4-local-language-support-2026.08.json','utf8')) as {pronunciations:Array<{hanzi:string;pinyin:string}>};
const pinyin=new Map(language.pronunciations.map(row=>[row.hanzi,row.pinyin]));
const textById=new Map<string,SourceText>();
for(const sourceDomain of ['personal-community','education-work','nature-technology','society-economy','arts-sports-exchange','culture-history']){
 const pack=JSON.parse(readFileSync(`content/drafts/hsk4-${sourceDomain}-long-form-2026.07.json`,'utf8')) as SourcePack;
 for(const lesson of pack.lessons)for(const text of lesson.texts)textById.set(text.textId,text);
}
const block=(id:string,fields:Partial<LessonBlock>):LessonBlock=>({...emptyLessonBlock(id),...fields});
const lessonItems=manuscript.lessons.map(source=>{
 const id=source.lessonId,lesson=LESSON_BY_ID.get(id),meta=rich.lessons.find(row=>row.lessonId===id);
 if(id==='hsk4-precision-reference-quantity-lesson-01'){
  source.summaryPrompt.modelHanzi=source.summaryPrompt.modelHanzi.replace('服务表只记录一次社区活动','服务表只记录明河社区的有限情况');
  source.summaryPrompt.modelVi=source.summaryPrompt.modelVi.replace('mỗi nguồn chỉ phản ánh một hoạt động hoặc một nhà ga','mỗi nguồn chỉ phản ánh một cộng đồng cụ thể hoặc một nhà ga');
 }
 if(!lesson||lesson.unitId!=='hsk4-summary-argument'||!meta||source.sourceBindings.length!==2||source.sourceAuditItems.length!==2||source.paraphraseItems.length!==2||source.grammarTargets.length!==meta.grammar.length)throw Error(`Incomplete summary inventory: ${id}`);
 if(source.mappedTaskIds.some(task=>!meta.tasks.some(row=>row.id===task)))throw Error(`Task mismatch: ${id}`);
 const sources=source.sourceBindings.map(binding=>{
  const text=textById.get(binding.textId);if(!text||text.titleVi!==binding.titleVi||text.paragraphs.length!==3)throw Error(`Source binding mismatch: ${binding.textId}`);
  return text;
 });
 const cite=(evidence:Evidence[])=>evidence.map(ref=>{
  const index=sources.findIndex(text=>text.textId===ref.textId);
  if(index<0||ref.paragraphIds.some(pid=>!sources[index].paragraphs.some(p=>p.paragraphId===pid)))throw Error(`Evidence mismatch: ${id}`);
  return `Nguồn ${index===0?'A':'B'} · đoạn ${ref.paragraphIds.map(pid=>sources[index].paragraphs.findIndex(p=>p.paragraphId===pid)+1).join(', ')}`;
 }).join('; ');
 const target=(skill:'reading'|'writing',objective:string,kind:'task'|'grammar'='task')=>({skill,objective,sources:[{kind,id:kind==='grammar'?`hsk4-pattern:${id}`:`hsk4-local-task:${id}`}]});
 const pages:LessonPageDocument['pages']=[{id:`${id}:v2:context`,title:lesson.title,layout:'focus',stage:'context',blocks:[block(`${id}:goal`,{title:'Nhiệm vụ lập luận',body:`${source.blueprintObjectiveVi}\nĐọc lại hai nguồn đã học; phân biệt dữ kiện, diễn giải và giả định trước khi viết.`}),block(`${id}:audio-limit`,{title:'Giới hạn học liệu',body:'Nguồn B hiện là transcript để đọc. Giọng đọc tổng hợp chỉ hỗ trợ luyện theo văn bản; không có điểm nghe/phát âm độc lập.'})]}];
 for(const [index,text] of sources.entries()){
  const paragraphs=text.paragraphs.map((p,paragraphIndex)=>{
   const pronunciation=pinyin.get(p.hanzi);if(!pronunciation)throw Error(`Missing Pinyin: ${text.textId}/${p.paragraphId}`);
   return {id:`${id}:source-${index}-${paragraphIndex}`,hanzi:p.hanzi,pinyin:pronunciation,meaningVi:p.vietnamese};
  });
  pages.push({id:`${id}:v2:source:${index}`,title:`Nguồn ${index===0?'A':'B'} · ${text.titleVi}`,layout:'focus',stage:'understand',blocks:[block(`${id}:source:${index}`,{kind:'reading',title:text.titleVi,reading:{instruction:`Đọc lại ba đoạn nguồn ${index===0?'A':'B'} và ghi dữ kiện cho bài tóm tắt.`,notePrompt:'Thông tin nào được nói rõ, thông tin nào chỉ là suy luận?',paragraphs}})]});
 }
 for(const [index,audit] of source.sourceAuditItems.entries()){
  const fact=audit.classification==='fact';
  pages.push({id:`${id}:v2:audit:${index}`,title:`Phân biệt dữ kiện · ${index+1}`,layout:'focus',stage:'practice',blocks:[block(`${id}:audit:${index}`,{kind:'activity',title:'Dữ kiện hay diễn giải?',body:`${audit.claimHanzi}\n${audit.claimVi}\nĐối chiếu ${cite(audit.evidenceRefs)} trước khi chọn.`,activity:{...emptyLessonActivity(),options:[{id:'fact',text:'Dữ kiện được nguồn nói rõ',feedback:fact?`Đúng. ${audit.rationaleVi}`:`Chưa đúng. ${audit.inferenceBoundaryVi}`},{id:'interpretation',text:'Diễn giải vượt hoặc thêm vào nguồn',feedback:fact?`Chưa đúng. ${audit.rationaleVi}`:`Đúng. ${audit.rationaleVi}`}],answerIds:[audit.classification],explanation:`${audit.rationaleVi} Giới hạn: ${audit.inferenceBoundaryVi}`,learningTarget:target('reading',audit.claimVi)}})]});
 }
 for(const [index,paraphrase] of source.paraphraseItems.entries()){
  pages.push({id:`${id}:v2:paraphrase:${index}`,title:`Diễn đạt lại · nguồn ${index===0?'A':'B'}`,layout:'workshop',stage:'practice',blocks:[block(`${id}:paraphrase:${index}`,{kind:'activity',title:'Viết lại rồi kiểm nguồn',body:`${paraphrase.promptVi}\nDẫn chứng: ${cite(paraphrase.evidenceRefs)}. Viết trước khi mở mẫu.`,activity:{...emptyLessonActivity(),type:'rubric',rubric:[...paraphrase.preservedFactsVi,paraphrase.prohibitedExpansionVi].map((label,i)=>({id:`point-${i}`,label,guidance:label})),explanation:`Bản đối chiếu (không phải đáp án duy nhất):\n${paraphrase.modelHanzi}\n${paraphrase.modelVi}\nSửa bản đầu sau khi đối chiếu; mở mẫu không tự chứng minh kỹ năng viết.`,learningTarget:target('writing',paraphrase.promptVi)}})]});
 }
 for(const [index,grammar] of source.grammarTargets.entries()){
  const teaching=meta.grammar.find(row=>row.id===grammar.grammarRowId);
  if(!teaching||teaching.modelExample.hanzi!==grammar.modelHanzi||teaching.modelExample.meaningVi!==grammar.modelVi||!teaching.modelExample.pinyin)throw Error(`Grammar/Pinyin mismatch: ${id}/${grammar.grammarRowId}`);
  pages.push({id:`${id}:v2:grammar:${index}`,title:`Diễn đạt chính xác · ${grammar.officialContent}`,layout:'split',stage:'understand',blocks:[block(`${id}:grammar-rule:${index}`,{title:grammar.officialContent,body:`${grammar.functionVi}\nGiới hạn: ${grammar.scopeBoundaryVi}\nCâu mẫu sau là tình huống giả định để luyện cấu trúc, không phải dữ kiện trong hai nguồn.`}),block(`${id}:grammar-example:${index}`,{kind:'dialogue',title:'Câu giả định',hanzi:teaching.modelExample.hanzi,pinyin:teaching.modelExample.pinyin,meaningVi:teaching.modelExample.meaningVi}),block(`${id}:grammar-write:${index}`,{kind:'activity',title:'Tạo câu mới từ nguồn thật',body:`Viết một câu dùng ${grammar.officialContent} để diễn đạt dữ kiện thật từ hai nguồn. Ghi đoạn nguồn; không sao chép chi tiết giả định của câu mẫu.`,activity:{...emptyLessonActivity(),type:'rubric',rubric:[{id:'form',label:`Dùng ${grammar.officialContent} đúng chức năng`,guidance:grammar.functionVi},{id:'evidence',label:'Dẫn đúng đoạn nguồn',guidance:'Câu mới phải kiểm được ở nguồn A hoặc B.'},{id:'scope',label:'Không suy quá phạm vi',guidance:grammar.scopeBoundaryVi}],explanation:`Câu mẫu cấu trúc: ${grammar.modelHanzi}\n${grammar.modelVi}\nMẫu có thể chứa tình huống giả định, không thay thế câu bạn tự viết từ nguồn.`,learningTarget:target('writing',grammar.functionVi,'grammar')}})]});
 }
 const writing=(key:'summary'|'argument',prompt:Prompt)=>{
  const criteria=[...prompt.requiredElementsVi,prompt.prohibitedExpansionVi,prompt.counterargumentVi,prompt.conclusionBoundaryVi].filter((entry):entry is string=>Boolean(entry));
  pages.push({id:`${id}:v2:${key}`,title:key==='summary'?'Tóm tắt hai nguồn':'Lập luận có phản biện',layout:'workshop',stage:'transfer',blocks:[block(`${id}:${key}`,{kind:'activity',title:key==='summary'?'Viết tóm tắt':'Viết lập luận',body:`${prompt.promptVi}\nDẫn chứng: ${cite(prompt.evidenceRefs)}. Viết bản đầu trước khi mở mẫu.`,activity:{...emptyLessonActivity(),type:'rubric',rubric:criteria.map((label,index)=>({id:`criterion-${index}`,label,guidance:label})),explanation:`Một bản để đối chiếu:\n${prompt.modelHanzi}\n${prompt.modelVi}\nĐối chiếu dữ kiện và sửa ít nhất một câu. Mẫu không cấp điểm viết độc lập.`,learningTarget:target('writing',prompt.promptVi)}})]});
 };
 writing('summary',source.summaryPrompt);writing('argument',source.argumentPrompt);
 const defense=source.spokenDefensePrompt;
  pages.push({id:`${id}:v2:defense`,title:'Tự bảo vệ ý kiến',layout:'workshop',stage:'transfer',blocks:[block(`${id}:defense`,{kind:'activity',title:'Nói theo dàn ý của bạn',body:`${defense.promptVi}\nTự nói thành tiếng hoặc ghi âm bằng công cụ bạn chọn, rồi đối chiếu ${cite(defense.evidenceRefs)}. Màn này không ghi/chấm phát âm.`,activity:{...emptyLessonActivity(),type:'rubric',rubric:defense.requiredMovesVi.map((label,index)=>({id:`move-${index}`,label,guidance:label})),explanation:`Dàn ý gợi ý để đối chiếu sau khi nói:\n${defense.modelOutlineHanzi.join('\n')}\n${defense.modelOutlineVi.join('\n')}\nĐây là tự luyện, không có điểm nói độc lập.`}})]});
 const doc:LessonPageDocument={version:1,art:'reading',pages};
 const errors=[...validateLessonPages(doc),...validateLessonActivitySources(id,doc)];if(errors.length)throw Error(`${id}: ${errors.join('; ')}`);
 const dialogue=sources.flatMap((text,sourceIndex)=>text.paragraphs.map((p,paragraphIndex)=>({speaker:`Nguồn ${sourceIndex===0?'A':'B'} · đoạn ${paragraphIndex+1}`,hanzi:p.hanzi,pinyin:pinyin.get(p.hanzi)!,meaningVi:p.vietnamese})));
 const studioContent={targetLessonId:id,titleZh:lesson.chineseTitle,objectiveVi:source.blueprintObjectiveVi,conceptVi:source.blueprintTitleVi,ruleVi:'Tách dữ kiện và diễn giải; giữ nguồn, đoạn và giới hạn trước khi tóm tắt hoặc lập luận.',pitfallVi:'Câu mẫu ngữ pháp giả định không phải chứng cứ; transcript/TTS không phải audio bản ngữ hay điểm nghe.',checkpointVi:source.argumentPrompt.requiredElementsVi.join('\n'),prerequisites:lesson.prerequisiteIds,vocabulary:lesson.wordIds,skills:lesson.skills,dialogue,grammar:meta.grammar.map(row=>({pattern:row.officialContent,explanationVi:`${row.explanationVi} Câu mẫu có thể là tình huống giả định.`,modelExample:row.modelExample,guidedPractice:row.guidedPractice})),exercises:[{promptVi:'Chọn đoạn mở đầu nguồn A để xác định bối cảnh trước khi lập luận.',answer:dialogue[0].hanzi,answerPinyin:dialogue[0].pinyin,answerMeaningVi:dialogue[0].meaningVi,distractors:dialogue.slice(1,3).map(row=>row.hanzi),explanationVi:'Đọc đúng đoạn mở đầu trước khi phân loại dữ kiện và kiểm giới hạn suy luận.'}],lessonPages:doc,sourceVocabularyIds:lesson.wordIds,sourceLessonIds:[id,...new Set(sources.map(text=>text.textId.split(':')[0]))],sourceGrammarIds:meta.grammar.map(row=>row.id),sourceTaskIds:meta.tasks.map(row=>row.id),sourceTopicIds:meta.topics.map(row=>row.id),review:{humanReviewed:false,aiSelfReview:{accuracy:false,levelFit:false,pedagogy:false,answerIntegrity:false,originality:false}}};
 return {lessonId:id,title:lesson.title,level:'hsk4',lessonPages:doc,studioContent,editorialStatus:'draft-needs-source-review'};
});
if(!lessonItems.length||new Set(lessonItems.map(item=>item.lessonId)).size!==lessonItems.length)throw Error('Empty or duplicate HSK4 summary inventory');
writeFileSync(`content/drafts/thien-lo-hsk4-${domain}-v2.json`,JSON.stringify({schemaVersion:1,humanReviewed:false,status:'draft-not-published',sourcePack:`hsk4-${domain}-summary-argument-2026.07`,items:lessonItems},null,2)+'\n');
console.log({domain,lessons:lessonItems.length,pages:lessonItems.reduce((sum,item)=>sum+item.lessonPages.pages.length,0),activities:lessonItems.reduce((sum,item)=>sum+item.lessonPages.pages.flatMap(page=>page.blocks.filter(block=>block.activity)).length,0)});
