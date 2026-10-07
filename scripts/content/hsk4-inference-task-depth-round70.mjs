const T=(hanzi,pinyin,meaningVi)=>({hanzi,pinyin,meaningVi});
const tables={
 '01':[
 T('道路：事故报告减少，但车流和报告方式也变了。','Dàolù: shìgù bàogào jiǎnshǎo, dàn chēliú hé bàogào fāngshì yě biàn le.','Đường: số báo cáo tai nạn giảm, nhưng lưu lượng và cách báo cũng đổi.'),
 T('机场：平均时间缩短，但问卷没有包括错过航班的人。','Jīchǎng: píngjūn shíjiān suōduǎn, dàn wènjuàn méiyǒu bāokuò cuòguò hángbān de rén.','Sân bay: thời gian trung bình ngắn hơn, nhưng bảng hỏi không gồm người lỡ chuyến.'),
 T('学校：运动人数增加，但操场和器材条件也改善了。','Xuéxiào: yùndòng rénshù zēngjiā, dàn cāochǎng hé qìcái tiáojiàn yě gǎishàn le.','Trường: số người vận động tăng, nhưng điều kiện sân và dụng cụ cũng cải thiện.'),
 T('冠军：日记支持长期训练，却不支持每天都练四小时。','Guànjūn: rìjì zhīchí chángqī xùnliàn, què bù zhīchí měi tiān dōu liàn sì xiǎoshí.','Nhà vô địch: nhật ký hỗ trợ việc tập lâu dài, nhưng không hỗ trợ ngày nào cũng tập bốn giờ.')],
 '02':[
 T('球队：第三场失败；休息较短，战术调整也较慢。','Qiúduì: dì sān chǎng shībài; xiūxi jiào duǎn, zhànshù tiáozhěng yě jiào màn.','Đội: thua trận thứ ba; thời gian nghỉ ngắn hơn, điều chỉnh chiến thuật cũng chậm hơn.'),
 T('运动计划：固定参与者的评价上升，退出者却没有再次接受采访。','Yùndòng jìhuà: gùdìng cānyùzhě de píngjià shàngshēng, tuìchūzhě què méiyǒu zàicì jiēshòu cǎifǎng.','Chương trình: đánh giá của người tham gia đều tăng, nhưng người bỏ cuộc không được phỏng vấn lại.'),
 T('古城：主墙约九百年是近似说法，不能用于整个遗址。','Gǔchéng: zhǔ qiáng yuē jiǔ bǎi nián shì jìnsì shuōfǎ, bù néng yòng yú zhěng ge yízhǐ.','Thành cổ: tường chính khoảng 900 năm là cách nói gần đúng, không áp dụng cho toàn di tích.'),
 T('游记：院子存在有档案支持，但大小和气氛仍需其他材料。','Yóujì: yuànzi cúnzài yǒu dàng’àn zhīchí, dàn dàxiǎo hé qìfēn réng xū qítā cáiliào.','Du ký: hồ sơ hỗ trợ việc sân tồn tại, nhưng kích thước và không khí còn cần tư liệu khác.')],
};
const refutations={
 '01':T('不能说新措施在任何情况下都有效。机场首月平均时间缩短十五分钟，但问卷只发给成功转机者，当月客流也较少。学校运动人数增加时，操场开放和器材便利也同时出现。因此两项结果值得继续观察，却还不能确定措施的独立效果。建议补记错过航班的人，并在学校分班比较，同时保持器材政策不变。','Bù néng shuō xīn cuòshī zài rènhé qíngkuàng xià dōu yǒuxiào. Jīchǎng shǒu yuè píngjūn shíjiān suōduǎn shíwǔ fēnzhōng, dàn wènjuàn zhǐ fā gěi chénggōng zhuǎnjī zhě, dàngyuè kèliú yě jiào shǎo. Xuéxiào yùndòng rénshù zēngjiā shí, cāochǎng kāifàng hé qìcái biànlì yě tóngshí chūxiàn. Yīncǐ liǎng xiàng jiéguǒ zhídé jìxù guānchá, què hái bù néng quèdìng cuòshī de dúlì xiàoguǒ. Jiànyì bǔ jì cuòguò hángbān de rén, bìng zài xuéxiào fēn bān bǐjiào, tóngshí bǎochí qìcái zhèngcè bú biàn.','Không thể nói biện pháp mới hiệu quả trong mọi tình huống. Tháng đầu, thời gian trung bình ở sân bay giảm 15 phút, nhưng bảng hỏi chỉ phát cho người chuyển chuyến thành công và lưu lượng tháng đó cũng thấp hơn. Khi số người vận động ở trường tăng, sân mở lại và dụng cụ thuận tiện cũng đồng thời xuất hiện. Hai kết quả đáng theo dõi, nhưng chưa xác định được tác động riêng của biện pháp. Đề nghị ghi thêm người lỡ chuyến và so theo lớp ở trường, đồng thời giữ chính sách dụng cụ.'),
 '02':T('不能把“经验不足”当作球队失败的唯一原因，也不能用一篇旧游记重建完整寺庙。球队第三场只有十八小时休息，录像还显示战术调整较慢。游记写院子很宽，但维修清单没有尺寸，另一位游客对气氛的描述也不同。因此应保留比赛结果和院子存在这些信息，再比较休息、战术和其他历史材料，不能把解释直接写成事实。','Bù néng bǎ “jīngyàn bù zú” dàng zuò qiúduì shībài de wéiyī yuányīn, yě bù néng yòng yì piān jiù yóujì chóngjiàn wánzhěng sìmiào. Qiúduì dì sān chǎng zhǐ yǒu shíbā xiǎoshí xiūxi, lùxiàng hái xiǎnshì zhànshù tiáozhěng jiào màn. Yóujì xiě yuànzi hěn kuān, dàn wéixiū qīngdān méiyǒu chǐcùn, lìng yí wèi yóukè duì qìfēn de miáoshù yě bùtóng. Yīncǐ yīng bǎoliú bǐsài jiéguǒ hé yuànzi cúnzài zhèxiē xìnxī, zài bǐjiào xiūxi, zhànshù hé qítā lìshǐ cáiliào, bù néng bǎ jiěshì zhíjiē xiě chéng shìshí.','Không thể coi thiếu kinh nghiệm là nguyên nhân duy nhất của thất bại, cũng không thể dùng một du ký cũ phục dựng đầy đủ chùa. Trước trận ba, đội chỉ nghỉ 18 giờ; video còn cho thấy điều chỉnh chiến thuật chậm. Du ký nói sân rộng, nhưng danh sách sửa chữa không có kích thước và du khách khác tả không khí khác. Cần giữ dữ kiện kết quả thi đấu và sân tồn tại, rồi so thời gian nghỉ, chiến thuật và tư liệu lịch sử khác; không viết diễn giải thành sự thật.'),
 '03':T('观众增加并不能证明角色介绍最有效，咳嗽报告减少也不能证明新清洗用品有效。剧院的介绍、降价和报道在同一月开始；理发店的记录只包括主动反映的客人，两周内又多雨，店门大多关闭。因此多个条件可能共同影响结果。建议剧院分周比较不同措施，理发店保持同一记录方法，并补记天气和门窗状态，再判断各自的效果。','Guānzhòng zēngjiā bìng bù néng zhèngmíng juésè jièshào zuì yǒuxiào, késou bàogào jiǎnshǎo yě bù néng zhèngmíng xīn qīngxǐ yòngpǐn yǒuxiào. Jùyuàn de jièshào, jiàngjià hé bàodào zài tóng yí ge yuè kāishǐ; lǐfàdiàn de jìlù zhǐ bāokuò zhǔdòng fǎnyìng de kèrén, liǎng zhōu nèi yòu duō yǔ, diàn mén dàduō guānbì. Yīncǐ duō ge tiáojiàn kěnéng gòngtóng yǐngxiǎng jiéguǒ. Jiànyì jùyuàn fēn zhōu bǐjiào bùtóng cuòshī, lǐfàdiàn bǎochí tóng yì jìlù fāngshì, bìng bǔ jì tiānqì hé ménchuāng zhuàngtài, zài pànduàn gèzì de xiàoguǒ.','Khán giả tăng không chứng minh giới thiệu vai hiệu quả nhất; báo cáo ho giảm cũng không chứng minh chất giặt mới hiệu quả. Giới thiệu, giảm giá và đưa tin bắt đầu cùng tháng. Tiệm chỉ ghi khách chủ động phản ánh; trong hai tuần còn mưa nhiều và cửa thường đóng. Nhiều điều kiện có thể cùng ảnh hưởng kết quả. Đề nghị nhà hát so biện pháp theo tuần; tiệm giữ cùng cách ghi và ghi thêm thời tiết, trạng thái cửa, rồi đánh giá tác động của từng biện pháp.')
};
export function correctInferenceTasks70(source){
 const content=structuredClone(source),changes=[],id=content.targetLessonId;
 if(!/^hsk4-inference-evidence-check-lesson-0[123]$/.test(id))return {content,changes};
 const suffix=id.slice(-2),blocks=content.lessonPages.pages.flatMap(p=>p.blocks);
 const edit=(b,key,value)=>{if(b[key]===value)return;changes.push({id:b.id,field:key,before:b[key],after:value});b[key]=value;};
 for(const page of content.lessonPages.pages)if(page.title.includes('hiểu cổ tích'))edit(page,'title',page.title.replace('hiểu cổ tích','hiểu di tích'));
 for(const b of blocks){if(!b.activity)continue;
  const activity=structuredClone(b.activity);
  activity.explanation=activity.explanation.replaceAll('但样本只含成功转机者','但问卷只发给成功转机者').replaceAll('nhưng mẫu chỉ có người chuyển thành công','nhưng bảng hỏi chỉ phát cho người chuyển chuyến thành công');
  activity.rubric=activity.rubric.map(r=>({...r,label:r.label.replace('kết luận nghe','kết luận từ transcript'),guidance:r.guidance.replace('kết luận nghe','kết luận từ transcript')}));
  activity.explanation=activity.explanation.replaceAll('理发店咳嗽减少也是真的','理发店的咳嗽报告似乎减少了').replaceAll('ho ở tiệm giảm cũng thật','báo cáo ho ở tiệm có vẻ giảm').replaceAll('四个来源都含积极变化，却没有一个能单独证明唯一原因。','前三个来源报告了一些积极变化，第四个来源比较了冠军的回忆和日记；它们都需要保留证据的范围。').replaceAll('Cả bốn nguồn có thay đổi tích cực nhưng không nguồn nào tự chứng minh nguyên nhân duy nhất.','Ba nguồn đầu báo một số thay đổi tích cực; nguồn thứ tư đối chiếu hồi ức nhà vô địch và nhật ký. Cả bốn cần giữ phạm vi bằng chứng.');
  if(b.id.endsWith(':task:2')&&tables[suffix]){
   edit(b,'body','Lập bảng bốn hàng, mỗi hàng cho một nguồn. Ghi bốn cột: nhận định ban đầu, đoạn bằng chứng, cách giải thích khác hoặc thông tin còn thiếu, kết luận đã thu hẹp. Sau đó chọn một hàng và viết lại nhận định quá mạnh. Không cần ép bảng vào một đoạn văn 100–180 chữ.');
   activity.learningTarget.objective='Đối chiếu riêng bốn nguồn trong bảng và sửa một nhận định vượt bằng chứng.';
   activity.explanation='Khung bảng: Nhận định | Bằng chứng (nguồn, đoạn) | Thông tin khác/còn thiếu | Kết luận thu hẹp.\nMột số ý để điền sau khi tự làm:\n'+tables[suffix].map(t=>`${t.hanzi}\n${t.pinyin}\n${t.meaningVi}`).join('\n\n')+'\nHãy ghi số đoạn cho từng hàng và viết lại một nhận định. Đây là tự đối chiếu, không phải điểm viết độc lập.';
   activity.rubric=['Mỗi nguồn một hàng, không gộp các trường hợp thành một số chung.','Ghi nguồn và đoạn cho dữ kiện.','Phân biệt dữ kiện, cách giải thích có thể và điều chưa biết.','Viết lại một nhận định với phạm vi phù hợp.'].map((label,n)=>({id:`criterion-${n}`,label,guidance:label}));
  }
  const last=suffix==='03'?5:6;
  if(b.id.endsWith(`:task:${last}`)){
   const citations=suffix==='01'?'Nguồn 2 (sân bay) và Nguồn 3 (trường học)':suffix==='02'?'Nguồn 1 (đội bóng) và Nguồn 4 (du ký)':'Nguồn 1 (hí khúc) và Nguồn 4 (tiệm cắt tóc)';
   edit(b,'body',`Dùng ${citations}, viết 100–180 chữ Hán để sửa hai nhận định quá mạnh. Gồm bốn phần: nêu nhận định cần sửa; giữ dữ kiện đúng và ghi đoạn nguồn; chỉ ra thông tin còn thiếu hoặc cách giải thích khác; kết luận có điều kiện và đề xuất cách kiểm tra. Không cần dùng các nguồn còn lại. Tự đếm chữ Hán, không tính dấu câu.`);
   activity.learningTarget.objective='Bác hai nhận định vượt nguồn, giữ dữ kiện đúng và viết kết luận có điều kiện từ hai nguồn được chỉ định.';
   const m=refutations[suffix];const count=[...m.hanzi].filter(c=>/\p{Script=Han}/u.test(c)).length;if(count<100||count>180)throw Error(`Model length ${suffix}: ${count}`);
   activity.explanation=`Một bản tham khảo (${count} chữ Hán, không tính dấu câu):\n${m.hanzi}\n${m.pinyin}\n${m.meaningVi}\nTự ghi số đoạn cho từng dữ kiện và sửa bản đầu. Đề xuất kiểm tra là việc cần làm, không phải kết quả đã có; đây là tự luyện.`;
   activity.rubric=['Dùng đúng hai nguồn được chỉ định và chỉ ra hai nhận định cần sửa.','Giữ dữ kiện quan sát đúng mức chắc chắn, kèm số đoạn.','Chỉ ra thông tin còn thiếu hoặc điều kiện khác, không kết luận nguyên nhân riêng.','Nêu kết luận thu hẹp và đề xuất kiểm tra chưa thực hiện.','Viết 100–180 chữ Hán; tự sửa sau khi đối chiếu.'].map((label,n)=>({id:`criterion-${n}`,label,guidance:label}));
  }
  edit(b,'activity',activity);
 }
 content.review={...content.review,humanReviewed:false};return {content,changes};
}
