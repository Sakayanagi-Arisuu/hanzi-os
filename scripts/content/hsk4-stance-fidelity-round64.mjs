const id2='hsk4-stance-comparison-rhetoric-lesson-02',id3='hsk4-stance-comparison-rhetoric-lesson-03',id5='hsk4-stance-comparison-rhetoric-lesson-05';
const fixes={
 [id2]:[
 ['phần giải thích dưới một trăm chữ','phần giải thích không quá một trăm chữ'],
 ['thử ba tháng cùng vòng nghiên cứu sau chưa xong','đã có kết quả thử ba tháng, còn khảo sát tiếp theo và vòng nghiên cứu sau chưa xong']
 ],
 [id3]:[
 ['Tóm tắt và sắp xếp sức nặng bằng chứng của hai can thiệp: chương trình tự học và đào tạo hệ thống báo phí.','Tóm tắt bằng chứng và giới hạn của hai can thiệp: chương trình tự học và đào tạo hệ thống hoàn trả chi phí.'],
 ['đào tạo báo phí','đào tạo hoàn trả chi phí'],['Đào tạo báo phí','Đào tạo hoàn trả chi phí'],
 ['lỗi hoàn tiền cơ bản','lỗi hoàn trả chi phí cơ bản'],
 ['若在比较前全面推广，就会失去了解原因的机会。','我建议在扩大规模时保留可比较的记录；全面推广不一定使比较完全不可能，但可能增加研究的难度。'],
 ['Mở rộng toàn bộ trước các phép so sánh sẽ làm mất cơ hội học nguyên nhân.','Tôi đề xuất giữ ghi chép có thể so sánh khi mở rộng; mở rộng toàn bộ không nhất thiết khiến mọi so sánh bất khả thi, nhưng có thể làm nghiên cứu khó hơn.'],
 ['三个月结果出来前，只能支持继续试验，不能支持全面推广。','三个月结果出来前，我建议继续比较，并根据风险和成本决定扩大范围。'],
 ['Trước kết quả ba tháng chỉ đủ ủng hộ thử tiếp, chưa đủ mở rộng toàn bộ.','Trước kết quả ba tháng, tôi đề nghị tiếp tục so sánh và cân nhắc rủi ro, chi phí khi quyết định mở rộng.']
 ],
 [id5]:[
 ['双层窗冬季保温较稳定，','双层窗冬季保温效果稳定，'],
 ['Cửa kính hai lớp giữ nhiệt mùa đông ổn định hơn;','Cửa kính hai lớp giữ nhiệt mùa đông có hiệu quả ổn định;'],
 ['Nhà máy chuyển sang điện khiến khói đen cổng nhà máy ít đi','Sau khi nhà máy chuyển sang điện, khói đen gần nhà máy ít đi'],
 ['đổi sang điện làm khói đen ở cổng ít đi','sau khi đổi sang điện, khói đen gần nhà máy ít đi'],
 ['Đổi sang điện làm ô nhiễm địa phương giảm 30%','Sau đổi sang điện, một loại ô nhiễm địa phương giảm 30%']
 ]
};
export function correctStanceFidelity64(source){
 const content=structuredClone(source),changes=[],id=content.targetLessonId;
 if(!fixes[id])return {content,changes};
 const walk=(v,path=[])=>{if(!v||typeof v!=='object')return;
  for(const[k,x]of Object.entries(v)){
   if(typeof x==='string'){let after=x;for(const[from,to]of fixes[id])after=after.replaceAll(from,to);
    if(after!==x){v[k]=after;changes.push({path:[...path,k],before:x,after});}
   }else walk(x,[...path,k]);
  }
 };walk(content);
 if(id===id5){const block=content.lessonPages.pages.flatMap(p=>p.blocks).find(b=>b.id===`${id5}:audit:0`);if(!block?.activity)throw Error('Missing audit');const before=structuredClone(block.activity.learningTarget);block.activity.learningTarget.objective='Giữ riêng hiệu quả mùa đông/mùa hè và cảm nhận độ sáng, không tự xếp hạng ổn định tương đối ngoài nguồn.';changes.push({path:['audit0','learningTarget'],before,after:structuredClone(block.activity.learningTarget)});}
 return {content,changes};
}
