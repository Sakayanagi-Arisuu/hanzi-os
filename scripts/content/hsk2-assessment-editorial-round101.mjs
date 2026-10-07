import {readFileSync} from 'node:fs';
const grammar=[
 '看看 lặp động từ để nói xem thử một chút; 先 là làm việc này trước.',
 '每个人…都… bao quát mọi người; 自己的名字 là tên của chính mỗi người.',
 '过 đánh dấu trải nghiệm đã từng đến; 两次 là hai lần, không phải hai ngày.',
 '别… là lời ngăn cấm hoặc nhắc đừng làm; 在这里 là địa điểm không được đỗ xe.',
 '从门口 nêu lối đi vào; 进来 là đi vào về phía điểm quy chiếu trong phòng.',
 '跟 nối 苹果 và 别的水果: táo cùng các loại trái cây khác.',
 '在找 diễn đạt đang tìm; 呢 ở câu hỏi nhắc tới việc đang diễn ra.',
 '什么的 đứng sau danh sách để nói những thứ tương tự, không phải câu hỏi “cái gì”.',
 '今天星期一 là câu vị ngữ danh từ chỉ ngày trong tuần; không bắt buộc dùng 是.',
 '从房间里 nêu điểm xuất phát; 跑出来 là chạy từ trong phòng ra phía điểm quy chiếu.',
 '还是 nối hai lựa chọn trong câu hỏi: uống trà hay cà phê.',
 '今天比昨天热 lấy hôm qua làm mốc so sánh; hôm nay nóng hơn hôm qua.',
 '让 dẫn người được yêu cầu làm việc: giáo viên bảo chúng tôi viết chữ Hán.',
 '一…就… nối hai việc xảy ra sát nhau: vừa tan học là về nhà.',
 '十几个 là từ mười một đến mười chín, một số lượng xấp xỉ trong khoảng đó; không phải mọi số lớn hơn mười.',
];
const meaningFixes=[
 ['Bạn muốn mua bộ quần áo nào? Tôi muốn xem bộ màu đỏ.','Bạn muốn mua chiếc áo nào? Tôi muốn xem chiếc màu đỏ.'],
 ['Bạn muốn màu sắc như thế nào? Tôi lấy bộ màu đỏ, không lấy bộ dài đến thế.','Bạn muốn quần áo như thế nào? Tôi muốn chiếc màu đỏ, không muốn chiếc dài đến thế.'],
 ['Xin hãy giúp tôi mở cửa. Được. Tại sao bạn không tự mở?','Xin hãy giúp tôi mở cửa. Được, tôi sẽ giúp bạn.'],
 ['Hãy giúp tôi giặt bộ quần áo này.','Hãy giúp tôi giặt chiếc áo này.'],
 ['Thưa thầy/cô, xin chào, xin hỏi thầy/cô họ gì? Em có thể gọi thầy/cô là thầy/cô Lý không? Rất vui được làm quen với thầy/cô.','Thầy/cô họ Lý, đúng không ạ? Em có thể gọi thầy/cô là thầy/cô Lý không? Rất vui được làm quen với thầy/cô.'],
 ['Người bên cạnh cô gái là chồng cô ấy.','Người bên cạnh người phụ nữ là chồng cô ấy.'],
 ['Chiếc quần này dài hơn một chút.','Chiếc quần này dài hơn chiếc kia một chút.'],
 ['đá bóng hoặc nhảy.','đá bóng hoặc khiêu vũ.'],
 ['cùng đi nhảy nhé.','cùng đi khiêu vũ nhé.'],
 ['Mắt anh ấy không được dễ chịu.','Mắt anh ấy hơi khó chịu.'],
 ['cửa ra vào','khu vực cửa; lối vào'],
 ['Sức khỏe của tôi cũng không được tốt.','Sức khỏe của tôi cũng không tốt lắm.'],
];
const fix=text=>{for(const [a,b] of meaningFixes)text=text.replaceAll(a,b);return text;};
export function loadAssessment101(){
 return JSON.parse(readFileSync('content/runtime/hsk-mock-exam-alternate-local.json','utf8')).levels.hsk2.items.map(source=>{
  const x=structuredClone(source),n=Number(x.id.slice(-2));x.options=x.options.map(o=>({...o,text:fix(o.text)}));x.explanationVi=fix(x.explanationVi);
  if(x.skill==='grammar')x.explanationVi=grammar[n-1];
  if(x.skill==='grammar'&&n===15)x.options.find(o=>o.optionId===x.correctOptionId).text='Trong lớp có mười mấy học sinh (khoảng 11–19).';
  if(x.skill==='listening'&&n===1){x.stimulusText='A：你常跟谁一起踢足球？ B：我常跟同学一起踢。';x.options.find(o=>o.optionId===x.correctOptionId).text='Bạn thường đá bóng cùng ai? Tôi thường đá cùng bạn học.';x.explanationVi='跟谁 hỏi người cùng đá bóng; câu trả lời nêu同学, bạn học.';}
  if(x.skill==='listening'&&n===6){x.stimulusText='A：你要买这条裤子吗？ B：先看看价钱。这条要花多少钱？';x.explanationVi='这条裤子 nêu rõ chiếc quần đang xem; người mua muốn kiểm tra giá trước khi quyết định.';}
  if(x.skill==='reading'&&n===15){x.stimulusText=x.stimulusText.replace('三个手表','三块手表');x.explanationVi='Nguồn có ba đồng hồ đeo tay; chiếc đen rẻ hơn chiếc đỏ, người mua muốn chiếc rẻ nhất. Không đủ dữ kiện để xác định chiếc nào rẻ nhất trong cả ba.';}
  if(x.skill==='vocabulary'&&n===8)x.explanationVi='门口 là khu vực cửa hoặc lối vào; 门 là bản thân cánh cửa.';
  if(x.skill==='vocabulary'&&n===10)x.explanationVi='上去 là đi lên theo hướng xa điểm quy chiếu; 上来 là đi lên về phía điểm quy chiếu.';
  if(x.skill==='listening')x.syntheticTtsText=x.stimulusText;
  return x;
 });
}
