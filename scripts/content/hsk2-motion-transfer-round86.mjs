const t=(hanzi,pinyin,meaningVi)=>({hanzi,pinyin,meaningVi});
const block=(id,kind,title,body='',extra={})=>({id,kind,title,body,hanzi:'',pinyin:'',meaningVi:'',imageSrc:'',alt:'',provenance:'',...extra});
const groups={
 '01':[
 ['022','Nêu hướng của người đi','Bạn chỉ đường từ cổng: đi về phía trái, rồi đi thẳng ba phút. Viết hai bước với 往.',t('往左走，再往前走三分钟。','Wǎng zuǒ zǒu, zài wǎng qián zǒu sān fēnzhōng.','Đi về phía trái, rồi đi thẳng về phía trước ba phút.'),'往左走 có nói người đó đang đứng ở bên trái không?',['Có, chỉ vị trí đứng','Không, chỉ hướng di chuyển','Có, luôn là trái màn hình'],1,'往 nêu hướng đi; 在左边 mới nêu vị trí ở bên trái.',['往 đứng trước hướng, động từ đi sau.','Giữ trình tự và ba phút, không tự thêm đã tới.']],
 ['023','Điểm xuất phát khác nơi đến','Bạn đi từ nhà đến trường, không nêu phương tiện. Viết với 从…到….',t('我从家走到学校。','Wǒ cóng jiā zǒu dào xuéxiào.','Tôi đi bộ từ nhà đến trường.'),'我从学校走到商店。 Đâu là điểm xuất phát?',['商店','学校','Không xác định được'],1,'从学校 là từ trường; 到商店 là đến cửa hàng.',['从家 nêu điểm xuất phát, 到学校 nêu nơi đến.','走 thể hiện đi bộ; không đổi chiều thành từ trường về nhà.']],
 ['034','Đọc hết khác hiểu hết','Bạn đã đọc xong bài nhưng có hai câu chưa hiểu. Viết hai ý với 看完 và 看懂.',t('我看完了，但是有两句话没看懂。','Wǒ kànwán le, dànshì yǒu liǎng jù huà méi kàndǒng.','Tôi đã đọc xong, nhưng có hai câu chưa hiểu.'),'Đã đọc hết mà chưa hiểu, câu nào phù hợp?',['看完了，但是没看懂。','没看完，所以一定看懂了。','看完了 nên chắc không có câu khó'],0,'完 chỉ hoàn tất lượng đọc; 懂 chỉ kết quả hiểu.',['Giữ đã đọc xong và hai câu chưa hiểu.','没看懂 không dùng 不看懂 để kể kết quả chưa đạt.']],
 ['036','Một người, hai hành động','Bạn đến bệnh viện thăm bạn, không nói bạn đến thăm mình. Viết chuỗi 去…看….',t('我去医院看朋友。','Wǒ qù yīyuàn kàn péngyou.','Tôi đến bệnh viện thăm bạn.'),'我去商店买水果。 Ai đi và ai mua?',['Tôi đi, cửa hàng mua','Tôi thực hiện cả hai','Một người chưa rõ mua'],1,'Chủ thể 我 thực hiện cả 去 và 买; 商店 chỉ nơi đến.',['医院 là nơi đến, 看朋友 là mục đích.','Không tự đổi người thực hiện động từ sau.']],
 ['037','Giữ người được yêu cầu','Giáo viên bảo chị đọc câu hỏi; chị là người đọc. Viết với 让.',t('老师让姐姐读这个问题。','Lǎoshī ràng jiějie dú zhège wèntí.','Giáo viên bảo chị đọc câu hỏi này.'),'妈妈请哥哥开门。 Ai mở cửa?',['Mẹ','Anh trai','Không ai vì 请 chỉ tặng vật'],1,'哥哥 nhận lời nhờ và thực hiện 开门; 妈妈 là người nhờ.',['老师 yêu cầu, 姐姐 đọc.','Không đổi thành giáo viên tự đọc.']],
 ['045','Hoàn thành không bảo đảm đúng','Bạn làm xong bài tập nhưng làm sai một câu. Viết với 做完 và 做错.',t('我做完作业了，但是做错了一道题。','Wǒ zuòwán zuòyè le, dànshì zuòcuò le yí dào tí.','Tôi đã làm xong bài tập, nhưng làm sai một câu.'),'学会游泳 nêu kết quả nào?',['Học được cách bơi','Học xong mọi môn','Chắc chắn bơi nhanh nhất'],0,'会 trong 学会 là đạt kỹ năng; không nêu tốc độ hay hoàn tất mọi môn.',['做完 là xong bài; 做错 là kết quả sai.','Giữ một câu sai, không tự suy tất cả đều sai.']]
 ],
 '02':[
 ['046','Hướng theo vị trí người nói','Bạn ở cổng, em trai chạy từ sân về phía bạn. Viết câu dùng 来; giữ điểm nhìn đã cho.',t('弟弟向我跑来。','Dìdi xiàng wǒ pǎolái.','Em trai chạy về phía tôi.'),'Tôi đứng ở cổng, người kia chạy rời xa tôi. Chọn mô tả theo điểm nhìn này.',['他跑来了。','他跑去了。','来/去 luôn thay nhau được'],1,'去 là xa điểm quy chiếu đã cho; 来 là hướng về điểm đó.',['Em trai chạy về phía tôi, dùng 来.','Không đổi thành chạy xa khỏi cổng.']],
 ['047','Hướng vào khác hướng ra','Học sinh từ ngoài bước vào lớp rồi ngồi xuống. Viết với 走进 và 坐下.',t('学生走进教室，然后坐下。','Xuésheng zǒujìn jiàoshì, ránhòu zuòxia.','Học sinh đi vào lớp, rồi ngồi xuống.'),'走过桥 và 走回家 có cùng hướng không?',['Có, đều nhất thiết quay về nhà','Không, qua cầu khác quay về nhà','Có, đều đi lên tầng'],1,'过 nêu đi qua, 回 nêu trở về; không suy cùng điểm đến.',['走进 là từ ngoài vào lớp.','坐下 là ngồi xuống, không đổi thành 站起来.']],
 ['048','Tuyến đường và điểm nhìn','Bạn ở trong phòng; bạn của bạn từ ngoài chạy vào phía bạn. Viết với 进来. Sau đó người bạn ngồi nghỉ rồi đứng dậy; kể bước cuối bằng 站起来.',t('朋友跑进来了。他坐了一会儿，然后站起来了。','Péngyou pǎo jìnlái le. Tā zuò le yíhuìr, ránhòu zhàn qǐlái le.','Bạn chạy vào đây. Người ấy ngồi một lát, rồi đứng dậy.'),'Trong 站起来, 起来 có buộc nghĩa đi về phía người nói không?',['Có, mọi 来 đều là đi tới người nói','Không, cả cụm có nghĩa đứng dậy','Có, nghĩa chạy ra ngoài'],1,'起来 trong 站起来 diễn tả chuyển sang tư thế đứng; học nghĩa của cả cụm.',['进来 giữ hướng từ ngoài vào phía tôi ở trong phòng.','站起来 là đứng dậy; cần ngữ cảnh người ấy đã ngồi hoặc nằm.']],
 ['063','Mời khác tự thực hiện','Bạn mời khách ngồi xuống và nhờ em trai lấy nước. Viết hai câu với 请 và 让.',t('我请客人坐下，让弟弟拿水。','Wǒ qǐng kèrén zuòxia, ràng dìdi ná shuǐ.','Tôi mời khách ngồi xuống, bảo em trai lấy nước.'),'我请你喝茶。 Ai uống trà trong lời mời?',['Tôi','Bạn','Trà'],1,'你 là người được mời và thực hiện 喝; 我 đưa lời mời.',['Khách ngồi, em trai lấy nước.','Giữ Tôi là người đưa lời mời/yêu cầu.']],
 ['064','Người tặng, người nhận, vật','Chị tặng em trai hai quyển sách; bạn không phải người nhận. Viết với 送给.',t('姐姐送给弟弟两本书。','Jiějie sònggěi dìdi liǎng běn shū.','Chị tặng em trai hai quyển sách.'),'哥哥送给妈妈一件衣服。 Ai nhận và nhận gì?',['Anh nhận áo từ mẹ','Mẹ nhận một chiếc áo từ anh','Mẹ nhận một quyển sách'],1,'哥哥 tặng; 妈妈 nhận; 一件衣服 là vật được tặng.',['姐姐 tặng, 弟弟 nhận.','Giữ 两本书, không dùng 两个书.']]
 ]
};
export function deepenMotion86(source){
 const content=structuredClone(source),changes=[],id=content.targetLessonId;
 const suffix=id?.startsWith('hsk2-complements-and-motion-lesson-')?id.slice(-2):null;
 if(!groups[suffix])return {content,changes};
 const pages=content.lessonPages.pages;
 if(pages.some(p=>p.blocks.some(b=>b.id.includes(':r86:'))))throw Error('Do not replay');
 for(const[row,title,prompt,model,question,options,answer,explanation,criteria]of groups[suffix]){
  const grammar=`hsk2-grammar-row-${row}`,prefix=`${id}:r86:${row}`,target={objective:title,skill:'grammar',sources:[{id:grammar,kind:'grammar'}]};
  const page=pages.find(p=>p.id.endsWith(`grammar:${grammar}:practice`));if(!page)throw Error('Missing practice page');
  page.blocks.push(block(`${prefix}:choice`,'activity','Phân biệt ý nghĩa',question,{activity:{type:'choice',options:options.map((text,i)=>({id:`o-${i}`,text,feedback:i===answer?explanation:'Đối chiếu người thực hiện, hướng và kết quả đã cho.'})),answerIds:[`o-${answer}`],acceptedAnswers:[],rubric:[],hint:'',explanation,learningTarget:target}}));
  page.blocks.push(block(`${prefix}:transfer`,'activity','Vận dụng trong cảnh mới',prompt,{activity:{type:'rubric',options:[],answerIds:[],acceptedAnswers:[],hint:'',explanation:`Một cách diễn đạt:\n${model.hanzi}\n${model.pinyin}\n${model.meaningVi}\nTự đối chiếu chưa phải điểm nói/viết độc lập.`,rubric:criteria.map((label,i)=>({id:`r-${i}`,label,guidance:label})),learningTarget:{...target,skill:'writing'}}}));
  changes.push({grammar,newChoice:1,newTransfer:1});
 }
 if(suffix==='01'){
  const g=content.grammar[1];g.guidedPractice={promptVi:'Dùng 从…到…: Tôi đi bộ từ nhà đến trường.',modelAnswerHanzi:'我从家走到学校。',modelAnswerPinyin:'Wǒ cóng jiā zǒu dào xuéxiào.',modelAnswerMeaningVi:'Tôi đi bộ từ nhà đến trường.'};
  pages.find(p=>p.id.endsWith('grammar:hsk2-grammar-row-023:understand')).blocks.push(block(`${id}:r86:023:sample`,'dialogue','Nối điểm xuất phát với nơi đến','',t('我从家走到学校。','Wǒ cóng jiā zǒu dào xuéxiào.','Tôi đi bộ từ nhà đến trường.')));
  changes.push({grammar:'hsk2-grammar-row-023',guidedPracticeCorrection:true});
 }
 content.review={...content.review,humanReviewed:false};return {content,changes};
}
