/** Exact links for HSK1 transport/leisure and school/work activities. */
import {readFileSync,writeFileSync} from 'node:fs';
import {lessonActivitySources} from '../../src/learning/lessonActivitySources.ts';
import {applyMissingEditorialActivityTargets} from '../../src/content/editorialActivityTargets.ts';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const items=[...read('content/drafts/thien-lo-journey-batch-v2.json').items,...[1,2,3,4].map(n=>read(`content/drafts/thien-lo-professional-${n}-v2.json`))];
const decisions={
 'journey-1':[
  ['journey-1:v2:block:choice','v:坐','reading','Chọn 我坐飞机去 theo vai hành khách đi máy bay, không nhận vai người lái.'],
  ['journey-1:v2:block:guided','v:坐','vocabulary','Điền 坐 khi hành khách đi máy bay, không dùng 开 chỉ điều khiển phương tiện.'],
  ['journey-1:v2:block:produce','t','writing','Viết hành trình mới với phương tiện, hướng đi và lượt về rõ điểm nhìn.'],
 ],
 'journey-2':[
  ['journey-2:v2:block:choice','v:听见','reading','Chọn câu nói đã nghe thấy người kia nói; đây là đọc mẫu bằng chữ, không phải bài đo nghe.'],
  ['journey-2:v2:block:guided','v:电影院','vocabulary','Điền 电影院 là nơi đến xem phim, phân biệt với 电影 là tác phẩm.'],
  ['journey-2:v2:block:produce','t','writing','Viết hoạt động ở nhà hoặc rạp và kết quả nhìn/nghe theo tình huống mới; không suy thành điểm nghe.'],
 ],
 'professional-1':[
  ['professional-1:v2:classification','v:大学生','vocabulary','Chọn 大学生 chỉ người học ở đại học, phân biệt với 大学 chỉ nơi/bậc học.'],
  ['professional-1:v2:repair','v:中学生','reading','Chọn 我是中学生 để giới thiệu vai học sinh trung học, không gọi bản thân là ngôi trường.'],
  ['professional-1:v2:order','g:hsk1-pattern:hsk1-study-work:01-school-levels','grammar','Sắp xếp 我在中学上学 với 在 + nơi học trước hoạt động 上学.'],
  ['professional-1:v2:cloze','v:大学生','vocabulary','Điền 大学生 để nói bản thân là sinh viên đại học.'],
  ['professional-1:v2:writing','t','writing','Viết lời giới thiệu trường/bậc học và một câu hỏi mới, tự kiểm phân biệt người học với nơi học.'],
 ],
 'professional-2':[
  ['professional-2:v2:block:repair','v:同学','reading','Chọn lời đính chính người đó là bạn học, không phải giáo viên.'],
  ['professional-2:v2:block:choose','v:汉字','reading','Chọn câu 学习写汉字 để nói học viết chữ Hán, không nhầm với tên quốc gia.'],
  ['professional-2:v2:block:order','v:同学','grammar','Sắp xếp 她是我的同学 với 我的 ngay trước 同学.'],
  ['professional-2:v2:block:recall','v:汉语|v:中文','vocabulary','Điền 汉语 hoặc 中文 để nói học tiếng Trung; cả hai đáp án được chấp nhận trong câu này.'],
  ['professional-2:v2:block:produce','t','writing','Viết lời đính chính vai giáo viên/bạn học và nói rõ việc học tiếng Trung, chữ Hán.'],
 ],
 'professional-3':[
  ['professional-3:v2:block:write-choice','v:写','reading','Chọn 我写汉字 khi đang viết, không nhầm với 读书 là đọc sách.'],
  ['professional-3:v2:block:learning-cloze','v:学|v:学习','vocabulary','Điền 学 hoặc 学习 cho 我学汉语/我学习汉语; cả hai được nhận ở câu này.'],
  ['professional-3:v2:block:book-order','v:本','grammar','Sắp xếp 两本书 với 本 làm lượng từ giữa số lượng và sách.'],
  ['professional-3:v2:block:answer','v:知道','reading','Chọn 我不知道 khi thật sự chưa biết vị trí sách, không tự đoán nơi đặt sách.'],
  ['professional-3:v2:block:produce','t','writing','Viết câu về sách, đọc/viết và câu trả lời trung thực khi thiếu thông tin.'],
 ],
 'professional-4':[
  ['professional-4:v2:block:pair-check','v:下课','vocabulary','Chọn 下课 là kết thúc tiết học, phân biệt với tan làm và bắt đầu tiết học.'],
  ['professional-4:v2:block:time-choice','v:下班','reading','Chọn giờ tan làm trong lịch vai B để trả lời 你几点下班, không lấy giờ tan học.'],
  ['professional-4:v2:block:order','v:上课','grammar','Sắp xếp 我晚上七点上课 theo mẫu chủ ngữ + thời gian + hoạt động của câu.'],
  ['professional-4:v2:block:produce','t','writing','Viết lịch vai C, không dùng lại giờ của vai B; tự kiểm mốc tan làm và vào học.'],
 ],
};
if(items.length!==6||Object.keys(decisions).length!==6)throw Error('Journey/professional inventory changed');
const targets={};
for(const item of items){
 const rows=decisions[item.lessonId];
 if(!rows)throw Error(`No editorial decisions: ${item.lessonId}`);
 const available=lessonActivitySources(item.lessonId);
 const task=available.find(source=>source.kind==='task');
 if(!task)throw Error(`Missing task: ${item.lessonId}`);
 const resolve=token=>{
  if(token==='t')return {kind:'task',id:task.id};
  const [prefix,label]=token.split(':',2),kind=prefix==='v'?'vocabulary':'grammar';
  const source=available.find(s=>s.kind===kind&&(kind==='vocabulary'?s.label.startsWith(`${label} ·`):s.id===token.slice(2)));
  if(!source)throw Error(`Missing source ${token}: ${item.lessonId}`);
  return {kind:source.kind,id:source.id};
 };
 const map={};
 for(const [blockId,sourceTokens,skill,objective] of rows){
  const block=item.lessonPages.pages.flatMap(page=>page.blocks).find(b=>b.id===blockId);
  if(!block?.activity||block.activity.learningTarget)throw Error(`Unexpected target state: ${blockId}`);
  if(skill==='writing'&&block.activity.type!=='rubric')throw Error(`Writing target needs rubric: ${blockId}`);
  if(skill!=='writing'&&block.activity.type==='rubric')throw Error(`Unexpected rubric: ${blockId}`);
  map[blockId]={skill,objective:`${objective} ${skill==='writing'?'Bản chữ có thể dùng từ/Pinyin hỗ trợ và chỉ tự đối chiếu, chưa chấm viết hay nói độc lập.':'Có ngữ cảnh và hỗ trợ trong bài, chưa là recall độc lập.'}`,sources:sourceTokens.split('|').map(resolve)};
 }
 applyMissingEditorialActivityTargets(item.lessonId,item.lessonPages,map);
 targets[item.lessonId]=map;
}
const plan={version:1,humanReviewed:false,partial:true,lessonIds:items.map(item=>item.lessonId),targets};
const output='content/drafts/thien-lo-journey-professional-targets.json';
const serialized=JSON.stringify(plan,null,2)+'\n';
if(process.argv.includes('--check')){if(readFileSync(output,'utf8')!==serialized)throw Error('Journey/professional plan drift');}
else writeFileSync(output,serialized);
console.log({mode:process.argv.includes('--check')?'check':'write',lessons:items.length,targets:Object.values(targets).reduce((n,map)=>n+Object.keys(map).length,0)});
