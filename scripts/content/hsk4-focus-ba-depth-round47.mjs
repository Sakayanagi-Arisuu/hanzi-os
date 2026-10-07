const t=(hanzi,pinyin,meaningVi)=>({hanzi,pinyin,meaningVi});
const q=(prompt,options,answer,explanation)=>({prompt,options,answer,explanation});
export const focusBaGroups47={
 'hsk4-information-order-cohesion-lesson-05':[
 {row:'hsk4-grammar-row-075',title:'连……都/也……，……更……: chọn điểm nhấn hợp lý',
 note:'连 đặt trước phần muốn nhấn: ngay cả X cũng…; 都/也 đứng trước vị từ. Có thể nhấn chủ thể (连老师都…), tân ngữ (连午饭都没吃), hoặc cả cụm. Muốn nối 更, cần một thang so sánh hợp lý: người quen đường còn lạc thì người lần đầu tới càng dễ lạc. Không chỉ đặt hai câu bất kỳ cạnh nhau. Trong câu phủ định, dùng 连…都/也没/不…; 连 không tự mang nghĩa phủ định.',
 examples:[t('他忙得连午饭都没吃。','Tā máng de lián wǔfàn dōu méi chī.','Anh bận đến ngay cả bữa trưa cũng chưa ăn.'),t('连熟悉这条路的人都会迷路，第一次来的人就更容易迷路了。','Lián shúxī zhè tiáo lù de rén dōu huì mí lù, dì yī cì lái de rén jiù gèng róngyì mí lù le.','Ngay người quen đường cũng có thể lạc; người tới lần đầu lại càng dễ lạc.')],
 questions:[q('Trong “连午饭都没吃”, phần được nhấn là gì?',['Bữa trưa cũng chưa ăn','Mọi người ăn trưa','Bữa trưa đã ăn hết'],0,'连 đặt trước 午饭, 都没吃 phủ định việc ăn.'),q('Cặp nào có tăng cấp hợp lý với 更?',['Người quen đường còn lạc → người lần đầu càng dễ lạc','Người quen đường còn lạc → giá sách càng rẻ','Người quen đường còn lạc → hôm qua đã mưa'],0,'Hai vế cùng so mức dễ lạc theo kinh nghiệm đường đi; không nối hai đại lượng không liên quan.')],
 transfer:'Đề mới: chiếc hộp nặng đến người lớn cũng thấy khó nâng; trẻ nhỏ càng khó nâng hơn. Viết câu 连…都…更…; không nói mọi trẻ đã thử nâng.',
 model:t('这个箱子连大人都觉得难搬，小孩子搬起来就更困难了。','Zhè ge xiāngzi lián dàren dōu juéde nán bān, xiǎoháizi bān qǐlái jiù gèng kùnnan le.','Hộp này ngay người lớn cũng thấy khó chuyển; trẻ nhỏ chuyển càng khó hơn.'),rubric:['连大人都 nêu trường hợp làm mốc nổi bật.','更 so cùng việc chuyển chiếc hộp.','Không thêm rằng trẻ đã nâng hoặc bị thương.']},
 {row:'hsk4-grammar-row-076',title:'不是……就是……: hai khả năng trong phạm vi đã biết',
 note:'不是A，就是B nghĩa nếu không phải A thì là B, thường nêu hai khả năng người nói khoanh vùng hoặc hai việc thường luân phiên. Người nói chưa nhất thiết biết khả năng nào đúng: 他不是在家，就是在办公室. Phân biệt 不是A，而是B đã bác A và xác định B. Không dùng 不是…就是… khi dữ kiện cho phép nhiều phương án khác mà chưa giới hạn; tránh biến vấn đề văn hóa–sức khỏe thành chỉ có hai lựa chọn.',
 examples:[t('钥匙不是在包里，就是在桌上。','Yàoshi bú shì zài bāo lǐ, jiù shì zài zhuō shàng.','Chìa khóa nếu không trong túi thì ở trên bàn.'),t('他周末不是看书，就是散步。','Tā zhōumò bú shì kàn shū, jiù shì sàn bù.','Cuối tuần anh ấy nếu không đọc sách thì đi dạo.'),t('钥匙不是在包里，而是在桌上。','Yàoshi bú shì zài bāo lǐ, ér shì zài zhuō shàng.','Chìa khóa không ở trong túi mà ở trên bàn.')],
 questions:[q('Câu dùng 就是 về chìa khóa đã khẳng định nó trên bàn chưa?',['Rồi, chắc chắn trên bàn','Chưa, đang nêu hai khả năng','Rồi, cả hai nơi cùng lúc'],1,'不是…就是… khoanh hai khả năng, khác 不是…而是… xác định B.'),q('Đã kiểm tra túi trống và thấy chìa khóa trên bàn. Muốn sửa thông tin sai, chọn.',['不是在包里，就是在桌上。','不是在包里，而且在桌上。','不是在包里，而是在桌上。'],2,'而是 sửa A thành B khi đã có căn cứ.')],
 transfer:'Bạn biết đồng nghiệp hiện chỉ có thể ở phòng họp hoặc thư viện nhưng chưa kiểm tra. Viết hai khả năng; sau đó giả sử thấy họ ở thư viện, viết câu đính chính.',
 model:t('他不是在会议室，就是在图书馆。我刚看到他了，他不是在会议室，而是在图书馆。','Tā bú shì zài huìyìshì, jiù shì zài túshūguǎn. Wǒ gāng kàn dào tā le, tā bú shì zài huìyìshì, ér shì zài túshūguǎn.','Anh ấy nếu không ở phòng họp thì ở thư viện. Tôi vừa thấy anh rồi: không ở phòng họp mà ở thư viện.'),rubric:['Câu đầu khoanh hai khả năng đã cho.','Câu sau có căn cứ mới để dùng 而是.','Không nói cùng lúc ở cả hai nơi.']}
 ],
 'hsk4-event-agency-voice-lesson-01':[
 {row:'hsk4-grammar-row-055',title:'把 + đối tượng + động từ lặp: thử hoặc làm một chút',
 note:'把 đưa đối tượng xác định lên trước động từ và nói xử lý nó ra sao. Với động từ đơn âm tiết, 看看/看一看 thường là xem một chút hoặc lời nhờ nhẹ; 看了看 là đã xem một chút. Không đồng nhất với 看了又看 là xem đi xem lại nhiều lần. Phủ định hoặc động từ năng nguyện đặt trước 把: 没把、请把、可以把. Không dùng động từ tri giác/trạng thái bất kỳ như 把他知道; cần hành động tác động phù hợp.',
 examples:[t('请把这段话读一读。','Qǐng bǎ zhè duàn huà dú yi dú.','Hãy đọc thử đoạn này.'),t('我把那张照片看了看。','Wǒ bǎ nà zhāng zhàopiàn kàn le kàn.','Tôi đã xem qua tấm ảnh ấy.'),t('他把合同看了又看。','Tā bǎ hétong kàn le yòu kàn.','Anh xem đi xem lại hợp đồng.')],
 questions:[q('看了看 khác 看了又看 ở điểm nào?',['Cả hai bắt buộc xem nhiều lần như nhau','看了看 thường xem qua; 看了又看 nhấn lặp nhiều lần','看了看 chưa xem lần nào'],1,'了 trong 看了看 ghi hành động đã làm; 又 trong 看了又看 nhấn lặp.'),q('Chọn lời nhờ dùng 把 tự nhiên.',['请把这段话读一读。','请这段话把读。','请把知道这段话。'],0,'Đối tượng xác định 这段话 đứng sau 把, tiếp đến động từ lặp.'),q('Nếu nguồn chỉ nói kiểm hồ sơ, có tự viết 查了又查 như dữ kiện không?',['Có, vì cùng là kiểm','Có, vì câu dài hơn','Không; đã thêm nhiều lần kiểm'],2,'Số lần/thời lượng hành động cũng là nội dung, không tự thêm để vừa cấu trúc.')],
 transfer:'Ở tình huống mới, bạn nhờ đồng nghiệp xem thử bảng này; sau đó kể mình đã đọc qua thư đó. Dùng một câu 请把…看一看 và một câu 把…读了读.',
 model:t('请把这个表看一看。我把那封信读了读。','Qǐng bǎ zhè ge biǎo kàn yi kàn. Wǒ bǎ nà fēng xìn dú le dú.','Hãy xem thử bảng này. Tôi đã đọc qua lá thư ấy.'),rubric:['Đối tượng được xác định: bảng này, thư ấy.','看一看 là lời nhờ, 读了读 là việc đã làm.','Không biến hành động ngắn thành nhiều lần kiểm kỹ.']},
 {row:'hsk4-grammar-row-056',title:'把……V了: đối tượng đã được xử lý',
 note:'Một số động từ có thể đứng với 了 sau 把 để nói xử lý đối tượng xong: 把旧报纸卖了、把门关了. Không suy rằng mọi động từ cứ thêm 了 là tự nhiên; thường cần kết quả/hướng/nơi chốn rõ: 把报告写完了、把书放在桌上了. Phủ định đã làm dùng 没(有) trước 把 và thường bỏ 了: 我没把门关上. 了 đọc le ở đây, khác liǎo trong khả năng 做得了. Hoàn tất một thao tác không chứng minh toàn bộ dự án thành công.',
 examples:[t('我把旧报纸卖了。','Wǒ bǎ jiù bàozhǐ mài le.','Tôi bán chỗ báo cũ rồi.'),t('她把报告写完了。','Tā bǎ bàogào xiě wán le.','Cô ấy viết xong báo cáo rồi.'),t('我没把门关上。','Wǒ méi bǎ mén guān shàng.','Tôi chưa đóng cửa lại.')],
 questions:[q('Chọn vị trí phủ định việc chưa đóng cửa.',['我把没门关上。','我没把门关上。','我把门没了关。'],1,'没 đứng trước 把 để phủ định hành động hoàn tất.'),q('“把报告写完了” cho biết gì?',['Mọi kết luận báo cáo chắc chắn đúng','Dự án chắc chắn thành công','Đã viết xong báo cáo'],2,'Hoàn thành viết không tự chứng minh tính đúng của kết luận.'),q('了 trong 卖了 và 了 trong 卖得了 lần lượt đọc gì?',['le / liǎo','liǎo / le','đều dé'],0,'Thể hoàn thành dùng le; bổ ngữ khả năng 得了 dùng liǎo.')],
 transfer:'Bạn đã tắt đèn nhưng chưa đóng cửa sổ. Viết hai câu 把, một câu khẳng định đã làm và một câu phủ định; không đổi người thực hiện.',
 model:t('我把灯关了，但还没把窗户关上。','Wǒ bǎ dēng guān le, dàn hái méi bǎ chuānghu guān shàng.','Tôi tắt đèn rồi nhưng chưa đóng cửa sổ.'),rubric:['Giữ người thực hiện là tôi.','关了 với đèn đã tắt; 还没把… với cửa chưa đóng.','Không thêm 了 vào cuối câu phủ định hoàn thành này.']}
 ]
};
export function deepenFocusBa47(source){
 const groups=focusBaGroups47[source.targetLessonId];if(!groups)return {content:structuredClone(source),changes:[]};
 const out=structuredClone(source),lessonId=out.targetLessonId;
 if(out.lessonPages.pages.some(p=>p.id.includes(':focus-ba-r47:')))throw Error('Do not replay');
 const block=(id,kind,title,body='',value={})=>({id,kind,title,body,hanzi:'',pinyin:'',meaningVi:'',imageSrc:'',alt:'',provenance:'',...value});
 for(const [i,g] of groups.entries()){
  const pageId=`${lessonId}:v2:grammar:${i}`,idx=out.lessonPages.pages.findIndex(p=>p.id===pageId);
  if(idx<0||!out.sourceGrammarIds.includes(g.row))throw Error('Missing original grammar page/source');
  const original=out.lessonPages.pages[idx],rule=original.blocks[0],example=original.blocks[1],write=original.blocks[2];
  if(!rule.id.endsWith(`grammar-rule:${i}`)||!write.activity)throw Error('Unexpected original page');
  const prefix=`${lessonId}:focus-ba-r47:${i}`;
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

