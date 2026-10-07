import {readFileSync} from 'node:fs';
const vocab=[
 ['Chọn từ có nghĩa “cách thức/kênh thực hiện”.','方式 là cách thức; điện thoại, giấy và ứng dụng là ba cách phản ánh ý kiến.'],
 ['Hoàn thành từ chỉ người quản lý bếp dùng chung.','管理员 là người quản lý; 管理 kết hợp với hậu tố员.'],
 ['Chọn từ có nghĩa “tình hình” cần tiếp tục quan sát.','情况 là tình hình trong mùa thi và khi mở cửa sổ mùa hè; không phải kết quả đã có.'],
 ['Chọn từ chỉ cuộc khảo sát ẩn danh.','匿名调查 là khảo sát ẩn danh; kết quả khảo sát cung cấp thông tin về thiết kế cuộc họp.'],
 ['Nêu thống kê ở cấp khóa học, không phải ghi âm từng cá nhân.','课程层面 là ở cấp khóa học; 课程 chỉ phạm vi thống kê.'],
 ['Chọn từ chỉ năng lực của mỗi cá nhân.','个人能力 là năng lực cá nhân; 发言少 có thể do thiết kế cuộc họp, không chỉ do năng lực.'],
 ['Chọn từ chỉ nơi camera tập trung: gần đường đi.','道路 là đường đi; vị trí camera có thể gây thiên lệch lấy mẫu.'],
 ['Chọn từ mang nghĩa “kịp thời” trước 保护.','及时保护 là bảo vệ kịp thời; 及时 nêu thời điểm phù hợp để can thiệp.'],
 ['Chọn từ chỉ số lượng ảnh, không phải số động vật.','数量 là số lượng ảnh được hệ thống gắn nhãn; một con vật có thể xuất hiện trong nhiều ảnh.'],
 ['Chọn từ chỉ chi phí đi xe máy đến trạm.','费用 là chi phí phải trả; không phải thu nhập hay kết quả.'],
 ['Chọn từ chỉ hạn chế về giao thông và việc đi lại.','交通限制 là hạn chế về giao thông; không sử dụng chưa chắc có nghĩa không cần.'],
 ['Nêu khoản thu nhập mà mức phí tối thiểu chiếm một tỷ lệ lớn.','收入 là thu nhập; 占收入的比例 nói tỷ lệ của phí so với thu nhập, không phải tỷ lệ phí trong chính chi phí.'],
 ['Chọn từ chỉ người huấn luyện quyết định dùng cầu thủ nào.','教练 là huấn luyện viên; cầu thủ dự bị ít được thi đấu theo quyết định chọn người.'],
 ['Hoàn thành 足球队, nghĩa là đội bóng đá.','足加球队 tạo 足球队; 球队 tự nó có nghĩa là đội bóng.'],
 ['Chọn từ chỉ việc bị chấn thương nhẹ.','轻微受伤 là bị thương nhẹ; nguồn chỉ ghi tình hình trong sáu trận này.'],
 ['Chọn từ chỉ nhà máy trong các bức ảnh lịch sử.','工厂照片 là ảnh về nhà máy; không phải ảnh của mục đích hay kết quả.'],
 ['Chọn từ chỉ mục đích chụp ảnh được bổ sung vào chú thích.','拍摄目的 là mục đích chụp; biết mục đích giúp hiểu góc lựa chọn cảnh trong ảnh.'],
 ['Chọn từ chỉ ý kiến được trình bày bằng lời.','口述意见 là ý kiến được kể hoặc nói lại; cần phân biệt với thông tin hiện trực tiếp trong ảnh.'],
];
const grammar=[
 ['Diễn đạt nhượng bộ: khiếu nại trên ứng dụng giảm, nhưng hồ sơ điện thoại tăng.','尽管…但是… nối hai thực tế trái với kỳ vọng; không suy quan hệ nhân quả.'],
 ['Diễn đạt việc ghi bối cảnh áp dụng với mọi kênh phản ánh.','无论…都… bao quát mọi lựa chọn; 用电话、纸条还是应用 liệt kê các kênh.'],
 ['Nêu khả năng có thể bỏ sót, không khẳng định chắc chắn.','说不定 diễn đạt khả năng chưa chắc chắn; chỉ nhìn đặt trực tuyến có thể bỏ sót người không quét mã.'],
 ['Nêu việc tách riêng hai chỉ số đã hoàn thành, với 已经 và 把.','把登录和完成分开记录了 đưa hai đối tượng lên trước động từ và nêu kết quả đã thực hiện.'],
 ['Nêu nhóm dự án chịu trách nhiệm ghi nhận tỷ lệ áp dụng.','由项目组统一记录 nêu đơn vị thực hiện; 由 dẫn tác nhân hoặc bên phụ trách.'],
 ['Nêu đối tượng mà khung giờ mở có ý nghĩa đặc biệt.','对于网络不稳的学生 là đối với học sinh có mạng không ổn định; không nêu nguyên nhân bằng 由于.'],
 ['Nêu giả thiết và hệ quả nếu coi số ảnh là số động vật.','要是…就… diễn đạt nếu làm vậy thì dễ kết luận sai; không khẳng định đã mắc lỗi.'],
 ['Nêu hệ quả của việc camera tập trung gần đường.','因此 là vì vậy: giới hạn vị trí camera dẫn tới yêu cầu giải thích giới hạn lấy mẫu.'],
 ['Nêu quy trình: nếu hai cảm biến ổn định thì báo chính thức, nếu không thì kiểm tra trước.','要是…就…否则… phân hai nhánh của quy trình; 否则 là nếu không thỏa điều kiện vừa nêu.'],
 ['Lấy việc giá vé không phải chi phí duy nhất làm tiền đề đã biết để suy ra kết luận.','既然…就… dùng tiền đề đã biết để đưa ra kết luận; không chỉ nêu hai đặc điểm song song.'],
 ['Nêu hậu quả nếu không ghi quãng đường tới trạm.','否则 là nếu không làm việc vừa nêu; thiếu khoảng cách có thể khiến đánh giá hỗ trợ bị cao quá.'],
 ['Dùng câu hỏi phản vấn để nghi ngờ rằng vé rẻ giải quyết mọi khó khăn về khoảng cách.','难道…吗 tạo phản vấn: người nói không tin chỉ giá vé có thể giải quyết mọi khoảng cách tới trạm.'],
 ['Nêu giới hạn trái với kỳ vọng: video hỗ trợ luyện nhưng hai buổi cuối vẫn phải có mặt.','不过 là tuy vậy/nhưng; nó giới hạn điều có thể thay thế bằng video.'],
 ['Nhấn mạnh sự trái chiều giữa số người được ra sân tăng và việc vẫn không thể chia đều máy móc.','却 nhấn mạnh điều trái với kỳ vọng; tăng người tham gia không đồng nghĩa chia thời gian bằng nhau.'],
 ['Nêu thay đổi diễn ra cùng với áp lực thi đấu tăng.','随着 dẫn sự thay đổi theo thời gian; 随着比赛压力提高 là cùng với áp lực tăng.'],
 ['Nêu mục đích cải thiện việc đi lại khiến đội bổ sung đường dốc tháo lắp được.','为了…而… nêu mục đích và hành động phục vụ mục đích; không đảo thứ tự nguyên nhân và kết quả.'],
 ['Nêu thứ tự đánh giá: kiểm an toàn trước, so thời gian đi lại sau; không làm đồng thời.','首先…其次… liệt kê các bước theo thứ tự; 一边…一边… sẽ nêu hai việc đồng thời.'],
 ['Nêu việc thiếu bối cảnh khiến người xem hiểu nhầm.','让 dẫn đối tượng chịu tác động; 让参观者误以为 nghĩa là khiến người xem tưởng nhầm.'],
];
export function loadAssessment103(){
 return JSON.parse(readFileSync('content/runtime/hsk-mock-exam-alternate-local.json','utf8')).levels.hsk4.items.filter(x=>['vocabulary','grammar'].includes(x.skill)).map(source=>{
  const x=structuredClone(source),n=Number(x.id.slice(-2));[x.promptVi,x.explanationVi]=(x.skill==='grammar'?grammar:vocab)[n-1];
  if(x.skill==='vocabulary'&&n===2)x.stimulusText='小区共享厨房改用网上预约后，____员负责检查各时段的使用情况。';
  if(x.skill==='grammar'&&n===16)x.stimulusText='团队____改善通行____增加了可以拆除的坡道。';
  return x;
 });
}
