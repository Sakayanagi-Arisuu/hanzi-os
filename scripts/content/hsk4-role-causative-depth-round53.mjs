const t=(hanzi,pinyin,meaningVi)=>({hanzi,pinyin,meaningVi});const q=(prompt,options,answer,explanation)=>({prompt,options,answer,explanation});
export const roleCausativeGroups53={
 'hsk4-event-agency-voice-lesson-04':[
 {row:'hsk4-grammar-row-061',title:'选……当/做/为…… và 收……为……',
 note:'选 + người + 当/做/为 + vai trò nói chọn ai đảm nhiệm vị trí: 选小王当组长. 为 trang trọng hơn 当/做 trong kiểu câu này. 收…为… thường là nhận vào quan hệ như thầy nhận học trò: 收他为徒; không dùng 收 thay 选 cho mọi việc bầu người. Người sau 选/收 là người mang vai trò cuối câu. Được chọn không tự chứng minh người ấy đã hoàn thành nhiệm vụ. Bài nguồn không nói tiệm hoa đã chọn một nhân viên phụ trách dữ liệu; không kể mẫu giả định đó như sự kiện.',
 examples:[t('大家选小王当组长。','Dàjiā xuǎn Xiǎowáng dāng zǔzhǎng.','Mọi người chọn Tiểu Vương làm trưởng nhóm.'),t('我们选她做代表。','Wǒmen xuǎn tā zuò dàibiǎo.','Chúng tôi chọn cô ấy làm đại diện.'),t('师傅收他为徒。','Shīfu shōu tā wéi tú.','Người thầy nhận anh ấy làm học trò.')],
 questions:[q('Trong 大家选小王当组长, ai trở thành trưởng nhóm?',['Tiểu Vương','Mọi người cùng làm trưởng nhóm','Người thầy'],0,'小王 là người được chọn và là người đảm nhiệm vai trò 组长.'),q('收他为徒 biểu thị gì?',['Bầu anh làm thị trưởng','Nhận anh làm học trò','Anh đã dạy xong mọi lớp'],1,'收…为徒 diễn đạt quan hệ nhận học trò, không thay 选 trong mọi hoàn cảnh.'),q('Được chọn làm đại diện có chứng minh đã giải quyết mọi vấn đề không?',['Có','Có nếu dùng 为','Không, mới xác định vai trò'],2,'Vai trò được giao khác kết quả công việc.')],
 transfer:'Ở câu lạc bộ mới, mọi người chọn Tiểu Lý làm đại diện; một nghệ nhân nhận Tiểu Lý làm học trò. Viết hai câu, chọn 选/收 phù hợp.',
 model:t('大家选小李当代表。一位师傅收小李为徒。','Dàjiā xuǎn Xiǎolǐ dāng dàibiǎo. Yí wèi shīfu shōu Xiǎolǐ wéi tú.','Mọi người chọn Tiểu Lý làm đại diện. Một người thầy nhận Tiểu Lý làm học trò.'),rubric:['选…当代表 nói chọn vai trò.','收…为徒 nói nhận học trò.','Không thêm kết quả năng lực hoặc nhiệm vụ đã xong.']},
 {row:'hsk4-grammar-row-062',title:'使/让 + người + cụm vị từ: khiến hoặc cho phép',
 note:'使 thường dùng văn viết để nói khiến, 让 phổ biến hơn trong khẩu ngữ: 这条消息使我放心了 / 这条消息让我放心了. Sau 使/让 có đối tượng chịu tác động rồi cụm vị từ. 让 còn là cho phép/yêu cầu như 妈妈让我出去玩; 使 không thay tự nhiên trong mọi câu cho phép. Khác câu bị động: 我的杯子让他打破了 đặt vật bị làm vỡ đầu câu. Nêu một nguyên nhân không có nghĩa đó là nguyên nhân duy nhất. Nguồn cầu mới chỉ cho thời gian đi giảm; không ghi tiểu thương đã sắp lại dịch vụ cuối tuần.',
 examples:[t('这条消息使我放心了。','Zhè tiáo xiāoxi shǐ wǒ fàngxīn le.','Tin này khiến tôi yên tâm.'),t('这张地图让游客更容易找到入口。','Zhè zhāng dìtú ràng yóukè gèng róngyì zhǎo dào rùkǒu.','Bản đồ này giúp khách dễ tìm lối vào hơn.'),t('妈妈让我出去玩。','Māma ràng wǒ chū qù wán.','Mẹ cho tôi ra ngoài chơi.')],
 questions:[q('Trong 消息使我放心, ai yên tâm?',['Tin tức','Tôi','Mẹ'],1,'我 là người chịu tác động và có trạng thái 放心.'),q('Ở 妈妈让我出去玩, 让 có thể mang nghĩa nào?',['Mẹ bị tôi chơi','Chỉ có bị động','Mẹ cho phép tôi ra chơi'],2,'让 có nghĩa cho phép trong ngữ cảnh này; không thay máy móc bằng 使.'),q('Cầu làm thời gian đi giảm. Có thể thêm “mọi khách chỉ vì cầu mà tới” không?',['Không, đã thêm tính duy nhất và phạm vi mọi khách','Có vì dùng 使','Có vì thời gian giảm là thật'],0,'Cấu trúc khiến không xóa các yếu tố khác hoặc tự mở rộng đối tượng.')],
 transfer:'Tình huống mới: thông báo rõ giúp bạn hiểu giờ hẹn, bạn cũng được trưởng nhóm cho phép về sớm. Viết một câu 使/让 chỉ tác động và một câu 让 chỉ cho phép.',
 model:t('清楚的通知让我知道了见面的时间。组长让我早点儿回家。','Qīngchu de tōngzhī ràng wǒ zhīdào le jiàn miàn de shíjiān. Zǔzhǎng ràng wǒ zǎo diǎnr huí jiā.','Thông báo rõ giúp tôi biết giờ gặp. Trưởng nhóm cho tôi về nhà sớm hơn.'),rubric:['Câu đầu nêu tác động thông tin lên tôi.','Câu sau giữ nghĩa cho phép của 让.','Không thêm rằng đã về nhà nếu chỉ được cho phép.']}
 ]
};
export function deepenRoleCausative53(source){
 const groups=roleCausativeGroups53[source.targetLessonId];if(!groups)return {content:structuredClone(source),changes:[]};
 const out=structuredClone(source),lessonId=out.targetLessonId;
 if(out.lessonPages.pages.some(p=>p.id.includes(':role-causative-r53:')))throw Error('Do not replay');
 const block=(id,kind,title,body='',value={})=>({id,kind,title,body,hanzi:'',pinyin:'',meaningVi:'',imageSrc:'',alt:'',provenance:'',...value});
 for(const [i,g] of groups.entries()){
  const pageId=`${lessonId}:v2:grammar:${i}`,idx=out.lessonPages.pages.findIndex(p=>p.id===pageId);
  if(idx<0||!out.sourceGrammarIds.includes(g.row))throw Error('Missing original grammar page/source');
  const original=out.lessonPages.pages[idx],rule=original.blocks[0],example=original.blocks[1],write=original.blocks[2];
  if(!rule.id.endsWith(`grammar-rule:${i}`)||!write.activity)throw Error('Unexpected original page');
  const prefix=`${lessonId}:role-causative-r53:${i}`;
  // The existing registry exposes this lesson's authored pattern as one source;
  // syllabus rows above remain editorial mapping, not invented runtime sources.
  const target={objective:g.title,skill:'grammar',sources:structuredClone(write.activity.learningTarget.sources)};
  const teach={...original,title:g.title,blocks:[{...rule,title:g.title,body:g.note},...g.examples.map((e,n)=>block(n===0?example.id:`${prefix}:example:${n}`,'dialogue',`Mẫu ${n+1}`,'',e))]};
  const practice={id:`${prefix}:practice`,title:`Khảo Luyện · ${g.title}`,stage:'practice',layout:'workshop',blocks:g.questions.map((q,n)=>block(`${prefix}:question:${n}`,'activity',`Đối chiếu ${n+1}`,q.prompt,{activity:{type:'choice',options:q.options.map((text,j)=>({id:`o-${j}`,text,feedback:j===q.answer?q.explanation:'Xác định quan hệ ý và đọc lại mẫu tương ứng.'})),answerIds:[`o-${q.answer}`],acceptedAnswers:[],rubric:[],hint:'',explanation:q.explanation,learningTarget:target}}))};
  const transfer={id:`${prefix}:transfer`,title:`Vận dụng · ${g.title}`,stage:'transfer',layout:'workshop',blocks:[{...write,title:'Viết trong tình huống mới',body:g.transfer,activity:{...write.activity,learningTarget:{...target,skill:'writing'},rubric:g.rubric.map((label,n)=>({id:`r-${n}`,label,guidance:label})),explanation:`Một cách diễn đạt:\n${g.model.hanzi}\n${g.model.pinyin}\n${g.model.meaningVi}\nTự đối chiếu, không phải điểm viết độc lập.`}}]};
  out.lessonPages.pages.splice(idx,1,teach,practice,transfer);
  out.grammar[i]={...out.grammar[i],explanationVi:g.note,modelExample:{...g.examples[0],speaker:'A'},guidedPractice:{promptVi:g.transfer,modelAnswerHanzi:g.model.hanzi,modelAnswerPinyin:g.model.pinyin,modelAnswerMeaningVi:g.model.meaningVi}};
 }
 out.review={...out.review,humanReviewed:false};
 return {content:out,changes:[{groups:groups.length,netPages:groups.length*2}]};
}

