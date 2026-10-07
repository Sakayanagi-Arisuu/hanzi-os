export function correctSectionalTasks75(source){
 const content=structuredClone(source),changes=[],id=content.targetLessonId;
 if(!/^hsk4-timed-sectional-rehearsal-lesson-0[123]$/.test(id))return {content,changes};
 const fixes=[
  ['Note chỉ chứng minh hiểu nguồn nghe','Ghi chú chỉ hỗ trợ tự đối chiếu việc hiểu transcript'],
  ['hai nguồn nghe đã lộ','hai nguồn transcript đã được cung cấp'],
  ['Sản phẩm: 180–260 đơn vị theo yêu cầu','Sản phẩm: 180–260 chữ Hán, không tính dấu câu'],
  ['保留学籍','保留入学资格'],
  ['纪念展空间有限，不能展示改革者的一切','纪念展需要选择事实，不能等同于完整历史'],
  ['Triển lãm hữu hạn nên trình bày','Triển lãm cần chọn thông tin, nên trình bày'],
  ['胜率和问卷都提高','客队赢了四场，问卷反馈也积极'],
  ['Shènglǜ hé wènjuàn dōu tígāo','Kèduì yíng le sì chǎng, wènjuàn fǎnkuì yě jījí'],
  ['Tỷ lệ thắng và khảo sát tăng nhưng cơ hội giao lưu không phân đều','Đội khách thắng bốn trận và phản hồi khảo sát tích cực, nhưng cơ hội giao lưu không phân đều']
 ];
 const walk=(v,path=[])=>{if(!v||typeof v!=='object')return;for(const[k,x]of Object.entries(v)){if(typeof x==='string'){let after=x;for(const[a,b]of fixes)after=after.replaceAll(a,b);if(x!==after){v[k]=after;changes.push({path:[...path,k],before:x,after});}}else walk(x,[...path,k]);}};walk(content);
 for(const b of content.lessonPages.pages.flatMap(p=>p.blocks).filter(b=>b.activity?.learningTarget.skill==='speaking')){const before=b.body;b.body=b.body.replace('Sản phẩm: 120–180 đơn vị theo yêu cầu','Sản phẩm: phần nói khoảng 120–180 giây, không phải số chữ')+'\nTổng ngân sách 300 giây: tối đa 120 giây chuẩn bị và tối đa 180 giây trình bày. Mẫu là khung ý để bạn phát triển bằng chứng và hồi đáp bằng lời riêng; không đọc lặp để đủ giờ.';changes.push({path:[b.id,'body'],before,after:b.body});}
 content.review={...content.review,humanReviewed:false};return {content,changes};
}
