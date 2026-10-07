import {HSK1_LEVEL_CHECK_ITEMS} from '../../src/data/hsk1LevelCheck.ts';
import {HSK2_LEVEL_CHECK_ITEMS} from '../../src/data/hsk2LevelCheck.ts';
const meaningFixes=[
 ['Bộ quần áo này bao nhiêu tiền?','Chiếc áo này bao nhiêu tiền?'],
 ['Bạn muốn mấy bộ?','Bạn muốn mấy chiếc?'],
 ['Bạn muốn mua bộ quần áo nào? Tôi muốn xem bộ màu đỏ.','Bạn muốn mua chiếc áo nào? Tôi muốn xem chiếc màu đỏ.'],
 ['Bạn muốn màu sắc như thế nào? Tôi lấy bộ màu đỏ, không lấy bộ dài đến thế.','Bạn muốn quần áo như thế nào? Tôi muốn chiếc màu đỏ, không muốn chiếc dài đến thế.'],
 ['Xin hãy giúp tôi mở cửa. Được. Tại sao bạn không tự mở?','Xin hãy giúp tôi mở cửa. Được, tôi sẽ giúp bạn.'],
 ['Hãy giúp tôi giặt bộ quần áo này. Vì tay tôi hơi đau. Cảm ơn bạn đã giúp.','Hãy giúp tôi giặt chiếc áo này. Vì tay tôi hơi đau. Cảm ơn bạn đã giúp.'],
 ['Thưa thầy/cô, xin chào, xin hỏi thầy/cô họ gì? Em có thể gọi thầy/cô là thầy/cô Lý không? Rất vui được làm quen với thầy/cô.','Thầy/cô họ Lý, đúng không ạ? Em có thể gọi thầy/cô là thầy/cô Lý không? Rất vui được làm quen với thầy/cô.'],
 ['Người bên cạnh cô gái là chồng cô ấy.','Người bên cạnh người phụ nữ là chồng cô ấy.'],
 ['Chiếc quần này dài hơn một chút.','Chiếc quần này dài hơn chiếc kia một chút.'],
];
const grammar1=[
 '小 đứng trước họ 王 là cách gọi thân mật. Câu dùng 是 để nói Tiểu Vương là bạn học của tôi; không phải câu luyện số thứ tự.',
 '多少 hỏi số lượng; 个 là lượng từ cho những vật đã biết trong ngữ cảnh.',
 '很热 là vị ngữ tính từ: trời nóng. 很 thường nối chủ ngữ với tính từ; muốn nhấn mạnh “rất nóng” cần giọng hoặc ngữ cảnh phù hợp.',
 '对 dẫn người được nói tới trực tiếp: giáo viên nói với học sinh.',
 '我的 đặt trước 汉语书 để chỉ sách tiếng Trung thuộc về tôi.',
 '今天星期二 là câu vị ngữ danh từ chỉ ngày trong tuần; câu này không cần 是.',
 '天气很热 dùng tính từ làm vị ngữ. 很 có thể là yếu tố nối trung tính, không luôn nhấn mạnh mức độ “rất”.',
 '有 diễn đạt sở hữu; 两本书 là hai quyển sách, dùng 两 trước lượng từ 本.',
 '还有 bổ sung một người thân nữa vào thông tin trước: có anh trai, còn có em gái.',
 '第加数词 diễn đạt thứ tự; 第二个学生 là học sinh thứ hai trong một thứ tự đã xác định.',
];
const grammar2=[
 '学校对面 nêu nơi chốn trước 有; 一家书店 là đối tượng tồn tại ở nơi đó.',
 '为什么 hỏi lý do học tiếng Trung, không hỏi nơi học hoặc thời gian.',
 '教室里 là bên trong phòng học; 有 giới thiệu ba giáo viên ở đó, 位 là lượng từ lịch sự.',
 '正…呢 diễn đạt việc đang diễn ra ngay lúc nói.',
 '从八点…到五点 nêu mốc bắt đầu và kết thúc làm việc.',
 '跟老师 dẫn người được thông báo; 说了这件事 là đã nói việc ấy.',
 '过 sau động từ đánh dấu trải nghiệm đã từng tới Thượng Hải, không khẳng định đang ở đó.',
 '去商店买东西 là chuỗi động từ: đi đến cửa hàng để mua đồ.',
 '都十点了 nhấn mạnh đã muộn; 还不睡 nói vẫn chưa ngủ.',
 '来 hướng chuyển động về phía người nói hoặc điểm quy chiếu; 走来了 là đã đi tới đây.',
 '比那条 nêu chiếc quần dùng làm mốc; 长一点儿 là dài hơn một chút.',
 '一米五高 diễn đạt chiều cao một mét năm mươi; 有 ở đây giới thiệu độ dài đo được.',
 '跑得比我快 so sánh tốc độ chạy với tôi; 得 dẫn bổ ngữ miêu tả cách chạy.',
 '虽然…但是… diễn đạt nhượng bộ: trời mưa nhưng vẫn đi. 了 cho biết việc đi đã xảy ra.',
 '吃过…吗 hỏi trải nghiệm đã từng ăn sủi cảo hay chưa, không hỏi đang ăn gì.',
];
const hsk1Lessons={
 'hsk1-pe-03-name-identity-age':'survival-3','hsk1-pe-01-polite-open-close':'survival-1',
 'hsk1-pe-05-friends-and-pets':'survival-5','hsk1-pe-07-ability-intention-negation':'survival-7',
 'hsk1-pe-06-description-and-feeling':'survival-6','hsk1-pe-04-family':'survival-4',
 'hsk1-daily-life:01-quantity-and-money':'daily-1','hsk1-daily-life:02-food-and-drink':'daily-2',
 'hsk1-daily-life:03-shopping-and-clothing':'daily-3','hsk1-daily-life:04-health-and-home':'daily-4',
 'hsk1-travel-leisure:01-transport':'journey-1','hsk1-travel-leisure:02-media-and-leisure':'journey-2',
 'hsk1-study-work:01-school-levels':'professional-1','hsk1-study-work:03-study-and-materials':'professional-3',
 'hsk1-study-work:04-work-and-schedule':'professional-4',
};
function fixMeaning(text){for(const [a,b] of meaningFixes)text=text.replaceAll(a,b);return text;}
export function loadAssessment93(){
 return [[1,HSK1_LEVEL_CHECK_ITEMS],[2,HSK2_LEVEL_CHECK_ITEMS]].flatMap(([level,items])=>items.map(source=>{
  const x=structuredClone(source),n=Number(x.id.slice(-2));x.level='hsk'+level;
  if(level===1)x.sourceLessonId=hsk1Lessons[x.sourceLessonId]??x.sourceLessonId.replace('hsk1-time-place-events:','hsk1-time-place-events-');
  x.options=x.options.map(o=>({...o,text:fixMeaning(o.text)}));x.explanationVi=fixMeaning(x.explanationVi);
  if(level===1&&x.skill==='grammar'){
   x.explanationVi=grammar1[n-1];
   if([3,7].includes(n)){x.options.find(o=>o.optionId===x.correctOptionId).text=(n===3?'Hôm nay trời nóng.':'Trời nóng.');}
  }
  if(level===2){
   if(x.skill==='listening'&&n===1){x.stimulusText='A：你个子很高，你小时候也这么高吗？ B：不，我小时候个子不高。';x.explanationVi='不 phủ định nhận xét trong câu hỏi; người nói cho biết hồi nhỏ mình không cao.';}
   if(x.skill==='listening'&&n===3){x.stimulusText='A：你要什么样的衣服？ B：我要红色的，不要那么长的。';x.explanationVi='什么样的衣服 hỏi kiểu quần áo; 红色的 chọn màu đỏ, 不要那么长的 loại chiếc quá dài theo mốc đang nhìn.';}
   if(x.skill==='listening'&&n===5){x.stimulusText='A：请帮我打开门。 B：好，我来帮你。';x.explanationVi='请帮我… là lời nhờ giúp; 我来帮你 là nhận lời sẽ giúp mở cửa.';}
   if(x.skill==='reading'&&n===8){x.stimulusText='您姓李，对吗？我可以叫您李老师吗？很高兴认识您。';x.explanationVi='Người nói xác nhận họ Lý rồi xin phép cách xưng hô; không tự biết họ Lý sau một câu hỏi chưa được trả lời.';}
   if(x.skill==='reading'&&n===10){x.stimulusText='今天是阴天。一个人还在游泳。但是天气有点儿冷。';x.explanationVi='还在游泳 là vẫn đang bơi dù trời hơi lạnh; 还有一个人 sẽ có thể được hiểu là còn thêm một người.';}
   if(x.skill==='grammar'){x.explanationVi=grammar2[n-1];if(n===11)x.stimulusText='这条裤子比那条长一点儿。';}
  }
  if(x.skill==='listening')x.syntheticTtsText=x.stimulusText;
  return x;
 }));
}
