import {readFileSync,writeFileSync} from 'node:fs';
import {buildNarrativeBatch} from './build-narrative-batch';
import {referenceNarratives} from './hsk3-reference-narratives';
import {referenceDecisions} from './hsk3-reference-decisions';
import {getRichLessonContent} from '../../src/learning/richLessonContent';
import {emptyLessonBlock,validateLessonPages,type LessonPageDocument} from '../../src/learning/lessonPages';
import {emptyLessonActivity} from '../../src/learning/lessonActivities';
import {validateLessonActivitySources} from '../../src/learning/lessonActivitySources';
import type {LessonDiagram} from '../../src/learning/lessonDiagram';

const prefix='hsk3-reference-quantity-phrase-building';
const source=JSON.parse(readFileSync('content/drafts/hsk3-reference-quantity-narration-grammar-2026.07.json','utf8')) as {lessons:Array<{lessonId:string;grammar:Array<{grammarRowId:string;explanationVi:string;usageBoundaryVi:string;example:{hanzi:string;pinyin:string;vietnamese:string}}>}>};
const answerReadings:Record<string,[string,string]>={
  'lesson-01':['Bówùguǎn zài yínháng hé shūdiàn zhōngjiān.','Bảo tàng ở giữa ngân hàng và hiệu sách.'],
  'lesson-02':['Yígòng yòng le liǎng ge xiāngzi.','Tổng cộng dùng hai thùng.'],
  'lesson-03':['Lǎoshī xuǎn de yí liàng xiǎochē.','Một chiếc xe nhỏ thầy đã chọn.'],
};
const visualRows:Record<string,{type:LessonDiagram['type'];title:string;description:string;nodes:Array<[string,string,string,string,string]>}>={
  'lesson-01':{type:'comparison',title:'Ai, ở đâu và phạm vi nào',description:'Đối chiếu người được rủ, người khác và vị trí bảo tàng trong đúng chuyến đi của văn bản. Được phép hỏi không đồng nghĩa đã hỏi.',nodes:[
    ['guide','老王','Lǎo Wáng','bác Vương','Dẫn nhóm tới bảo tàng.'],
    ['group','咱们／别人','zánmen / biérén','chúng ta / người khác','Nhóm được rủ về trường khác những người còn xếp hàng.'],
    ['place','中间','zhōngjiān','ở giữa','Bảo tàng giữa ngân hàng và hiệu sách.'],
  ]},
  'lesson-02':{type:'comparison',title:'Vật, lượt và tổng số',description:'Bảng phân biệt số vật nhận được, hai lượt đọc và tổng số thùng dùng trong đúng câu chuyện. Không chia tổng số thành số mỗi người.',nodes:[
    ['material','两封信／三张照片','liǎng fēng xìn / sān zhāng zhàopiàn','hai thư / ba ảnh','封 đếm thư; 张 đếm ảnh.'],
    ['action','两遍','liǎng biàn','hai lượt','Tiểu Lâm đọc thông báo trọn hai lượt.'],
    ['total','一共两个箱子','yígòng liǎng ge xiāngzi','tổng cộng hai thùng','Số thùng của cả nhóm.'],
  ]},
  'lesson-03':{type:'timeline',title:'Một chuyến đi, nhiều loại mốc',description:'Khoảng 8 giờ là giờ rời trường được kể theo ước lượng, năm sáu là số xe đỗ, ba bốn là số trạm còn lại; nhóm chỉ lên một xe nhỏ. Trưa đã thấy cầu.',nodes:[
    ['depart','大概八点','dàgài bā diǎn','khoảng 8 giờ','Không phải mốc chính xác.'],
    ['vehicle','五六辆车','wǔ liù liàng chē','khoảng năm sáu xe','Có ở cửa; nhóm chọn một xe.'],
    ['stops','三四站','sān sì zhàn','khoảng ba bốn trạm','Mỗi trạm đều kiểm tra tuyến.'],
    ['arrive','中午终于看见','zhōngwǔ zhōngyú kànjiàn','trưa cuối cùng nhìn thấy','Nhìn thấy cầu cổ.'],
  ]},
};
const items=buildNarrativeBatch({lessonPrefix:prefix,level:'hsk3',manuscripts:referenceNarratives,answerReadings});
for(const item of items){
  const suffix=item.lessonId.slice(prefix.length+1),visual=visualRows[suffix];
  const sourceLesson=source.lessons.find(entry=>entry.lessonId===item.lessonId);
  const rich=getRichLessonContent(item.lessonId);
  if(!visual||!sourceLesson||!rich||sourceLesson.grammar.length!==7||rich.grammar.length!==7)throw Error(`Incomplete reference lesson: ${item.lessonId}`);
  const nodes=visual.nodes.map(([id,label,pinyin,meaningVi,note],index)=>({id,label,pinyin,meaningVi,note,x:visual.type==='timeline'?0:index,y:visual.type==='timeline'?index:0}));
  const diagram:LessonDiagram={type:visual.type,description:visual.description,nodes};
  item.lessonPages.pages.splice(2,0,{id:`${item.lessonId}:v2:diagram`,title:visual.title,layout:'focus',stage:'understand',blocks:[{...emptyLessonBlock(`${item.lessonId}:v2:block:diagram`),kind:'diagram',title:visual.title,diagram}]});
  const grammarPages:LessonPageDocument['pages']=sourceLesson.grammar.map((grammar,index)=>{
    const decision=referenceDecisions.find(row=>`hsk3-grammar-row-${row.row}`===grammar.grammarRowId);
    if(!decision||!rich.grammar.some(row=>row.id===grammar.grammarRowId))throw Error(`Missing source decision: ${grammar.grammarRowId}`);
    const base=`${item.lessonId}:v2:grammar:${grammar.grammarRowId}`;
    return {id:base,title:`${index+1}/7 · ${decision.title}`,layout:'focus',stage:'practice',blocks:[
      {...emptyLessonBlock(`${base}:explain`),title:decision.title,body:`${grammar.explanationVi}\n${grammar.usageBoundaryVi}`},
      {...emptyLessonBlock(`${base}:example`),kind:'dialogue',title:'Câu mẫu có ngữ cảnh',hanzi:grammar.example.hanzi,pinyin:grammar.example.pinyin,meaningVi:grammar.example.vietnamese},
      {...emptyLessonBlock(`${base}:practice`),kind:'activity',title:'Tự điền trước khi xem đáp án',body:decision.prompt,activity:{...emptyLessonActivity(),type:'cloze',acceptedAnswers:[decision.answer],explanation:`${decision.feedback} ${decision.answer} · ${decision.answerPinyin} · ${decision.answerVi}.`,learningTarget:{skill:'grammar',objective:decision.title,sources:[{kind:'grammar',id:grammar.grammarRowId}]}}},
    ]};
  });
  const transferIndex=item.lessonPages.pages.findIndex(page=>page.id.endsWith(':transfer'));
  item.lessonPages.pages.splice(transferIndex,0,...grammarPages);
  // Studio grammar examples are speakerless; the narrative builder inferred a dialogue speaker.
  item.studioContent.grammar=rich.grammar.map(grammar=>{
    const decision=referenceDecisions.find(row=>`hsk3-grammar-row-${row.row}`===grammar.id)!;
    return {pattern:decision.title,explanationVi:`${grammar.explanationVi} ${sourceLesson.grammar.find(row=>row.grammarRowId===grammar.id)!.usageBoundaryVi}`,modelExample:grammar.modelExample,guidedPractice:{promptVi:decision.prompt,modelAnswerHanzi:decision.answer,modelAnswerPinyin:decision.answerPinyin,modelAnswerMeaningVi:decision.answerVi}};
  }) as unknown as typeof item.studioContent.grammar;
  item.studioContent.lessonPages=item.lessonPages;
  const errors=[...validateLessonPages(item.lessonPages),...validateLessonActivitySources(item.lessonId,item.lessonPages)];
  if(errors.length)throw Error(`${item.lessonId}: ${errors.join('; ')}`);
}
writeFileSync('content/drafts/thien-lo-hsk3-reference-v2.json',JSON.stringify({schemaVersion:1,humanReviewed:false,status:'draft-not-published',sourcePack:'hsk3-reference-quantity-narration-grammar-2026.07',items},null,2)+'\n');
console.log(items.map(item=>({lessonId:item.lessonId,pages:item.lessonPages.pages.length,activities:item.lessonPages.pages.flatMap(page=>page.blocks.filter(block=>block.activity)).length,grammarSources:getRichLessonContent(item.lessonId)?.grammar.length})));
