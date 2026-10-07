/** Exact editorial links for nine HSK1 survival lessons; no learner evidence. */
import {readFileSync,writeFileSync} from 'node:fs';
import {lessonActivitySources} from '../../src/learning/lessonActivitySources.ts';
import {applyMissingEditorialActivityTargets} from '../../src/content/editorialActivityTargets.ts';

const items=JSON.parse(readFileSync('content/drafts/thien-lo-survival-batch-v2.json','utf8')).items;
const editorial=[
 {choice:['vocabulary','对不起','vocabulary','Chọn lời xin lỗi 对不起 khi chính mình làm rơi đồ của người khác; không nhầm với lời đáp cảm ơn.'],guided:['vocabulary','不客气','vocabulary','Điền 不客气 làm lời đáp cho 谢谢你, phân biệt với lời đáp xin lỗi.'],produce:'Viết các lượt thoại mới, giữ đúng vai người cảm ơn, người xin lỗi và người đáp lời theo tình huống.'},
 {choice:['vocabulary','它们','vocabulary','Chọn 它们 cho hai con mèo không được nhân hóa, phân biệt nhóm nữ và nhóm có người nói.'],guided:['vocabulary','她们','vocabulary','Điền 她们 cho nhóm nữ được nhắc tới mà không có người nói.'],produce:'Viết lời giới thiệu nhóm người và vật theo đúng điểm nhìn, tự soát đại từ số nhiều.'},
 {choice:['vocabulary','怎么','grammar','Chọn câu hỏi 怎么写 để hỏi cách viết tên thay vì hỏi danh tính hay tình trạng.'],guided:['grammar','hsk1-grammar-row-008','grammar','Hoàn thành câu hỏi 你的名字怎么写 bằng động từ 写; 写 chưa có source từ vựng riêng trong bài nên nối mẫu nghi vấn đã học.'],produce:'Viết đoạn giới thiệu giả định và hỏi lại tên, tuổi hoặc cách viết tên theo đúng vai giao tiếp.'},
 {choice:['vocabulary','弟弟','vocabulary','Chọn 弟弟 cho em trai cùng cha mẹ và nhỏ tuổi hơn người nói.'],guided:['vocabulary','姐姐','vocabulary','Điền 姐姐 cho chị gái lớn tuổi hơn người nói trong gia đình giả định.'],produce:'Viết câu về quan hệ gia đình giả định, giữ đúng tuổi tương đối và điểm nhìn của từng vai.'},
 {choice:['vocabulary','朋友','vocabulary','Chọn 朋友 khi đề chỉ nói quan hệ bạn bè, không tự suy thành quan hệ yêu đương.'],guided:['vocabulary','只','vocabulary','Điền lượng từ 只 sau 两 để đếm hai con chó trong mẫu đã học.'],produce:'Viết câu giới thiệu bạn bè, vật nuôi và lượng từ; tự kiểm không đổi quan hệ do suy đoán.'},
 {choice:['vocabulary','好听','vocabulary','Chọn 好听 để đánh giá giai điệu nghe hay thay vì ngoại hình hay cảm xúc.'],guided:['vocabulary','好听','vocabulary','Điền 好听 trong 这首歌很好听 khi điều được đánh giá là âm thanh.'],produce:'Viết lời nhận xét phù hợp từng đối tượng nhìn/nghe và mức độ, không dùng một tính từ cho mọi giác quan.'},
 {choice:['vocabulary','没有','grammar','Chọn câu 我今天没有时间 để phủ định việc có thời gian hôm nay.'],guided:['vocabulary','没有','grammar','Điền 没有 để phủ định 有 trong câu nói không có thời gian, không dùng 不有.'],produce:'Viết câu về khả năng, dự định và điều kiện thời gian; phân biệt 会, 想 và 没有.'},
 {choice:['task',null,'reading','Chọn lời hẹn gọi lại vào tối phù hợp khi người nhận đang có việc; đối chiếu nội dung và thời điểm trong phương án.'],guided:['task',null,'grammar','Điền 再 cho một lần gọi sau trong tương lai, không nhầm với 在 đồng âm; từ này chưa có source từ vựng riêng trong bài.'],produce:'Viết lượt thoại hẹn gọi lại có thời điểm và ngữ khí phù hợp, tự kiểm vai hai bên.'},
 {choice:['task',null,'reading','Chọn 我还没起床 khi thông tin là vẫn chưa ra khỏi giường, phân biệt với đã dậy và thói quen.'],guided:['task',null,'grammar','Điền 还没 trước 起床 để nói việc chưa xảy ra; cụm này chưa có source từ vựng riêng trong bài.'],produce:'Viết câu về thói quen, trạng thái đã dậy và dự định đi ngủ, phân biệt mốc thời gian.'},
];
if(items.length!==editorial.length)throw Error('Survival inventory changed');
const targets={};
for(let i=0;i<items.length;i++){
 const item=items[i],spec=editorial[i];
 if(item.lessonId!==`survival-${i+1}`)throw Error(`Unexpected lesson order: ${item.lessonId}`);
 const available=lessonActivitySources(item.lessonId);
 const task=available.find(source=>source.kind==='task');
 if(!task)throw Error(`Missing task: ${item.lessonId}`);
 const sourceFor=([kind,label])=>kind==='task'?task:available.find(source=>source.kind===kind&&(kind==='vocabulary'?source.label.startsWith(`${label} ·`):source.id===label));
 const choiceSource=sourceFor(spec.choice),guidedSource=sourceFor(spec.guided);
 if(!choiceSource||!guidedSource)throw Error(`Missing editorial source: ${item.lessonId}`);
 const map={};
 for(const suffix of ['choice','guided','produce']){
  const block=item.lessonPages.pages.flatMap(page=>page.blocks).find(block=>block.id===`${item.lessonId}:v2:block:${suffix}`);
  if(!block?.activity||block.activity.learningTarget)throw Error(`Unexpected target state: ${item.lessonId}:${suffix}`);
  if(suffix==='produce'){
   if(block.activity.type!=='rubric'||!block.activity.rubric.length)throw Error(`Missing rubric: ${block.id}`);
   map[block.id]={skill:'writing',objective:`${spec.produce} Đây là bản chữ có thể dùng Pinyin/từ hỗ trợ và chỉ tự đối chiếu, chưa chấm viết hay nói độc lập.`,sources:[{kind:'task',id:task.id}]};
  }else{
   if(block.activity.type!==(suffix==='choice'?'choice':'cloze'))throw Error(`Wrong activity type: ${block.id}`);
   const [,,skill,objective]=spec[suffix],source=suffix==='choice'?choiceSource:guidedSource;
   map[block.id]={skill,objective:`${objective} Đây là câu có gợi ý/ngữ cảnh trong bài, không phải recall độc lập.`,sources:[{kind:source.kind,id:source.id}]};
  }
 }
 applyMissingEditorialActivityTargets(item.lessonId,item.lessonPages,map);
 targets[item.lessonId]=map;
}
const plan={version:1,humanReviewed:false,partial:true,lessonIds:items.map(item=>item.lessonId),targets};
const output='content/drafts/thien-lo-survival-activity-targets.json';
const serialized=JSON.stringify(plan,null,2)+'\n';
if(process.argv.includes('--check')){if(readFileSync(output,'utf8')!==serialized)throw Error('Survival target plan drift');}
else writeFileSync(output,serialized);
console.log({mode:process.argv.includes('--check')?'check':'write',lessons:items.length,targets:Object.values(targets).reduce((n,map)=>n+Object.keys(map).length,0)});
