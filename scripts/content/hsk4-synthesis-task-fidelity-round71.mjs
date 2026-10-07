const fixes={
 '01':[
 ['Đọc nguồn hoạt động cộng đồng, nghe nguồn nền tảng tự học','Đọc nguồn hoạt động cộng đồng và transcript nguồn nền tảng tự học'],
 ['运动材料中，两天气温相同，但风雨、通知和成员经验不同。','运动材料中，两天气温相同，但风雨不同；成员习惯没有记录，通知时间也是待查条件。'],
 ['nhiệt độ bằng nhau nhưng gió mưa, thông báo và kinh nghiệm khác','nhiệt độ bằng nhau nhưng gió mưa khác; thói quen chưa được ghi, thời gian thông báo cũng là điều kiện cần xét'],
 ['实际选择却受风雨、安全、通知时间和成员习惯影响。','风雨和安全影响了安排；通知时间和成员习惯的作用仍需调查。'],
 ['lựa chọn còn chịu gió mưa, an toàn, lúc thông báo và thói quen','gió mưa và an toàn ảnh hưởng cách sắp xếp; vai trò của lúc thông báo và thói quen vẫn cần khảo sát'],
 ['共同格式和确认步骤能够减少一部分信息错误','我认为共同格式和确认步骤可能减少一部分信息错误'],
 ['Khuôn chung và xác nhận có thể giảm một phần lỗi thông tin','Tôi cho rằng khuôn chung và xác nhận có thể giảm một phần lỗi thông tin'],
 ['反对者担心步骤太多会拖慢沟通','一种可能的反对意见是，步骤太多会拖慢沟通'],
 ['Lo ngại quá nhiều bước làm chậm nhắc quản lý','Một ý kiến phản đối có thể là quá nhiều bước làm chậm giao tiếp; điều này nhắc quản lý']
 ],
 '02':[
 ['Nhà máy đổi điện làm khói đen và một chất ô nhiễm địa phương giảm','Sau khi nhà máy đổi sang điện, khói đen và một chất ô nhiễm địa phương giảm'],
 ['这个原则能提高透明度','我认为这个原则可能提高透明度'],
 ['Nguyên tắc tăng minh bạch','Tôi cho rằng nguyên tắc này có thể tăng minh bạch']
 ],
 '03':[
 ['Đọc nguồn quan trắc sông, nghe nguồn chọn máy tiết kiệm','Đọc nguồn quan trắc sông và transcript nguồn chọn máy tiết kiệm'],
 ['代价是系统更复杂','我认为代价可能是系统更复杂'],
 ['đổi lại hệ thống phức tạp','theo tôi, đánh đổi có thể là hệ thống phức tạp hơn'],
 ['订阅型账号扩大较慢但收入稳定','订阅型账号当前播放较少，但这次规则变化后订阅收入基本不变'],
 ['đăng ký tăng chậm hơn nhưng ổn định','tài khoản đăng ký hiện có ít lượt xem hơn, nhưng thu nhập đăng ký gần như không đổi sau lần đổi quy tắc này'],
 ['传播速度与收入稳定不能合成一个分数','传播速度与收入稳定需要分别解释，不能在不说明标准时只给一个分数'],
 ['lan nhanh và thu nhập ổn định không gộp thành một điểm','tốc độ lan truyền và độ ổn định thu nhập cần giải thích riêng, không chỉ đưa một điểm khi chưa nói tiêu chuẩn']
 ]
};
export function correctSynthesisTasks71(source){
 const content=structuredClone(source),changes=[],id=content.targetLessonId;
 if(!/^hsk4-cross-text-synthesis-lesson-0[123]$/.test(id))return {content,changes};
 const suffix=id.slice(-2);
 const walk=(v,path=[])=>{if(!v||typeof v!=='object')return;for(const[k,x]of Object.entries(v)){if(typeof x==='string'){let after=x;for(const[a,b]of fixes[suffix])after=after.replaceAll(a,b);if(x!==after){v[k]=after;changes.push({path:[...path,k],before:x,after});}}else walk(x,[...path,k]);}};walk(content);
 const b=content.lessonPages.pages.flatMap(p=>p.blocks).find(b=>b.id===`${id}:task:4`);
 if(suffix==='01'){
  const before=b.body;
  b.body='Đọc ba nhận định sau và ghi mỗi nhận định là: nguồn hỗ trợ, khả năng cần kiểm tra, hoặc vượt nguồn. A: Cùng 12°C nhưng hai buổi có gió/mưa khác nhau và cách sắp xếp khác nhau. B: Nhắc tự động có thể giúp một số học sinh duy trì việc học; lần sau cần kiểm tra theo mục tiêu và tần suất. C: Nền tảng chắc chắn giúp mọi học sinh học tốt hơn kế hoạch giấy. Dẫn ít nhất một chi tiết của Nguồn 1 và một chi tiết của Nguồn 4, ghi số đoạn; giải thích vì sao B chưa phải kết quả đã đo.';
  changes.push({path:['task4','body'],before,after:b.body});
  const beforeExplanation=b.activity.explanation;
  b.activity.explanation='A: Nguồn hỗ trợ (Nguồn 1, đoạn 1). B: Khả năng cần kiểm tra, phù hợp câu hỏi nghiên cứu tiếp theo (Nguồn 4, đoạn 3), chưa phải kết quả xác nhận. C: Vượt nguồn: hai lớp có mục tiêu khác và các chỉ số khác nhau (Nguồn 4, đoạn 1–3).\nMột câu giữ giới hạn:\n自动提醒是否有帮助，还要看学生的目标和提醒频率。\nZìdòng tíxǐng shìfǒu yǒu bāngzhù, hái yào kàn xuéshēng de mùbiāo hé tíxǐng pínlǜ.\nNhắc tự động có giúp ích hay không còn phải xét mục tiêu học sinh và tần suất nhắc.\nĐây là tự đối chiếu, không phải điểm đọc độc lập.';
  changes.push({path:['task4','explanation'],before:beforeExplanation,after:b.activity.explanation});
 }
 if(suffix==='03'){
  const before=b.body;
  b.body='Phân loại đúng sáu ý sau thành kết quả đã thấy, tiêu chuẩn đánh giá, rủi ro hoặc dữ liệu còn thiếu. A: Thiết bị quan trắc hoạt động bình thường 90% thời gian. B: Phát hiện ô nhiễm kịp thời. C: Máy trong thử ca đêm bị quá nóng. D: Tổn thất do dừng sản xuất cần được tính. E: Trang web chỉ có biểu đồ chuyên môn, công chúng vẫn khó hiểu. F: Hiệu quả tiết kiệm năng lượng cả năm chưa được kiểm chứng. Dùng Nguồn 1 và Nguồn 4, ghi đoạn cho mỗi ý. C là kết quả thử đã thấy; khi nói nguy cơ tái diễn trong tương lai mới là nhận định rủi ro.';
  changes.push({path:['task4','body'],before,after:b.body});
  const beforeExplanation=b.activity.explanation;
  b.activity.explanation='A: Kết quả đã thấy — Nguồn 1, đoạn 2. B: Tiêu chuẩn — Nguồn 1, đoạn 1. C: Kết quả thử đã thấy — Nguồn 4, đoạn 2; không tự suy mọi máy đều quá nóng. D: Tiêu chuẩn chi phí — Nguồn 4, đoạn 3. E: Hạn chế/rủi ro về khả năng hiểu — Nguồn 1, đoạn 2. F: Dữ liệu còn thiếu — Nguồn 4, đoạn 3.\nMột câu phân biệt:\n测试发现了过热问题，但全年节能效果还需要验证。\nCèshì fāxiàn le guòrè wèntí, dàn quán nián jiénéng xiàoguǒ hái xūyào yànzhèng.\nThử nghiệm đã phát hiện vấn đề quá nóng, nhưng hiệu quả tiết kiệm năng lượng cả năm còn cần kiểm chứng.\nPhân loại theo vai trò trong câu; một kết quả quá nóng cũng có thể là căn cứ nhận diện rủi ro an toàn. Đây là tự đối chiếu.';
  changes.push({path:['task4','explanation'],before:beforeExplanation,after:b.activity.explanation});
 }
 content.review={...content.review,humanReviewed:false};return {content,changes};
}
