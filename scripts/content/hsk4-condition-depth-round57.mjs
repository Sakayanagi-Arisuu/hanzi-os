const t=(hanzi,pinyin,meaningVi)=>({hanzi,pinyin,meaningVi});const q=(prompt,options,answer,explanation)=>({prompt,options,answer,explanation});
export const conditionGroups57={
 'hsk4-argument-logic-concession-lesson-02':[
 {row:'hsk4-grammar-row-081',title:'否则: nếu không thì',
 note:'否则 fǒuzé nối lời nhắc/điều kiện trước với hệ quả nếu không làm hoặc điều kiện không có. 请早点儿出发，否则可能迟到: hãy đi sớm, nếu không có thể muộn. Không phải liên từ tương phản chung như 但是. Hệ quả có thể chắc theo quy định, hoặc chỉ là nguy cơ với 可能; không tự nâng nguy cơ thành tất yếu. Nguồn tiệm bánh không nói đã ghi công thức và thử mẻ nhỏ, nên không dùng những việc đó như bằng chứng đã xảy ra.',
 examples:[t('请早点儿出发，否则可能迟到。','Qǐng zǎo diǎnr chūfā, fǒuzé kěnéng chídào.','Hãy xuất phát sớm hơn, nếu không có thể đến muộn.'),t('请带上门票，否则不能入场。','Qǐng dài shàng ménpiào, fǒuzé bù néng rùchǎng.','Hãy mang vé, nếu không sẽ không được vào.')],
 questions:[q('否则可能迟到 nói gì?',['Chắc chắn đã muộn','Nếu không thì có nguy cơ muộn','Dù đi lúc nào cũng muộn'],1,'可能 giữ mức có thể, không khẳng định kết quả đã xảy ra.'),q('Bạn thấy rẻ nhưng xa, cần nối hai nhận xét. Chọn.',['便宜，否则很远。','便宜，否则已经远。','很便宜，但是离家很远。'],2,'Đây là tương phản ưu/nhược điểm, không phải hệ quả nếu không thực hiện việc trước.')],
 transfer:'Nội quy mới yêu cầu xuất trình thẻ thư viện để mượn sách. Viết lời nhắc mang thẻ với 否则; không nói không có thẻ thì không được đọc bất kỳ sách nào.',
 model:t('请带上借书证，否则不能借书。','Qǐng dài shàng jièshūzhèng, fǒuzé bù néng jiè shū.','Hãy mang thẻ thư viện, nếu không sẽ không được mượn sách.'),rubric:['Nêu mang thẻ trước, hệ quả không mượn sau 否则.','Giữ giới hạn mượn sách của nội quy.','Không thêm cấm đọc mọi sách.']},
 {row:'hsk4-grammar-row-082',title:'要是……就……: nếu…thì…',
 note:'要是 yàoshi gần nghĩa 如果, phổ biến trong khẩu ngữ. Vế đầu đặt điều kiện, 就 đứng trước vị từ vế hệ quả. Cùng chủ ngữ: 我明天要是有空，就去看你. Khác chủ ngữ: 要是你有空，我们就见面. Mệnh đề điều kiện không tự nói điều đó đã xảy ra. Không dùng 因为 thay 要是 nếu chưa biết điều kiện có đúng hay không.',
 examples:[t('我明天要是有空，就去看你。','Wǒ míngtiān yàoshi yǒu kòng, jiù qù kàn nǐ.','Ngày mai nếu rảnh thì tôi đến thăm bạn.'),t('要是你有空，我们就见面。','Yàoshi nǐ yǒu kòng, wǒmen jiù jiàn miàn.','Nếu bạn rảnh thì chúng ta gặp nhau.')],
 questions:[q('Câu 我明天要是有空，就去看你 có xác nhận mai rảnh không?',['Không, chỉ đặt điều kiện','Có, chắc chắn rảnh','Có, đã đến thăm'],0,'要是 đánh dấu điều kiện, không phải thông báo đã rảnh hoặc đã đi.'),q('Chọn trật tự tự nhiên.',['要是你有空，我们就见面。','你就有空，要是我们见面。','要是你有空，我们见面要是。'],0,'Điều kiện trước, chủ ngữ 我们 rồi 就 và vị từ 见面.')],
 transfer:'Nếu trời đẹp cuối tuần, bạn và bạn học dự định đi công viên. Viết câu điều kiện, không dự báo chắc chắn thời tiết.',
 model:t('周末要是天气好，我们就去公园。','Zhōumò yàoshi tiānqì hǎo, wǒmen jiù qù gōngyuán.','Cuối tuần nếu thời tiết đẹp thì chúng tôi đi công viên.'),rubric:['要是 đặt điều kiện thời tiết.','我们就去 nêu dự định có điều kiện.','Không nói thời tiết chắc đẹp.']},
 {row:'hsk4-grammar-row-083',title:'要是……就……，否则……: hai nhánh của kế hoạch',
 note:'要是…就… nêu nhánh khi điều kiện đúng; 否则 nêu nhánh khi điều kiện đó không đúng. Cần xác định rõ 否则 phủ định điều gì. Có thể dùng cho hai lựa chọn do người nói quyết định, như có chỗ thì ngồi trong nhà, không có thì ngồi ngoài. Không dùng hai nhánh để khẳng định đời thực chỉ có hai cách thu thập bằng chứng hoặc giải quyết vấn đề.',
 examples:[t('要是店里有空位，我们就坐里面，否则就坐外面。','Yàoshi diàn lǐ yǒu kòngwèi, wǒmen jiù zuò lǐmiàn, fǒuzé jiù zuò wàimiàn.','Nếu trong quán còn chỗ thì chúng ta ngồi trong, nếu không thì ngồi ngoài.'),t('要是今天能完成，我就今晚发给你，否则明早再发。','Yàoshi jīntiān néng wánchéng, wǒ jiù jīnwǎn fā gěi nǐ, fǒuzé míngzǎo zài fā.','Nếu hôm nay làm xong được thì tối nay tôi gửi bạn, nếu không thì sáng mai gửi.')],
 questions:[q('否则 ở câu chỗ ngồi phủ định điều gì?',['Quán tồn tại','Trong quán có chỗ trống','Chúng ta muốn ngồi'],1,'Nếu trong quán không có chỗ thì chọn ngồi ngoài theo kế hoạch này.'),q('Câu gửi tài liệu có chứng minh tối nay sẽ nhận được không?',['Có vì có 就','Có vì có 今天','Không, còn điều kiện hoàn thành'],2,'Kế hoạch có nhánh khác; chưa xác nhận đã hoàn thành.')],
 transfer:'Bạn lập kế hoạch: nếu mai không mưa thì đi bộ tới thư viện, nếu không thì đi xe buýt. Viết đủ hai nhánh.',
 model:t('要是明天不下雨，我就走路去图书馆，否则就坐公共汽车去。','Yàoshi míngtiān bú xià yǔ, wǒ jiù zǒu lù qù túshūguǎn, fǒuzé jiù zuò gōnggòng qìchē qù.','Nếu mai không mưa thì tôi đi bộ tới thư viện, nếu không thì đi xe buýt.'),rubric:['Nhánh đi bộ gắn điều kiện không mưa.','否则 ở đây là nếu mưa, không phải nếu không đi thư viện.','Giữ cùng điểm đến và hai phương tiện dự định.']},
 {row:'hsk4-grammar-row-084',title:'不管……都/也……: kết quả giữ nguyên qua các điều kiện',
 note:'不管 bùguǎn thường đi với từ nghi vấn chỉ mọi khả năng (谁、什么时候、多忙) hoặc lựa chọn A不A/A还是B. Vế sau 都/也 nói điều giữ nguyên: 不管谁来，我都欢迎. Khác 要是: kết quả không chỉ phụ thuộc một nhánh. Phạm vi vẫn do ngữ cảnh quyết định; 不管 không cho phép bỏ quy tắc an toàn hay mở rộng kết luận về mọi người ngoài nguồn.',
 examples:[t('不管谁来，我都欢迎。','Bùguǎn shéi lái, wǒ dōu huānyíng.','Bất kể ai đến, tôi đều hoan nghênh.'),t('不管下不下雨，活动都在室内举行。','Bùguǎn xià bu xià yǔ, huódòng dōu zài shìnèi jǔxíng.','Dù mưa hay không, hoạt động đều tổ chức trong nhà.'),t('不管多忙，我也要给家里打个电话。','Bùguǎn duō máng, wǒ yě yào gěi jiā lǐ dǎ ge diànhuà.','Dù bận thế nào, tôi cũng phải gọi một cuộc về nhà.')],
 questions:[q('不管下不下雨，活动都在室内举行 khác gì “nếu mưa thì ở trong”?',['Chỉ tổ chức nếu mưa','Cả mưa lẫn không mưa đều ở trong','Khẳng định đã mưa'],1,'不管…都… giữ địa điểm không đổi ở cả hai khả năng.'),q('Chọn câu giữ quyết định học dù bận thế nào.',['不管多忙，我都要学习。','要是多忙，我都不管。','不管很忙，所以谁学习。'],0,'多忙 nêu mọi mức bận; 都要学习 giữ ý định.')],
 transfer:'Thông báo mới: dù đăng ký online hay tại quầy, ai cũng cần ghi số điện thoại. Viết 不管…还是…都… đúng phạm vi đăng ký.',
 model:t('不管在网上还是在柜台报名，都要填写电话号码。','Bùguǎn zài wǎngshàng háishi zài guìtái bàomíng, dōu yào tiánxiě diànhuà hàomǎ.','Dù đăng ký trên mạng hay tại quầy, đều phải điền số điện thoại.'),rubric:['Nêu hai cách đăng ký với 还是.','都要 giữ cùng yêu cầu.','Không mở rộng yêu cầu cho người không đăng ký.']}
 ]
};
export function deepenCondition57(source){
 const groups=conditionGroups57[source.targetLessonId];if(!groups)return {content:structuredClone(source),changes:[]};
 const out=structuredClone(source),lessonId=out.targetLessonId;
 if(out.lessonPages.pages.some(p=>p.id.includes(':condition-r57:')))throw Error('Do not replay');
 const block=(id,kind,title,body='',value={})=>({id,kind,title,body,hanzi:'',pinyin:'',meaningVi:'',imageSrc:'',alt:'',provenance:'',...value});
 for(const [i,g] of groups.entries()){
  const pageId=`${lessonId}:v2:grammar:${i}`,idx=out.lessonPages.pages.findIndex(p=>p.id===pageId);
  if(idx<0||!out.sourceGrammarIds.includes(g.row))throw Error('Missing original grammar page/source');
  const original=out.lessonPages.pages[idx],rule=original.blocks[0],example=original.blocks[1],write=original.blocks[2];
  if(!rule.id.endsWith(`grammar-rule:${i}`)||!write.activity)throw Error('Unexpected original page');
  const prefix=`${lessonId}:condition-r57:${i}`;
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


