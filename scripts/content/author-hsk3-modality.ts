import {readFileSync,writeFileSync} from 'node:fs';
import {buildNarrativeBatch} from './build-narrative-batch';
import {modalityNarratives} from './hsk3-modality-narratives';
import {modalityDecisions} from './hsk3-modality-decisions';
import {getRichLessonContent} from '../../src/learning/richLessonContent';
import {emptyLessonBlock,validateLessonPages,type LessonPageDocument} from '../../src/learning/lessonPages';
import {emptyLessonActivity} from '../../src/learning/lessonActivities';
import {validateLessonActivitySources} from '../../src/learning/lessonActivitySources';
import type {LessonDiagram} from '../../src/learning/lessonDiagram';

const prefix='hsk3-modality-time-viewpoint-framing';
const source=JSON.parse(readFileSync('content/drafts/hsk3-modality-time-narration-grammar-2026.07.json','utf8')) as {lessons:Array<{lessonId:string;grammar:Array<{grammarRowId:string;explanationVi:string;usageBoundaryVi:string;example:{hanzi:string;pinyin:string;vietnamese:string}}>}>};
const answerReadings:Record<string,[string,string]>={
 'lesson-01':['Nǎinai bìxū ànshí chī yào, yě yīnggāi duō xiūxi.','Bà phải uống thuốc đúng giờ và cũng nên nghỉ nhiều.'],
 'lesson-02':['Měitiān tīng yí duàn xīnwén.','Nghe một đoạn tin mỗi ngày.'],
 'lesson-03':['Yí ge diànhuà yě méi dǎ.','Không gọi dù một cuộc điện thoại.'],
};
type Visual={type:LessonDiagram['type'];title:string;description:string;nodes:Array<[string,string,string,string,string]>};
const visuals:Record<string,Visual>={
 'lesson-01':{type:'timeline',title:'Từ triệu chứng đến lời dặn',description:'Giữ riêng dấu hiệu người kể quan sát, chỉ dẫn bác sĩ và việc không còn cần làm. Sơ đồ không cho biết chẩn đoán.',nodes:[
  ['symptom','好像有些累','hǎoxiàng yǒuxiē lèi','có vẻ hơi mệt','Nhận xét của người kể, chưa phải chẩn đoán.'],
  ['advice','应该多休息','yīnggāi duō xiūxi','nên nghỉ nhiều','Lời khuyên được kể lại.'],
  ['required','必须按时吃药','bìxū ànshí chī yào','phải uống thuốc đúng giờ','Yêu cầu bác sĩ nêu trong truyện.'],
  ['release','不必再排队','búbì zài páiduì','không cần xếp hàng nữa','Bỏ yêu cầu, không phải lệnh cấm.'],
 ]},
 'lesson-02':{type:'comparison',title:'Bốn loại căn cứ và góc nhìn',description:'Mục đích học, căn cứ lập kế hoạch, điều kiện kể lại và kết luận từ kết quả cá nhân có vai trò khác nhau.',nodes:[
  ['purpose','为了提高听力','wèile tígāo tīnglì','để nâng nghe hiểu','Mục đích.'],
  ['basis','根据老师的建议','gēnjù lǎoshī de jiànyì','dựa theo lời khuyên thầy','Căn cứ.'],
  ['condition','有时间的话','yǒu shíjiān dehuà','nếu có thời gian','Điều kiện kể lại tin.'],
  ['inference','看来适合我','kànlái shìhé wǒ','xem ra hợp với tôi','Kết luận cá nhân sau một tháng.'],
 ]},
 'lesson-03':{type:'timeline',title:'Khoảng xa nhà và lần trở về',description:'Ba năm là khoảng rời nhà; “không gọi cuộc nào” chỉ mấy ngày trước lần về này. Phân biệt lời bố, thái độ mẹ và thái độ người kể.',nodes:[
  ['away','离开家三年','líkāi jiā sān nián','rời nhà ba năm','Mốc kéo dài đến lần về.'],
  ['before','回来前的几天一个电话也没打','huílai qián de jǐ tiān yí ge diànhuà yě méi dǎ','mấy ngày trước lần về không gọi cuộc nào','Phạm vi phủ định của lời kể.'],
  ['pickup','该出门接他了','gāi chūmén jiē tā le','đã đến lúc đi đón','Thời điểm cả nhà chuẩn bị ra ga.'],
  ['after','到家以后解释','dào jiā yǐhòu jiěshì','về nhà rồi giải thích','Lý do đi làm xa được nói sau khi về.'],
 ]},
};

