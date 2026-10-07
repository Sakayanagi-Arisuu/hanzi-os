const fixes={
 '01':[
 ['下一步应保持记录，并比较参加与未参加相应措施的人。','陈老师可以继续记录自己的睡眠和症状，不把个人变化当作疗效证明；学院可以比较会前会后的岗位任务答案。'],
 ['Bước tiếp theo là giữ ghi chép và so sánh nhóm có/không tham gia biện pháp.','Thầy Trần có thể tiếp tục ghi giấc ngủ và triệu chứng của mình, không coi thay đổi cá nhân là chứng minh hiệu quả điều trị; nhà trường có thể so câu trả lời nhiệm vụ nghề trước và sau buổi chia sẻ.'],
 ['七成听众说更了解职业，说明活动受欢迎','感谢信说明活动受欢迎，七成听众自报更了解职业'],
 ['70% nói hiểu nghề hơn cho thấy hoạt động được ưa thích','Thư cảm ơn cho thấy hoạt động được ưa thích; 70% người nghe tự báo hiểu nghề hơn']
 ],
 '02':[
 ['So sánh sức nặng của hai kết quả nghe được','So sánh sức nặng của hai kết quả trong transcript'],
 ['培训结果有具体错误率和处理时间','培训材料给出了错误减少一半和处理时间缩短的信息'],
 ['Kết quả đào tạo có tỷ lệ lỗi và thời gian xử lý cụ thể','Tư liệu đào tạo nói lỗi giảm một nửa và thời gian xử lý ngắn hơn, không cho tỷ lệ lỗi tuyệt đối hay số phút cụ thể'],
 ['lỗi hoàn phí cơ bản','lỗi hoàn trả chi phí cơ bản'],
 ['Bài luyện kiểm tra hiểu nghe','Bài luyện kiểm tra hiểu transcript']
 ],
 '03':[
 ['Sau khi nghe, ghi','Sau khi đọc transcript, ghi'],
 ['树荫、浅色屋顶和公共空间服务的街区不同','树荫、浅色屋顶和公共空间需要按街区条件考虑'],
 ['Bóng cây, mái sáng và không gian công phục vụ khu khác nhau','Bóng cây, mái sáng và không gian công cần được xét theo điều kiện từng khu']
 ]
};
export function correctSpokenTasks73(source){
 const content=structuredClone(source),changes=[],id=content.targetLessonId;
 if(!/^hsk4-structured-spoken-defense-lesson-0[123]$/.test(id))return {content,changes};
 const suffix=id.slice(-2);
 const walk=(v,path=[])=>{if(!v||typeof v!=='object')return;for(const[k,x]of Object.entries(v)){if(typeof x==='string'){let after=x;for(const[a,b]of fixes[suffix])after=after.replaceAll(a,b);after=after.replaceAll('chi tiết đã nghe','chi tiết trong transcript').replaceAll('dữ kiện đã nghe','dữ kiện trong transcript').replaceAll('bằng chứng nghe','bằng chứng từ transcript').replaceAll('Gắn mỗi phân loại với chi tiết đã nghe.','Gắn mỗi phân loại với chi tiết trong transcript.');if(x!==after){v[k]=after;changes.push({path:[...path,k],before:x,after});}}else walk(x,[...path,k]);}};walk(content);
 const blocks=content.lessonPages.pages.flatMap(p=>p.blocks);
 for(const b of blocks.filter(b=>b.activity?.learningTarget.skill==='speaking')){
  const before=b.body;
  b.body=b.body.replace('Sản phẩm: 120–180 đơn vị theo yêu cầu','Sản phẩm: phần trình bày khoảng 120–180 giây, không phải 120–180 chữ');
  b.body+='\nDùng tổng 300 giây để tự luyện: tối đa 120 giây chuẩn bị và tối đa 180 giây trình bày. Mẫu dưới là khung ý ngắn; tự giải thích bằng chứng và phản biện bằng lời của bạn, không đọc lặp để đủ thời gian.';
  changes.push({path:[b.id,'body'],before,after:b.body});
 }
 if(suffix==='01'){
  const b=blocks.find(b=>b.id===`${id}:task:1`),before=b.body;
  b.body='Đọc transcript và phân loại bốn phát biểu: dữ kiện được ghi, giải thích có điều kiện, hoặc kết luận vượt bằng chứng. A: Thầy Trần đo 36,8°C sáng hôm đó. B: Theo giải thích của bác sĩ trong nguồn, mệt mỏi và không khí khô có thể làm triệu chứng kéo dài. C: Ai không sốt cũng không cần nghỉ. D: Buổi chia sẻ đã chứng minh người nghe biết phán đoán đúng yêu cầu công việc. Ghi đoạn cho từng ý; khi bác D, giữ dữ kiện 70% người nghe tự báo hiểu nghề hơn. Ngân sách tự luyện: 120 giây.';
  changes.push({path:[b.id,'body'],before,after:b.body});
 }
 content.review={...content.review,humanReviewed:false};return {content,changes};
}
