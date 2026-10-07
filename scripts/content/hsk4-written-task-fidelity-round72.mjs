const prefix='hsk4-structured-written-argument-lesson-';
const fixes={
 [prefix+'01']:[
 ['两例都表明，反馈只有在责任人记录问题并说明修改依据时，才真正进入决策。','我认为，这两个例子说明：把问题与修改依据记录下来，有助于让反馈进入决策；这不等于所有决定都必须先有书面记录。'],
 ['Phản hồi chỉ vào quyết định khi người phụ trách ghi vấn đề và căn cứ sửa.','Theo tôi, hai ví dụ cho thấy ghi vấn đề và căn cứ sửa giúp đưa phản hồi vào quyết định; điều đó không có nghĩa mọi quyết định đều bắt buộc phải có ghi chép trước.'],
 ['单次观众反馈','有限的观众反馈'],
 ['phản hồi một lần','phản hồi khán giả trong phạm vi đã mô tả']
 ],
 [prefix+'02']:[
 ['两源仍 dự kiến','hai nguồn vẫn dự kiến']
 ],
 [prefix+'03']:[
 ['一般原则需要应用条件和责任人。','在这两个例子中，说明应用条件和责任有助于理解一般原则。'],
 ['服务表只有在工作人员分类、转交并确认紧急程度时才形成行动。','服务表通过工作人员分类和转交形成处理流程，后来又增加了紧急程度和电话确认。'],
 ['Bằng chứng hai: bảng chỉ thành hành động khi nhân viên phân loại, chuyển, xác nhận khẩn cấp.','Bằng chứng hai: bảng hỗ trợ quy trình phân loại và chuyển giao; sau đó mới thêm mức khẩn cấp và xác nhận qua điện thoại.'],
 ['社区服务表也只有在工作人员分类、志愿者回复、专业部门处理和电话确认相互衔接时才有效。','社区服务表通过工作人员分类、志愿者回复和专业部门处理来组织服务；后来增加电话确认，以改善紧急信息的识别。'],
 ['Bảng dịch vụ chỉ hiệu quả khi phân loại, trả lời, xử lý chuyên môn và xác nhận nối nhau.','Bảng dịch vụ tổ chức phân loại, trả lời và xử lý chuyên môn; sau đó thêm xác nhận qua điện thoại để cải thiện việc nhận diện thông tin khẩn cấp.'],
 ['两个社区与课堂案例','一个社区服务案例和一次课堂讨论'],
 ['三个月内多数问题一天得到回复；它仍需改进紧急信息识别。','三个月后，中心发现多数问题能在一天内得到回复；随后又改进了紧急信息的识别，改进后的效果仍需观察。'],
 ['đa số vấn đề được trả lời trong ngày suốt ba tháng; vẫn phải cải thiện nhận diện khẩn.','sau ba tháng, trung tâm thấy đa số vấn đề được trả lời trong vòng một ngày; sau đó đã sửa cách nhận diện thông tin khẩn cấp, còn cần quan sát kết quả của bản sửa.']
 ],
 'hsk4-precision-reference-quantity-lesson-04':[
 ['rồi xác nhận sẽ ghi lại. Viết lời đáp với 啊/嗯 và nêu thái độ dự định.','rồi xác nhận bạn đã ghi lại giờ mới. Viết lời đáp với 啊/嗯 và giữ trạng thái đã ghi lại.']
 ]
};
export function correctWrittenTasks72(source){
 const content=structuredClone(source),changes=[],id=content.targetLessonId;
 if(!fixes[id])return {content,changes};
 const walk=(v,path=[])=>{if(!v||typeof v!=='object')return;for(const[k,x]of Object.entries(v)){if(typeof x==='string'){let after=x;for(const[a,b]of fixes[id])after=after.replaceAll(a,b);if(x!==after){v[k]=after;changes.push({path:[...path,k],before:x,after});}}else walk(x,[...path,k]);}};walk(content);
 const blocks=content.lessonPages.pages.flatMap(p=>p.blocks);
 const b=blocks.find(b=>b.id===`${id}:task:1`);
 if(id===prefix+'01'){
  const before=b.body;b.body='Trong 120 giây tự luyện, phân loại bốn nhận định sau là được hỗ trợ hoặc vượt nguồn: A: Bản dữ liệu công khai nguồn, thời gian cập nhật và người phụ trách. B: Đội kịch bóng sửa theo ánh sáng và phản hồi khán giả. C: Bản đồ vai trò bảo đảm mọi cộng đồng đã được mô tả đầy đủ. D: Thành công của tác phẩm này chứng minh cách làm luôn hiệu quả trong mọi dự án. Ghi đoạn nguồn cho A/B và một giới hạn bác C/D. Dùng cả hai nguồn.';changes.push({path:['task1','body'],before,after:b.body});
 }
 if(id===prefix+'03'){
  const before=b.body;b.body=b.body.replace('nguyên tắc chung chỉ hữu ích khi đi kèm điều kiện áp dụng và người chịu trách nhiệm','trong hai trường hợp này, điều kiện áp dụng và người chịu trách nhiệm giúp làm rõ nguyên tắc chung');changes.push({path:['task1','body'],before,after:b.body});
  b.activity.learningTarget.objective='Sắp luận điểm, bằng chứng từ hai nguồn, phản biện và hồi đáp; giữ nhận định trong phạm vi hai trường hợp.';
 }
 content.review={...content.review,humanReviewed:false};return {content,changes};
}
