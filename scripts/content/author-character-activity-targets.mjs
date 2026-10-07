/** Exact character/source mapping for the already authored HSK1 character batch. */
import {readFileSync,writeFileSync} from 'node:fs';
import {lessonActivitySources} from '../../src/learning/lessonActivitySources.ts';
import {applyEditorialActivityTargets} from '../../src/content/editorialActivityTargets.ts';
import {applyCharacterTargetCorrections} from './apply-character-target-corrections.mjs';

const manuscript=JSON.parse(readFileSync('content/drafts/thien-lo-character-batch-v2.json','utf8'));
const output='content/drafts/thien-lo-character-activity-targets.json';
const contentCorrections={'characters-13':{
 'characters-13:v2:block:recall-hsk1-character-246':{
  before:{body:'Cụm từ đã học có nghĩa “làm”, đọc zuò: □. Điền một chữ vào ô vuông; nếu có nhiều ô, chúng dùng cùng một chữ. Thử nhớ trước khi quay lại mẫu. Pinyin và IME vẫn là hỗ trợ; đây không phải kiểm tra viết tay độc lập.',acceptedAnswers:['做','作'],explanation:'Chữ cần nhớ: 做. Cụm đầy đủ: 做 · zuò · làm. 作 cũng có âm zuò và nghĩa làm nên được chấp nhận trong câu chỉ hỏi nghĩa này. Trong từ cụ thể phải chọn theo cách dùng: 做饭 (nấu ăn), 工作 (làm việc).  Nếu chưa nhớ, đối chiếu hình rồi thử lại ở lần ôn sau.'},
  after:{body:'Cụm từ đã học có nghĩa “nấu cơm”, đọc zuòfàn: □饭. Điền chữ còn thiếu vào từ này. Thử nhớ trước khi quay lại mẫu. Pinyin và IME vẫn là hỗ trợ; đây không phải kiểm tra viết tay độc lập.',acceptedAnswers:['做'],explanation:'Chữ cần nhớ: 做. Cụm đầy đủ: 做饭 · zuòfàn · nấu cơm. 作 cũng đọc zuò trong một số từ nhưng không thay 做 trong 做饭. Nếu chưa nhớ, đối chiếu hình rồi thử lại ở lần ôn sau.'},
 },
}};
const targets={};
let total=0;
for(const lesson of manuscript.items){
 const sourceMap=new Map();
 for(const source of lessonActivitySources(lesson.lessonId).filter(source=>source.kind==='character')){
  const [hanzi,contextWord,meaning]=source.label.split(' · ');
  if([...hanzi].length!==1||sourceMap.has(hanzi)||!contextWord||!meaning)throw Error(`Character source ambiguity: ${lesson.lessonId}:${hanzi}`);
  sourceMap.set(hanzi,{id:source.id,contextWord,meaning});
 }
 const pages=applyCharacterTargetCorrections(lesson.lessonPages,contentCorrections[lesson.lessonId]??{});
 const activities=pages.pages.flatMap(page=>page.blocks.filter(block=>block.kind==='activity'));
 const guided=activities.find(block=>block.id.endsWith(':block:guided'));
 const guidedCharacter=guided?.activity?.acceptedAnswers;
 if(activities.length<20||guidedCharacter?.length!==1)throw Error(`Unexpected practice structure: ${lesson.lessonId}`);
 const mapped={};
 for(const block of activities){
  const activity=block.activity;
  if(!activity)throw Error(`Missing activity: ${block.id}`);
  const suffix=block.id.split(':block:')[1];
  const kind=suffix?.startsWith('locate-')?'locate':suffix?.startsWith('recall-')?'recall':suffix;
  let hanzi;
  if(['locate','recall','guided'].includes(kind)){
   if(activity.type!=='cloze'||activity.acceptedAnswers.length!==1)throw Error(`Unexpected cloze: ${block.id}`);
   hanzi=activity.acceptedAnswers[0];
  }else if(kind==='choice'){
   if(activity.type!=='choice'||activity.answerIds.length!==1)throw Error(`Unexpected choice: ${block.id}`);
   hanzi=activity.options.find(option=>option.id===activity.answerIds[0])?.text;
  }else if(kind==='transfer'){
   if(activity.type!=='rubric'||activity.rubric.length<2)throw Error(`Unexpected transfer: ${block.id}`);
   hanzi=guidedCharacter[0];
  }else throw Error(`Unknown activity form: ${block.id}`);
  if([...hanzi].length!==1||!activity.explanation.includes(hanzi))throw Error(`Character answer drift: ${block.id}`);
  const source=sourceMap.get(hanzi);
  if(!source)throw Error(`Character source outside lesson: ${block.id}:${hanzi}`);
  const objective={
   locate:`Nhận ra chữ ${hanzi} trong từ ${source.contextWord} khi mẫu còn hiển thị; đây là nhìn và gõ theo mẫu, không phải nhớ độc lập.`,
   recall:`Từ nghĩa “${source.meaning}” và gợi ý Pinyin, điền chữ ${hanzi} vào từ ${source.contextWord}; Pinyin/IME và mẫu đã học là hỗ trợ, không phải viết tay độc lập.`,
   choice:`Chọn hình chữ ${hanzi} để hoàn thành yêu cầu “${block.body}”; phương án hiển thị nên chưa đo nhớ chữ độc lập.`,
   guided:`Gõ chữ ${hanzi} vào yêu cầu “${block.body}” sau khi đã thấy câu chọn mẫu; lượt này có prior exposure.`,
   transfer:`Tự tạo câu theo tình huống “${block.body}” và đối chiếu cách dùng chữ ${hanzi}; rubric tự soát không chấm viết độc lập.`,
  }[kind];
  mapped[block.id]={skill:'reading',objective,sources:[{kind:'character',id:source.id}]};
 }
 applyEditorialActivityTargets(lesson.lessonId,pages,mapped);
 if(Object.keys(mapped).length!==activities.length)throw Error(`Incomplete mapping: ${lesson.lessonId}`);
 targets[lesson.lessonId]=mapped;
 total+=activities.length;
}
const plan={version:1,humanReviewed:false,lessonIds:manuscript.items.map(item=>item.lessonId),contentCorrections,targets};
const serialized=JSON.stringify(plan,null,2)+'\n';
if(process.argv.includes('--check')){
 if(readFileSync(output,'utf8')!==serialized)throw Error('Character target plan drift');
}else writeFileSync(output,serialized);
console.log({mode:process.argv.includes('--check')?'check':'write',lessons:plan.lessonIds.length,targets:total});
