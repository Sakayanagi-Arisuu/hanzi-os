import {writeFileSync} from 'node:fs';
import {buildAuthoredBatch} from './build-authored-batch';
import type {SurvivalManuscript} from './survival-batch-manuscripts';
import {getRichLessonContent} from '../../src/learning/richLessonContent';
import {emptyLessonBlock,validateLessonPages} from '../../src/learning/lessonPages';
import {validateLessonActivitySources} from '../../src/learning/lessonActivitySources';
const person='hsk2-person-events-environment-lesson-01',event='hsk2-person-events-environment-lesson-02';
const manuscripts:SurvivalManuscript[]=[{
 id:person,focus:'Nhận đúng người rồi hỏi tiếp về thói quen',
 scene:'Hai bạn đọc ba thẻ hồ sơ mô tả một ảnh câu lạc bộ hư cấu: Lý Mai đứng trái, tóc dài; Vương Lan đứng giữa, tóc ngắn và cao hơn Lý Mai; Lưu Phương đứng phải và cao nhất nhóm. Thẻ thông tin ở trang kế tiếp là căn cứ làm bài, ảnh nền chỉ trang trí. Bài mô tả trung tính để nhận diện, không đánh giá ngoại hình đẹp/xấu.',
 support:'照片 zhàopiàn: ảnh · 左边 zuǒbian: bên trái · 中间 zhōngjiān: ở giữa · 右边 yòubian: bên phải · 头发 tóufa: tóc · 短 duǎn: ngắn · 来自 láizì: đến từ · 成都 Chéngdū: Thành Đô · 经常 jīngcháng: thường xuyên.',
 rule:'A比B高 chỉ A cao hơn B; chưa đủ kết luận A cao nhất. 最 cần phạm vi so sánh: 这三个人里，刘芳最高 là Lưu Phương cao nhất trong ba người đang xét. Không suy sở thích hoặc tính cách từ chiều cao.\n头发很长 mô tả tóc dài; 长 đọc cháng trong nghĩa này. 个子高 nói vóc người cao. 小时候 đặt thông tin vào thời thơ ấu, không nhất thiết đúng ở hiện tại. 她小时候住在成都，现在住在北京 tách rõ hai mốc.\n有什么爱好？ hỏi sở thích. 最喜欢… nói thích nhất; 经常/每周… nói thói quen thực tế. Hỏi tiếp bằng 跟谁/什么时候/在哪儿 giúp nối thông tin, thay vì chuyển chủ đề đột ngột. Mọi tên và lai lịch ở đây là vai giả định, không cần khai thông tin cá nhân thật.',
 pitfall:'Cao hơn một người không có nghĩa cao nhất cả nhóm. Người tóc dài bên trái không phải người tóc ngắn ở giữa; không gán lai lịch của người này cho người khác.',
 dialogue:[
 ['左边头发很长的人是李梅吗？','Zuǒbian tóufa hěn cháng de rén shì Lǐ Méi ma?','Người tóc dài bên trái là Lý Mai phải không?'],
 ['对。中间是王兰，她比李梅高。','Duì. Zhōngjiān shì Wáng Lán, tā bǐ Lǐ Méi gāo.','Đúng. Ở giữa là Vương Lan, cô ấy cao hơn Lý Mai.'],
 ['这三个人里，谁最高？','Zhè sān ge rén lǐ, shéi zuì gāo?','Trong ba người này, ai cao nhất?'],
 ['右边的刘芳最高。','Yòubian de Liú Fāng zuì gāo.','Lưu Phương ở bên phải cao nhất.'],
 ['李梅来自哪儿？','Lǐ Méi láizì nǎr?','Lý Mai đến từ đâu?'],
 ['她来自成都，小时候住在成都，现在住在北京。','Tā láizì Chéngdū, xiǎoshíhou zhù zài Chéngdū, xiànzài zhù zài Běijīng.','Cô ấy đến từ Thành Đô, hồi nhỏ sống ở Thành Đô, hiện sống ở Bắc Kinh.'],
 ['她有什么爱好？常跟谁一起运动？','Tā yǒu shénme àihào? Cháng gēn shéi yìqǐ yùndòng?','Cô ấy có sở thích gì? Thường chơi thể thao cùng ai?'],
 ['她最喜欢踢足球，每周六都跟同学一起踢。','Tā zuì xǐhuan tī zúqiú, měi zhōu liù dōu gēn tóngxué yìqǐ tī.','Cô ấy thích đá bóng nhất, thứ bảy hằng tuần đều đá cùng bạn học.'],
 ],question:'Theo đúng nhóm ba người trong bài, câu nào chính xác?',
 choices:[['王兰比李梅高，所以王兰最高。','Cao hơn Lý Mai chưa đủ để cao nhất; đề đã nói Lưu Phương cao nhất.'],['李梅头发很长，刘芳是这三个人里最高的。','Đúng: giữ đúng người tóc dài và người cao nhất trong phạm vi ba người.'],['李梅现在住在成都。','Thành Đô là nơi sống hồi nhỏ; hiện Lý Mai sống ở Bắc Kinh.']],answer:1,
 transfer:'Dùng hồ sơ mới: Trần Minh (陈明 Chén Míng) tóc ngắn, cao hơn Lý Hoa (李华 Lǐ Huá), nhưng Trương Hải (张海 Zhāng Hǎi) cao nhất trong nhóm ba người. Trần Minh hồi nhỏ sống ở Thượng Hải, hiện sống ở Thành Đô, thích bơi nhất và bơi cùng bạn vào chủ nhật. Viết ít nhất sáu lượt để nhận diện, so sánh và hỏi tiếp về lai lịch/thói quen; không suy Trần Minh cao nhất.',
 model:['A：头发很短的人是陈明吗？ B：对，他比李华高。 A：这三个人里，谁最高？ B：张海最高。 A：陈明小时候住在哪儿？现在呢？ B：小时候住在上海，现在住在成都。 A：他最喜欢什么运动？跟谁一起去？ B：他最喜欢游泳，每周日跟朋友一起去。','A: Tóufa hěn duǎn de rén shì Chén Míng ma? B: Duì, tā bǐ Lǐ Huá gāo. A: Zhè sān ge rén lǐ, shéi zuì gāo? B: Zhāng Hǎi zuì gāo. A: Chén Míng xiǎoshíhou zhù zài nǎr? Xiànzài ne? B: Xiǎoshíhou zhù zài Shànghǎi, xiànzài zhù zài Chéngdū. A: Tā zuì xǐhuan shénme yùndòng? Gēn shéi yìqǐ qù? B: Tā zuì xǐhuan yóuyǒng, měi zhōu rì gēn péngyou yìqǐ qù.','Trần Minh tóc ngắn và cao hơn Lý Hoa; Trương Hải cao nhất nhóm. Trần Minh từng sống ở Thượng Hải, hiện ở Thành Đô; thích bơi và đi cùng bạn mỗi chủ nhật.'],
 criteria:['Nhận đúng Trần Minh, không đổi người giữa các câu.','Phân biệt 比 với 最 trong phạm vi ba người.','Tách nơi sống hồi nhỏ và hiện tại.','Nêu môn yêu thích, ngày thường đi và người đi cùng; ít nhất sáu lượt.']
},{
 id:event,focus:'Kể sự việc theo thời gian, nguyên nhân và mức chắc chắn',
 scene:'Lớp học bắt đầu lúc 9:00. B đến lúc 9:10. B đã đợi xe buýt từ 8:20 đến 8:50 rồi chuyển sang taxi. Hai bạn phân biệt dữ kiện đã xảy ra với phỏng đoán về xe và phương án cho lần tới.',
 support:'迟到 chídào: đến muộn · 堵车 dǔchē: tắc đường · 准时 zhǔnshí: đúng giờ · 提前 tíqián: sớm hơn · 半个小时 bàn ge xiǎoshí: nửa giờ · 原因 yuányīn: nguyên nhân. Giờ đến và khoảng đợi là hai loại thông tin khác nhau.',
 rule:'几点 hỏi giờ đồng hồ, 多长时间 hỏi khoảng thời gian. 从八点二十到八点五十 là ba mươi phút, không phải tám giờ năm mươi phút chờ. 等了半个小时 kể thời lượng đã đợi.\n因为…所以… nối nguyên nhân và kết quả; 虽然…但是… nối điều trái kỳ vọng. 虽然我出门很早，但是还是迟到了: ra sớm nhưng vẫn đến muộn. 但 có thể dùng như dạng ngắn của 但是 trong mẫu này.\n可能 chỉ khả năng/phỏng đoán, không biến điều chưa biết thành chắc chắn. 车可能堵在路上了 là đoán; 我不知道 là thừa nhận chưa biết. Lần sau chọn phương tiện khác không đảm bảo tuyệt đối sẽ đúng giờ.\n快要…了 nói sắp xảy ra; 先…再… kể thứ tự. 他跑得很快 dùng 得 sau động từ để bổ sung mức độ; 慢慢地走 dùng 地 trước động từ để mô tả cách làm. Cả 得/地 ở hai mẫu này đọc nhẹ de, vị trí không hoán đổi.',
 pitfall:'Đợi nửa giờ không có nghĩa đến muộn nửa giờ: lớp bắt đầu 9:00, B đến 9:10 nên muộn mười phút. Không bỏ 可能 rồi kể tắc đường như nguyên nhân đã được xác minh.',
 dialogue:[
 ['你今天为什么迟到了？','Nǐ jīntiān wèishénme chídào le?','Hôm nay vì sao bạn đến muộn?'],
 ['我八点二十到车站，等到八点五十，公交车还没来。','Wǒ bā diǎn èrshí dào chēzhàn, děng dào bā diǎn wǔshí, gōngjiāochē hái méi lái.','Tôi đến trạm lúc 8:20, đợi đến 8:50 mà xe buýt vẫn chưa đến.'],
 ['你等了半个小时？后来怎么来的？','Nǐ děngle bàn ge xiǎoshí? Hòulái zěnme lái de?','Bạn đợi nửa giờ à? Sau đó đến bằng cách nào?'],
 ['对，后来我打车来，九点十分到学校。','Duì, hòulái wǒ dǎchē lái, jiǔ diǎn shí fēn dào xuéxiào.','Đúng, sau đó tôi đi taxi, 9:10 đến trường.'],
 ['公交车为什么没来？','Gōngjiāochē wèishénme méi lái?','Vì sao xe buýt không đến?'],
 ['我不知道，可能堵车了。虽然我出门很早，但是还是迟到了。','Wǒ bù zhīdào, kěnéng dǔchē le. Suīrán wǒ chūmén hěn zǎo, dànshì háishi chídào le.','Tôi không biết, có thể tắc đường. Tuy ra khỏi nhà sớm nhưng tôi vẫn đến muộn.'],
 ['下次你准备怎么来？','Xià cì nǐ zhǔnbèi zěnme lái?','Lần sau bạn định đến bằng cách nào?'],
 ['我准备提前出门，坐地铁来，希望能准时到。','Wǒ zhǔnbèi tíqián chūmén, zuò dìtiě lái, xīwàng néng zhǔnshí dào.','Tôi định ra khỏi nhà sớm hơn, đi tàu điện ngầm, mong có thể đến đúng giờ.'],
 ],question:'Câu nào phân biệt đúng thời gian đợi, thời gian muộn và nguyên nhân chưa chắc chắn?',
 choices:[['他等了十分钟，迟到了半个小时。','Đã đảo thời lượng: đợi ba mươi phút, muộn mười phút.'],['公交车一定堵车了。','一定 khẳng định chắc chắn, trong khi người nói chỉ đoán có thể tắc đường.'],['他等了半个小时，迟到了十分钟；公交车可能堵车了。','Đúng: đợi 30 phút, muộn 10 phút; tắc đường chỉ là phỏng đoán.']],answer:2,
 transfer:'Tình huống mới: hẹn 14:00, đến trạm 13:20, đợi tới 13:40 rồi đi taxi, đến điểm hẹn 14:05. Không biết vì sao xe buýt chậm; chỉ đoán có thể tắc đường. Viết ít nhất sáu lượt hỏi/đáp, nói đúng hai mươi phút đợi và năm phút muộn, rồi đề xuất phương án lần tới mà không hứa chắc sẽ đúng giờ.',
 model:['A：你为什么来晚了？ B：我从一点二十等到一点四十，公交车还没来。 A：你等了二十分钟？后来呢？ B：对，后来我打车来，两点零五分到。 A：车为什么没来？ B：我不知道，可能堵车了。 A：下次怎么办？ B：我准备提前出门，希望能准时到。','A: Nǐ wèishénme lái wǎn le? B: Wǒ cóng yī diǎn èrshí děng dào yī diǎn sìshí, gōngjiāochē hái méi lái. A: Nǐ děngle èrshí fēnzhōng? Hòulái ne? B: Duì, hòulái wǒ dǎchē lái, liǎng diǎn líng wǔ fēn dào. A: Chē wèishénme méi lái? B: Wǒ bù zhīdào, kěnéng dǔchē le. A: Xià cì zěnme bàn? B: Wǒ zhǔnbèi tíqián chūmén, xīwàng néng zhǔnshí dào.','Đợi từ 13:20 tới 13:40, đi taxi và tới lúc 14:05; chưa rõ nguyên nhân xe chậm, có thể tắc đường; lần sau định ra sớm hơn và mong đúng giờ.'],
 criteria:['Kể đúng thứ tự đợi xe rồi đi taxi.','Nêu 20 phút đợi và 5 phút muộn, không đổi thành giờ đồng hồ.','Giữ phỏng đoán với 可能, không khẳng định nguyên nhân chưa biết.','Có hỏi tiếp và phương án lần sau; ít nhất sáu lượt.']
}];
// Make the transfer model state lateness explicitly, not just leave it to inference.
manuscripts[1].model[0]=manuscripts[1].model[0].replace('两点零五分到。','两点零五分到，迟到了五分钟。');
manuscripts[1].model[1]=manuscripts[1].model[1].replace('liǎng diǎn líng wǔ fēn dào.','liǎng diǎn líng wǔ fēn dào, chídào le wǔ fēnzhōng.');
manuscripts[1].model[2]+=' Đến muộn năm phút so với hẹn 14:00.';
const examples:Record<string,[string,string,string]>={
 '长':['她的头发很长。','Tā de tóufa hěn cháng.','Tóc của cô ấy rất dài.'],
 '高':['王兰比李梅高。','Wáng Lán bǐ Lǐ Méi gāo.','Vương Lan cao hơn Lý Mai.'],
 '个子':['我小时候个子不高。','Wǒ xiǎoshíhou gèzi bù gāo.','Hồi nhỏ tôi không cao.'],
 '小时候':['她小时候住在成都。','Tā xiǎoshíhou zhù zài Chéngdū.','Hồi nhỏ cô ấy sống ở Thành Đô.'],
 '等':['我在车站等公交车。','Wǒ zài chēzhàn děng gōngjiāochē.','Tôi đợi xe buýt ở trạm.'],
 '但':['我出门很早，但还是迟到了。','Wǒ chūmén hěn zǎo, dàn háishi chídào le.','Tôi ra khỏi nhà sớm nhưng vẫn đến muộn.'],
 '时':['上课时，请不要说话。','Shàngkè shí, qǐng bú yào shuōhuà.','Trong giờ học, xin đừng nói chuyện.'],
 '所以':['公交车没来，所以我打车去了。','Gōngjiāochē méi lái, suǒyǐ wǒ dǎchē qù le.','Xe buýt không đến nên tôi đã đi taxi.'],
 '为什么':['你为什么迟到了？','Nǐ wèishénme chídào le?','Vì sao bạn đến muộn?'],
};
const items=buildAuthoredBatch({level:'hsk2',manuscripts,examples,practiceByLesson:{
 [person]:{pattern:'A 比 B + tính từ',example:['王兰比李梅高。','Wáng Lán bǐ Lǐ Méi gāo.','Vương Lan cao hơn Lý Mai.'],prompt:'Nói Vương Lan cao hơn Lý Mai: 王兰___李梅高。 Điền 比 hoặc 最.',answers:['比'],explanation:'比 nối hai đối tượng so sánh A và B. 最 đứng trước tính từ trong phạm vi đã biết, không đặt giữa hai tên ở mẫu này.'},
 [event]:{pattern:'Khoảng thời gian: 从…到…',example:['我从八点二十等到八点五十。','Wǒ cóng bā diǎn èrshí děng dào bā diǎn wǔshí.','Tôi đợi từ 8:20 đến 8:50.'],prompt:'Từ 8:20 đến 8:50: 我等了___分钟。 Điền số phút bằng chữ Hán.',answers:['三十'],explanation:'8:50 trừ 8:20 là 30 phút. 十 là số phút đến muộn so với giờ học 9:00, không phải thời gian đợi.'},
},answerReadings:{[person]:['Lǐ Méi tóufa hěn cháng, Liú Fāng shì zhè sān ge rén lǐ zuì gāo de.','Lý Mai tóc dài, Lưu Phương cao nhất trong ba người.'],[event]:['Tā děngle bàn ge xiǎoshí, chídàole shí fēnzhōng; gōngjiāochē kěnéng dǔchē le.','Anh ấy đợi nửa giờ và muộn mười phút; xe buýt có thể bị tắc đường.']}});
for(const item of items){
 const isPerson=item.lessonId===person,rich=getRichLessonContent(item.lessonId)!;
 const labels=isPerson?[
 ['李梅','Lǐ Méi','Bên trái · tóc dài','Thấp hơn Vương Lan; hồi nhỏ ở Thành Đô, hiện ở Bắc Kinh.'],
 ['王兰','Wáng Lán','Ở giữa · tóc ngắn','Cao hơn Lý Mai, nhưng không phải cao nhất.'],
 ['刘芳','Liú Fāng','Bên phải · cao nhất','Cao nhất chỉ trong nhóm ba người này.'],
 ]:[['8:20 → 8:50','bā diǎn èrshí → bā diǎn wǔshí','Đợi 30 phút','Dữ kiện đã biết, sau đó đi taxi.'],['9:00 → 9:10','jiǔ diǎn → jiǔ diǎn shí fēn','Muộn 10 phút','So giờ bắt đầu lớp với giờ đến trường.'],['可能堵车了','kěnéng dǔchē le','Có thể tắc đường','Phỏng đoán; nguyên nhân thực tế chưa biết.']];
 item.lessonPages.pages.splice(2,0,{id:`${item.lessonId}:v2:facts`,title:isPerson?'Ba hồ sơ, không đổi đối tượng':'Thời lượng không phải giờ đồng hồ',layout:'focus',stage:'understand',blocks:[{...emptyLessonBlock(`${item.lessonId}:v2:block:facts`),kind:'diagram',title:isPerson?'So sánh trong nhóm đã cho':'Dữ kiện và phỏng đoán',diagram:{type:isPerson?'comparison':'timeline',description:isPerson?'Thẻ hồ sơ thay ảnh: mọi dữ kiện cần để nhận diện đều được ghi rõ.':'Hai khoảng thời gian có mốc riêng; dòng cuối là mức chắc chắn, không phải một mốc giờ.',nodes:labels.map(([label,pinyin,meaningVi,note],i)=>({id:`fact-${i}`,label,pinyin,meaningVi,note,x:i,y:0}))}}]});
 for(const page of item.lessonPages.pages)for(const block of page.blocks)if(block.activity){
  const guided=block.id.endsWith(':guided');
  block.activity.learningTarget={skill:'grammar',objective:guided?(isPerson?'So sánh hai người bằng 比.':'Tính đúng thời lượng đợi từ mốc giờ.'):isPerson?'Giữ đúng đối tượng, so sánh và hỏi tiếp lai lịch/thói quen.':'Kể sự việc theo thứ tự, tách thời lượng và mức chắc chắn.',sources:[{kind:guided?'grammar':'task',id:guided?rich.grammar[0].id:rich.tasks[0].id}]};
 }
 const errors=[...validateLessonPages(item.lessonPages),...validateLessonActivitySources(item.lessonId,item.lessonPages)];if(errors.length)throw Error(errors.join('\n'));
}
writeFileSync('content/drafts/thien-lo-hsk2-person-events-v2.json',JSON.stringify({schemaVersion:1,humanReviewed:false,status:'draft-not-published',items},null,2)+'\n');
console.log(items.map(item=>({lesson:item.lessonId,pages:item.lessonPages.pages.length,published:false})));
