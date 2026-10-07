/** Exact HSK1 everyday/time-place editorial links. */
import {readFileSync,writeFileSync} from 'node:fs';
import {lessonActivitySources} from '../../src/learning/lessonActivitySources.ts';
import {applyMissingEditorialActivityTargets} from '../../src/content/editorialActivityTargets.ts';

const items=JSON.parse(readFileSync('content/drafts/thien-lo-everyday-batch-v2.json','utf8')).items;
const editorial={
 'daily-1':{choice:['grammar','hsk1-grammar-row-063','grammar','Tính đúng giá hai quả táo từ giá một quả trong hội thoại, phân biệt số lượng và số tiền.'],guided:['vocabulary','个','vocabulary','Điền lượng từ 个 để đếm táo sau 两, không đặt đơn vị tiền ở vị trí lượng từ.'],produce:'Tạo lượt hỏi giá và mua số lượng mới; tự kiểm phép tính, lượng từ và đơn vị tiền.'},
 'daily-2':{choice:['task',null,'reading','Chọn đơn một cốc nước theo yêu cầu không uống trà; không suy thêm thông tin thành phần không có trong thực đơn.'],guided:['vocabulary','喝','vocabulary','Điền 喝 cho hành động uống sữa, phân biệt với 吃 dùng cho thức ăn.'],produce:'Tạo đơn gọi món và lượt xác nhận phù hợp yêu cầu đồ uống/thức ăn của khách.'},
 'daily-3':{choice:['vocabulary','找','reading','Chọn câu trả mười tệ tiền thừa khi áo 20 tệ và khách đưa 30 tệ.'],guided:['vocabulary','买','vocabulary','Điền 买 từ vai khách mua áo, phân biệt với 卖 từ vai người bán.'],produce:'Viết lượt mua bán mới, giữ đúng vai mua/bán, giá và số tiền thừa.'},
 'daily-4':{choice:['vocabulary','看病','reading','Chọn câu đi bệnh viện khám bệnh, phân biệt nơi khám với nghề bác sĩ.'],guided:['vocabulary','医院','vocabulary','Điền 医院 là nơi đến để khám bệnh, không thay bằng 医生 là người.'],produce:'Viết lời báo ốm và hỏi thăm trong cảnh giả định, không tự chẩn đoán bệnh.'},
 'hsk1-time-place-events-01-numbers':{choice:['vocabulary','两','grammar','Chọn 两本书 cho hai quyển sách, dùng 两 trước lượng từ và không nhầm với số hai mươi.'],guided:['vocabulary','二','vocabulary','Điền 二 để viết 二十, phân biệt với 两 trước lượng từ.'],produce:'Viết số lượng và mã số trong hai ngữ cảnh mới, tự kiểm khi nào đọc từng chữ số.'},
 'hsk1-time-place-events-02-calendar':{choice:['task',null,'reading','Đọc lịch giả định để chọn ngày hẹn 9 tháng 5, không đảo ngày/tháng hay thay bằng ngày thật.'],guided:['vocabulary','月','vocabulary','Điền 月 vào 五月八号 để tách tháng năm và ngày tám.'],produce:'Viết lời xác nhận ngày hẹn từ lịch giả định, giữ đúng thứ tự năm/tháng/ngày.'},
 'hsk1-time-place-events-03-week-and-day-parts':{choice:['vocabulary','下午','reading','Chọn 星期一下午 để nói chiều thứ hai, phân biệt ngày trong tuần và buổi trong ngày.'],guided:['vocabulary','星期日','vocabulary','Hoàn thành 星期日 là Chủ nhật, tương đương 星期天 trong ngữ cảnh này.'],produce:'Viết thời điểm hẹn mới gồm ngày trong tuần và buổi, tự kiểm không nhầm thứ hai/chủ nhật.'},
 'hsk1-time-place-events-04-clock-and-duration':{choice:['vocabulary','小时','grammar','Tính khoảng 8:00–9:00 là 一个小时, phân biệt giờ đồng hồ với thời lượng.'],guided:['vocabulary','小时','vocabulary','Điền 小时 cho thời lượng một giờ sau 一个, không dùng 点 là giờ trên đồng hồ.'],produce:'Viết lịch bắt đầu/kết thúc mới và thời lượng tương ứng, kiểm đơn vị giờ/phút.'},
 'hsk1-time-place-events-05-location':{choice:['grammar','hsk1-grammar-row-003','reading','Chọn câu mèo ở dưới bàn theo cảnh giả định, giữ đúng đối tượng và mốc trên/dưới.'],guided:['grammar','hsk1-grammar-row-021','grammar','Điền 在 để định vị sách trên bàn; 在 không có exact vocabulary source trong bài nên nối mẫu nơi chốn đã học.'],produce:'Viết câu xác định vị trí đồ vật mới, phân biệt câu có vật ở đâu với câu ở đâu có vật.'},
 'hsk1-time-place-events-06-weather-and-residence':{choice:['vocabulary','住','reading','Chọn 我住在北京 để nói nơi cư trú, không nhầm với vị trí hiện thời hay thời tiết.'],guided:['vocabulary','热','vocabulary','Điền 热 cho cảnh thời tiết nóng giả định, không coi đó là thời tiết thật.'],produce:'Viết câu về nơi sống và thời tiết trong cảnh giả định, tách cư trú, vị trí hiện tại và trạng thái thời tiết.'},
};
if(items.length!==10||Object.keys(editorial).length!==10)throw Error('Everyday inventory changed');
const targets={};
for(const item of items){
 const spec=editorial[item.lessonId];
 if(!spec)throw Error(`Missing editorial decision: ${item.lessonId}`);
 const available=lessonActivitySources(item.lessonId);
 const task=available.find(source=>source.kind==='task');
 if(!task)throw Error(`Missing task: ${item.lessonId}`);
 const sourceFor=([kind,label])=>kind==='task'?task:available.find(source=>source.kind===kind&&(kind==='vocabulary'?source.label.startsWith(`${label} ·`):source.id===label));
 const map={};
 for(const suffix of ['choice','guided','produce']){
  const block=item.lessonPages.pages.flatMap(page=>page.blocks).find(block=>block.id===`${item.lessonId}:v2:block:${suffix}`);
  if(!block?.activity||block.activity.learningTarget)throw Error(`Unexpected target state: ${item.lessonId}:${suffix}`);
  if(suffix==='produce'){
   if(block.activity.type!=='rubric'||!block.activity.rubric.length)throw Error(`Missing rubric: ${block.id}`);
   map[block.id]={skill:'writing',objective:`${spec.produce} Đây là bản chữ có thể dùng Pinyin/từ hỗ trợ và chỉ tự đối chiếu, chưa chấm viết hay nói độc lập.`,sources:[{kind:'task',id:task.id}]};
  }else{
   if(block.activity.type!==(suffix==='choice'?'choice':'cloze'))throw Error(`Wrong activity type: ${block.id}`);
   const [,,skill,objective]=spec[suffix],source=sourceFor(spec[suffix]);
   if(!source)throw Error(`Missing source: ${block.id}`);
   map[block.id]={skill,objective:`${objective} Câu có ngữ cảnh và hỗ trợ trong bài, chưa phải recall độc lập.`,sources:[{kind:source.kind,id:source.id}]};
  }
 }
 applyMissingEditorialActivityTargets(item.lessonId,item.lessonPages,map);
 targets[item.lessonId]=map;
}
const plan={version:1,humanReviewed:false,partial:true,lessonIds:items.map(item=>item.lessonId),targets};
const output='content/drafts/thien-lo-everyday-activity-targets.json';
const serialized=JSON.stringify(plan,null,2)+'\n';
if(process.argv.includes('--check')){if(readFileSync(output,'utf8')!==serialized)throw Error('Everyday target plan drift');}
else writeFileSync(output,serialized);
console.log({mode:process.argv.includes('--check')?'check':'write',lessons:items.length,targets:Object.values(targets).reduce((n,map)=>n+Object.keys(map).length,0)});
