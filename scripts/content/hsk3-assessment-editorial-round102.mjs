import {readFileSync} from 'node:fs';
const grammar=[
 ['第一次见面时，____介绍自己比较合适？','Hỏi cách thức giới thiệu bản thân khi gặp lần đầu.', ['什么时候','在哪儿','跟谁','怎样'],'怎样 hỏi cách thức; ba lựa chọn khác hỏi thời gian, nơi và người đi cùng.'],
 ['服务员端来两____菜和三____米饭。','Món ăn được bày trên đĩa, cơm được đựng trong bát. Chọn hai lượng từ theo thứ tự.', ['碗；盘','盘；碗','张；双','辆；本'],'盘 đếm đĩa món ăn; 碗 đếm bát cơm. Ngữ cảnh xác định cách đựng.'],
 ['____能帮助大家少走错路。','Chọn cụm làm chủ ngữ có nghĩa “xem bản đồ trước khi xuất phát”.', ['出发后看地图','忘了带地图','出发前不看地图','出发前看地图'],'Cụm hành động出发前看地图 làm chủ ngữ: việc xem bản đồ trước khi xuất phát giúp ít đi sai đường hơn.'],
 ['休息以后，她的精神____好了。','Diễn đạt trạng thái tốt hơn so với trước khi nghỉ.', ['不','更','没','别'],'更 đánh dấu mức độ tăng so với trước; 精神更好了 là tinh thần/trạng thái tốt hơn.'],
 ['护士____介绍了检查的安排。','Nêu người nhận lời giới thiệu là bệnh nhân.', ['从病人','在病人','把病人','向病人'],'向病人 dẫn đối tượng nhận lời giới thiệu; không phải người làm thay hay nơi giới thiệu.'],
 ['____，每天复习十分钟比周末学很久更好。','Nêu quan điểm của chính người nói, không khẳng định đây là kết quả nghiên cứu.', ['根据研究结果','在我看来','对初学者来说','在老师看来'],'在我看来 là theo ý tôi; các cụm khác chuyển nguồn hoặc góc nhìn sang đối tượng khác.'],
 ['吃饭____先洗手，吃饭____再收拾桌子。','Rửa tay trước bữa ăn, dọn bàn sau bữa ăn.', ['以后；以前','以前；以前','以后；以后','以前；以后'],'以前 là trước, 以后 là sau; hai mốc được gắn với吃饭.'],
 ['为了完成作业，我们____。','Diễn đạt đã gặp nhau ba lần; giữ 见面 là động từ ly hợp.', ['见了三天面','见了三次面','见了三个面','见了三小时面'],'三次 đếm số lần; tân ngữ面 đứng sau lượng thời gian/số lần trong cấu trúc见了三次面.'],
 ['听到音乐，孩子们都跳____了。','Diễn đạt trẻ bắt đầu nhảy khi nghe nhạc.', ['下去','进来','回去','起来'],'起来 ở đây biểu thị bắt đầu hành động; không mô tả hướng nhảy vào hay quay lại.'],
 ['会议____取消了。','Đổi 客户取消了会议 sang bị động, giữ khách hàng là tác nhân.', ['把客户','被客户','从客户','在客户'],'被客户 đưa khách hàng vào vai tác nhân; 会议 là sự việc bị hủy.'],
 ['路上都是水，____刚下过雨。','Nêu suy đoán dựa trên dấu hiệu đường có nước, không nói đã kiểm chứng.', ['最好','终于','必须','看起来'],'看起来 đánh dấu nhận định dựa trên dấu hiệu quan sát được; không biến suy đoán thành sự thật đã xác nhận.'],
 ['找不到孩子，妈妈____。','Dùng bổ ngữ chỉ mức độ lo rất cao với 急.', ['急完了','急坏了','急好了','急掉了'],'坏了 sau tính từ急 nhấn mạnh mức độ lo lắng; không chỉ hoàn thành hành động hay làm hỏng vật.'],
 ['可以坐地铁____公共汽车去剧院。','Nêu hai phương tiện có thể chọn trong câu trần thuật.', ['所以','但是','还是','或者'],'或者 nêu các khả năng trong câu trần thuật; 还是 thường dùng để hỏi lựa chọn.'],
 ['这个汤____。','Nêu đồng thời hai đặc điểm: nóng và có vị ngon/ngọt đậm.', ['越热越鲜','又热又鲜','一边热一边鲜','只有热才鲜'],'又…又… gộp hai đặc điểm của cùng món canh; không nêu tương quan tăng mức độ hay điều kiện.'],
 ['____买了票，你____能进场。','Quy định: có vé là điều kiện cần để được vào sân.', ['只要；就','虽然；但是','因为；所以','只有；才'],'只有…才… diễn đạt điều kiện cần; 只要…就… nêu điều kiện đủ. Đây là quy định của tình huống này.'],
];
export function loadAssessment102(){
 const old=JSON.parse(readFileSync('content/drafts/thien-lo-hsk3-assessment-editorial-round94.json','utf8')),seen=new Set(old.entries.map(x=>x.content.editorialOrigin.sourceItemId));
 return JSON.parse(readFileSync('content/runtime/hsk-mock-exam-alternate-local.json','utf8')).levels.hsk3.items.filter(x=>!seen.has(x.id)).map(source=>{
  const x=structuredClone(source),n=Number(x.id.slice(-2));
  if(x.skill==='grammar'){const [hanzi,cue,options,explanation]=grammar[n-1];x.stimulusText=hanzi;x.promptVi=cue;x.options=x.options.map((o,i)=>({...o,text:options[i]}));x.explanationVi=explanation;}
  if(x.skill==='vocabulary'&&n===8){x.stimulusText='活动地点是学校的体育馆。';x.promptVi='Trong câu này, 地点 có nghĩa gì?';x.options.find(o=>o.optionId==='B').text='thời gian';x.explanationVi='地点 là địa điểm diễn ra hoạt động; 体育馆 nêu nơi cụ thể. Không dùng “nơi/chỗ/vùng” làm phương án sai vì nghĩa quá gần.';}
  if(x.skill==='vocabulary'&&n===9){x.stimulusText='我买了一双鞋。';x.promptVi='Trong câu này, 双 dùng để đếm gì?';x.options.find(o=>o.optionId===x.correctOptionId).text='một đôi, gồm hai chiếc';x.explanationVi='双 là lượng từ cho đôi: 一双鞋 gồm hai chiếc giày.';}
  if(x.skill==='vocabulary'&&n===11)x.options.find(o=>o.optionId==='B').text='nhưng; song';
  if(x.skill==='vocabulary'&&n===15)x.options.find(o=>o.optionId==='B').text='hào, đơn vị tiền';
  return x;
 });
}