const items=buildNarrativeBatch({lessonPrefix:prefix,level:'hsk3',manuscripts:modalityNarratives,answerReadings});
for(const item of items){
 const suffix=item.lessonId.slice(prefix.length+1),visual=visuals[suffix];
 const sourceLesson=source.lessons.find(entry=>entry.lessonId===item.lessonId);
 const rich=getRichLessonContent(item.lessonId);
 if(!visual||!sourceLesson||!rich||sourceLesson.grammar.length!==9||rich.grammar.length!==9)throw Error(`Incomplete modality lesson: ${item.lessonId}`);
 const diagram:LessonDiagram={type:visual.type,description:visual.description,nodes:visual.nodes.map(([id,label,pinyin,meaningVi,note],index)=>({id,label,pinyin,meaningVi,note,x:visual.type==='timeline'?0:index,y:visual.type==='timeline'?index:0}))};
 item.lessonPages.pages.splice(2,0,{id:`${item.lessonId}:v2:diagram`,title:visual.title,layout:'focus',stage:'understand',blocks:[{...emptyLessonBlock(`${item.lessonId}:v2:block:diagram`),kind:'diagram',title:visual.title,diagram}]});
 const grammarPages:LessonPageDocument['pages']=sourceLesson.grammar.map((grammar,index)=>{
  const decision=modalityDecisions.find(row=>`hsk3-grammar-row-${row.row}`===grammar.grammarRowId);
  if(!decision||!rich.grammar.some(row=>row.id===grammar.grammarRowId))throw Error(`Missing grammar decision: ${grammar.grammarRowId}`);
  const base=`${item.lessonId}:v2:grammar:${grammar.grammarRowId}`;
  return {id:base,title:`${index+1}/9 · ${decision.title}`,layout:'focus',stage:'practice',blocks:[
   {...emptyLessonBlock(`${base}:explain`),title:decision.title,body:`${grammar.explanationVi}\n${grammar.usageBoundaryVi}`},
   {...emptyLessonBlock(`${base}:example`),kind:'dialogue',title:'Câu mẫu có ngữ cảnh',hanzi:grammar.example.hanzi,pinyin:grammar.example.pinyin,meaningVi:grammar.example.vietnamese},
   {...emptyLessonBlock(`${base}:practice`),kind:'activity',title:'Tự điền trước khi xem đáp án',body:decision.prompt,activity:{...emptyLessonActivity(),type:'cloze',acceptedAnswers:[decision.answer],explanation:`${decision.feedback} ${decision.answer} · ${decision.answerPinyin} · ${decision.answerVi}.`,learningTarget:{skill:'grammar',objective:decision.title,sources:[{kind:'grammar',id:grammar.grammarRowId}]}}},
  ]};
 });
 const transferIndex=item.lessonPages.pages.findIndex(page=>page.id.endsWith(':transfer'));
 item.lessonPages.pages.splice(transferIndex,0,...grammarPages);
 item.studioContent.grammar=rich.grammar.map(grammar=>{
  const decision=modalityDecisions.find(row=>`hsk3-grammar-row-${row.row}`===grammar.id)!;
  return {pattern:decision.title,explanationVi:`${grammar.explanationVi} ${sourceLesson.grammar.find(row=>row.grammarRowId===grammar.id)!.usageBoundaryVi}`,modelExample:grammar.modelExample,guidedPractice:{promptVi:decision.prompt,modelAnswerHanzi:decision.answer,modelAnswerPinyin:decision.answerPinyin,modelAnswerMeaningVi:decision.answerVi}};
 }) as unknown as typeof item.studioContent.grammar;
 item.studioContent.lessonPages=item.lessonPages;
 const errors=[...validateLessonPages(item.lessonPages),...validateLessonActivitySources(item.lessonId,item.lessonPages)];
 if(errors.length)throw Error(`${item.lessonId}: ${errors.join('; ')}`);
}
writeFileSync('content/drafts/thien-lo-hsk3-modality-v2.json',JSON.stringify({schemaVersion:1,humanReviewed:false,status:'draft-not-published',sourcePack:'hsk3-modality-time-narration-grammar-2026.07',items},null,2)+'\n');
console.log(items.map(item=>({lessonId:item.lessonId,pages:item.lessonPages.pages.length,activities:item.lessonPages.pages.flatMap(page=>page.blocks.filter(block=>block.activity)).length,grammarSources:getRichLessonContent(item.lessonId)?.grammar.length})));
