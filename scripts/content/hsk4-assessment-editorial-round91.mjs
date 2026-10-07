/** Correct future assessment publications; immutable built-in banks stay available for resume. */
import {readFileSync} from 'node:fs';
const grammarNotes=[
 ['Nhượng bộ giả định: dù cư dân đã nghe máy, vẫn phải xác nhận hỗ trợ hoàn tất.','即使…也… nghĩa là dù…vẫn…; nghe máy không bảo đảm đã được giúp.'],
 ['Tăng tiến: ngay cả người chưa trả lời cũng cần xác nhận, huống chi trường hợp nguy cơ cao.','连…也… nhấn mạnh ngay cả; 更 tăng thêm mức độ ở vế sau.'],
 ['Diễn đạt bắt buộc phải kiểm tra lại để tránh bỏ sót.','不能不 là phủ định kép: không thể không, tức buộc phải kiểm tra lại.'],
 ['So sánh hai cách đánh giá: chỉ đếm buổi gặp không bằng kiểm tra giải quyết vấn đề thật.','A不如B nghĩa là A không bằng B trong tiêu chí đang so sánh.'],
 ['Bổ sung nhiệm vụ thứ hai vào nhiệm vụ ghi tỷ lệ hoàn thành.','并且 nối hai việc cùng được thực hiện: ghi tỷ lệ và phân loại lỗi/gián đoạn.'],
 ['Thừa nhận tỷ lệ điểm danh thực sự cao rồi giới hạn điều có thể kết luận.','确实 xác nhận sự thật; 但 nêu rằng điểm danh cao vẫn không chứng minh hiểu bài. 偶尔 chỉ tần suất thỉnh thoảng.'],
 ['Nêu căn cứ dùng để sửa chuẩn độ ẩm.','按照 nghĩa là dựa theo; nhóm dùng trạng thái lá và kiểm tra thủ công làm căn cứ.'],
 ['Nêu nguyên nhân đã xảy ra và kết quả của việc trộn hai mốc thời gian.','由于…因此… nối nguyên nhân với kết quả; không phải giả định nhượng bộ hoặc hai việc đồng thời.'],
 ['Nêu mục đích đánh dấu thời gian tải dữ liệu.','好 ở đây nghĩa là để/để có thể, nối việc đánh dấu với mục đích phân biệt dữ liệu cũ và mới.'],
 ['Đặt lợi ích và rủi ro của hoàn tiền điện tử ở hai mặt để cân nhắc.','一方面…另一方面… trình bày hai mặt: giảm chờ tiền mặt và khả năng trễ do mạng.'],
 ['Diễn đạt sự đối lập: thao tác nhanh hơn nhưng vẫn còn hoàn tiền trễ.','不过 nghĩa là tuy nhiên; nó đánh dấu giới hạn của kết quả tích cực trước đó. 此外 chỉ bổ sung.'],
 ['Diễn đạt lo ngại có khả năng xảy ra nếu chỉ nhìn tỷ lệ trả cốc.','恐怕 diễn đạt e rằng/có lẽ sẽ: có nguy cơ bỏ qua chi phí vận chuyển và rửa.'],
 ['So sánh nhiều lộ trình với việc chỉ tham quan theo niên đại.','跟…相比 nghĩa là so với; hai phương án được đối chiếu về mức lựa chọn.'],
 ['Nêu hai yêu cầu cùng cần đáp ứng trong thiết kế phụ đề.','既…又… nối hai yêu cầu đồng thời: dễ đọc và nhìn được nét mặt diễn viên.'],
 ['Bác bỏ cách giải thích thứ nhất rồi thay bằng cách giải thích thứ hai.','不是…而是… là không phải…mà là…; phủ định một cách giải thích, không dùng 不是一定 thay cho 不一定.'],
 ['Giới hạn vấn đề đang bàn ở khía cạnh cấp quyền.','在…方面 nghĩa là về mặt/trong khía cạnh; lưu và công khai là hai việc cần tách.'],
 ['Nêu việc ghi niên đại và thêm một việc nữa là liệt kê nguồn.','不仅…还… nghĩa là không chỉ…mà còn…; hai nội dung cùng có trên bảng.'],
 ['Diễn đạt liệt kê thử một lượt trước khi mời người kể lựa chọn.','列一列 là động từ lặp dạng V一V, chỉ việc làm một lượt nhẹ/ngắn. 列过吗 là câu hỏi trải nghiệm, không nối được vào câu này.'],
];
const vocabNotes=[
 '联系网 là mạng liên lạc; 联系 nêu kết nối giữa cư dân, tình nguyện viên và phòng khám.',
 '医生判断 là phán đoán của bác sĩ; bảng liên lạc không thay thế việc đánh giá chuyên môn.',
 '优先顺序 là thứ tự ưu tiên; 顺序 chỉ thứ tự, không phải kết quả hay mối liên hệ.',
 '关键的安全问题 là vấn đề an toàn then chốt; 关键 bổ nghĩa cho mức quan trọng của vấn đề.',
 '交流 chỉ buổi trao đổi hai chiều; sau đó nhân viên ghi tình huống và bước tiếp theo.',
 '提供支持 là cung cấp hỗ trợ; 支持 là thứ người cố vấn đã cung cấp.',
 '低于标准 là thấp hơn ngưỡng/chuẩn đã đặt; 标准 là mốc để so sánh số đo.',
 '技术人员 là nhân viên kỹ thuật; 技术 xác định chuyên môn của người giải thích lỗi thời gian.',
 '发出提醒 là đưa ra lời nhắc/cảnh báo; nhắc xuất hiện khi dữ liệu bị gián đoạn.',
 '顾客 là khách mua hàng; họ trả thêm tiền đặt cọc khi mua đồ uống.',
 '运输距离 là quãng đường vận chuyển; nó là một chỉ số được đưa vào đánh giá chi phí.',
 '摊位的责任 là trách nhiệm của quầy; khách có thể quy việc chậm hoàn tiền cho quầy.',
 '观众 là người xem triển lãm; họ là chủ thể của hành động hiểu nội dung.',
 '自己的解释 là cách giải thích của chính người xem; không phải một tác phẩm hay người xem.',
 '推荐作品 là tác phẩm được đề xuất; 作品 chỉ những tác phẩm trong triển lãm.',
 '历史保护 là bảo tồn lịch sử; thay đổi quyền công khai không đồng nghĩa phản đối bảo tồn.',
 '材料准确 là tư liệu chính xác; 材料 là đối tượng cần kiểm tra.',
 '准确 là chính xác; nó mô tả chất lượng tư liệu, không phải số lượt truy cập.',
];
const scopeA=[
 'Nguồn ghi kết quả sau ba đêm và thêm trung bình bảy phút xác nhận; chưa có số liệu về số nhiệm vụ khẩn bị trễ.',
 'Nguồn nói kho thử giờ học vào tháng thứ hai; lượng đơn khác nhau giữa các nhóm làm giới hạn việc so sánh.',
 'Nguồn nói gián đoạn mạng sáu giờ trong tháng năm; chưa so sánh số lỗi đọc dữ liệu trước và sau sửa giao diện.',
 'Nguồn nói thử hoàn tiền điện tử trong một ngày; hoàn tất chín khoản trễ không chứng minh khách đã tin tưởng hoặc quay lại mua.',
 'Nguồn nói phụ đề ở một nhà hát và ba lần trễ hai giây; chưa chứng minh mọi chỗ ngồi hoặc lời ứng tác đều đồng bộ.',
 'Mốc 1864 là lần sửa cầu đầu tiên tìm thấy trong hồ sơ, không tự thành năm xây cầu; mốc 1860 trên bảng cũ chưa được chứng minh.',
];
const scopeB=[
 'Nguồn ghi hai tuần bổ sung đặt qua điện thoại và ghi tại cửa, tốn thêm khoảng hai mươi phút mỗi ngày; chưa chứng minh bỏ giấy sẽ công bằng hơn.',
 'Nguồn chỉ có bốn cuộc họp thử; chưa biết quy trình có phù hợp dự án khẩn cấp hay không.',
 'Nguồn ghi chín cảnh báo ở tuần đầu mùa mưa; thử hai tháng còn là kế hoạch, chưa có kết quả về bỏ sót.',
 'Nguồn ghi một tháng dùng xe lạnh; rau hỏng giảm nhưng chỉ ba mươi phần trăm hộ nhỏ sử dụng liên tục.',
 'Nguồn nói tám ban nhạc trường học; hai buổi hòa tấu cuối phải có mặt, và video âm quá nhỏ chưa đủ để đánh giá tiết tấu.',
 'Ảnh do bộ phận tuyên truyền lựa chọn, thiếu ca đêm/bảo trì; không đại diện đầy đủ đời sống mọi công nhân.',
];
export function correctAssessment91(source){
 const x=structuredClone(source),n=Number(x.id.slice(-2)),group=Math.floor((n-1)/3),isA=x.id.includes(':form-a:');
 if(isA&&x.skill==='grammar'){
  [x.promptVi,x.explanationVi]=grammarNotes[n-1];
  if(n===10)x.options.find(o=>o.optionId==='A').text='尽管……但是……';
  if(n===15)x.stimulusText='这次参观路线的差异____理解失败，____时间和语言需要的不同。';
 }else if(isA&&x.skill==='vocabulary'){
  x.explanationVi=vocabNotes[n-1];
  if(n===5){x.stimulusText='每次面对面____后，新员工要写一个遇到的情况和下一步，导师则说明自己提供了什么支持。';x.options.find(o=>o.optionId==='A').text='制度';}
 }else{
  // Keep the item-specific explanation and replace only the copied final scope sentence.
  x.explanationVi=x.explanationVi.slice(0,x.explanationVi.indexOf('. ')+1);
  if(x.skill==='listening')x.explanationVi+=' '+(isA?scopeA:scopeB)[group];
  else if(isA&&group===4)x.explanationVi+=' Nguồn không nêu triển lãm kéo dài sáu tuần. Lượt quét mã và lựa chọn lộ trình chưa đủ chứng minh khách hiểu đầy đủ.';
  else if(!isA&&group===1)x.explanationVi+=' Hai môn học còn là kế hoạch so sánh; lượt đặt chỗ không đồng nghĩa hoàn thành luyện tập.';
  else if(!isA&&group===2)x.explanationVi+=' Nguồn ghi tháng đầu quan sát; camera gần đường và ảnh lặp giới hạn suy luận về số cá thể.';
  else if(!isA&&group===4)x.explanationVi+=' Nguồn ghi sáu trận của hai đội, chưa gặp vòng loại trực tiếp; không suy kết quả cho mọi trận áp lực cao.';
  else x.explanationVi=source.explanationVi;
 }
 if(x.stimulusText.includes('而是增加运输'))x.stimulusText=x.stimulusText.replace('而是增加运输','而是把运输').replace('不同摊位的成本。','不同摊位的成本纳入评价。');
 if(x.skill==='listening')x.syntheticTtsText=x.stimulusText;
 return x;
}
export function loadAssessment91(){
 const base=JSON.parse(readFileSync('content/runtime/hsk4-level-check-local.json','utf8')).items;
 const alternate=JSON.parse(readFileSync('content/runtime/hsk-mock-exam-alternate-local.json','utf8')).levels.hsk4.items.filter(x=>['listening','reading'].includes(x.skill));
 return [...base,...alternate].map(correctAssessment91);
}
