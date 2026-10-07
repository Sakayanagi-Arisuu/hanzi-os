import {writeFileSync} from 'node:fs';
import {buildAuthoredBatch} from './build-authored-batch';
import type {SurvivalManuscript} from './survival-batch-manuscripts';
import {getRichLessonContent} from '../../src/learning/richLessonContent';
import {emptyLessonBlock,validateLessonPages} from '../../src/learning/lessonPages';
import {validateLessonActivitySources} from '../../src/learning/lessonActivitySources';

const travel='hsk2-travel-leisure-lesson-03',leisure='hsk2-travel-leisure-lesson-04';
const manuscripts:SurvivalManuscript[]=[{
 id:travel,focus:'Tách việc đã làm, kế hoạch sắp tới và trải nghiệm',
 scene:'Hôm nay là thứ sáu. B đã mua vé máy bay cho chuyến đi thứ bảy tuần sau, nhưng chưa đi. Hai bạn kiểm tra cách đến sân bay và hỏi kinh nghiệm lần trước. Giờ trong bài là dữ kiện giả định để luyện tiếng, không phải hướng dẫn giờ ra sân bay thực tế.',
 support:'下周六 xià zhōu liù: thứ bảy tuần sau · 已经 yǐjīng: đã · 还没 hái méi: vẫn chưa · 准备 zhǔnbèi: dự định/chuẩn bị · 小时 xiǎoshí: giờ (khoảng thời gian) · 杭州 Hángzhōu: Hàng Châu.',
 rule:'我下周六去杭州旅游 nói kế hoạch tương lai. 我已经买好机票了 nói việc mua vé đã hoàn tất trước lúc nói. Ghép hai câu này được, nhưng không đặt 下周 trực tiếp trước 已经买好 rồi hiểu rằng việc mua vé vừa ở tương lai vừa đã xong.\n你去过杭州吗？ hỏi đã từng đến Hàng Châu hay chưa, không hỏi lịch chuyến tới. 我去过/我没去过 trả lời về trải nghiệm. Với phủ định trải nghiệm dùng 没 + động từ + 过, không dùng 不去过. 过 ở đây đọc nhẹ guo.\n坐地铁/坐公交车 mô tả phương tiện; 打车 là đi taxi. 从车站走路到酒店 diễn tả đoạn đường bộ. 到机场 là đến sân bay, không đồng nghĩa chuyến bay cất cánh. 觉得… mô tả cảm nhận, không phải dữ kiện đúng cho mọi người.',
 pitfall:'Đã mua vé không có nghĩa đã đi; từng đến nơi đó không có nghĩa chuyến sắp tới đã hoàn thành. Đừng lấy cảm nhận “chậm” của một lần đi làm đặc tính cố định của mọi tuyến xe.',
 dialogue:[
 ['你什么时候去杭州旅游？','Nǐ shénme shíhou qù Hángzhōu lǚyóu?','Bạn khi nào đi du lịch Hàng Châu?'],
 ['下周六。我已经买好机票了。','Xià zhōu liù. Wǒ yǐjīng mǎihǎo jīpiào le.','Thứ bảy tuần sau. Tôi đã mua vé máy bay rồi.'],
 ['你怎么去机场？','Nǐ zěnme qù jīchǎng?','Bạn đến sân bay bằng cách nào?'],
 ['我准备坐地铁去，八点到机场。','Wǒ zhǔnbèi zuò dìtiě qù, bā diǎn dào jīchǎng.','Tôi định đi tàu điện ngầm, tám giờ đến sân bay.'],
 ['你去过杭州吗？','Nǐ qùguo Hángzhōu ma?','Bạn đã từng đến Hàng Châu chưa?'],
 ['去过。上次我坐公交车去酒店，路上用了一个小时，我觉得有点儿慢。','Qùguo. Shàng cì wǒ zuò gōngjiāochē qù jiǔdiàn, lùshang yòngle yí ge xiǎoshí, wǒ juéde yǒudiǎnr màn.','Từng đến rồi. Lần trước tôi đi xe buýt đến khách sạn, trên đường mất một giờ; tôi thấy hơi chậm.'],
 ['这次酒店离车站远吗？','Zhè cì jiǔdiàn lí chēzhàn yuǎn ma?','Lần này khách sạn có xa nhà ga không?'],
 ['不远，从车站走路十分钟就到。','Bù yuǎn, cóng chēzhàn zǒulù shí fēnzhōng jiù dào.','Không xa, từ nhà ga đi bộ mười phút là đến.'],
 ],
 question:'Hôm nay thứ sáu, chuyến đi vào thứ bảy tuần sau. Tóm tắt nào giữ đúng việc đã xong và kế hoạch?',
 choices:[['他已经到杭州了。','Người nói chỉ đã mua vé, chưa nói đã đến Hàng Châu trong chuyến này.'],['他已经买好机票了，下周六坐地铁去机场。','Đúng: mua vé đã xong; đến sân bay là kế hoạch tuần sau.'],['他下周六走路去机场。','Đi bộ mười phút là từ nhà ga đến khách sạn, không phải đến sân bay.']],answer:1,
 transfer:'Đóng vai người chưa từng đến Bắc Kinh (北京 Běijīng). Bạn sẽ đi chủ nhật tuần sau, vé đã mua, định đi taxi đến sân bay lúc 7:00. Khách sạn cách nhà ga năm phút đi bộ. Viết ít nhất sáu lượt hỏi/đáp, có câu hỏi trải nghiệm và câu trả lời phủ định. Không bịa cảm nhận của chuyến chưa đi; có thể nói điều mình mong đợi.',
 model:['A：你去过北京吗？ B：我没去过。 A：你什么时候去？ B：下周日，机票已经买好了。 A：怎么去机场？ B：我准备打车去，七点到机场。 A：酒店离车站远吗？ B：不远，走路五分钟就到。','A: Nǐ qùguo Běijīng ma? B: Wǒ méi qùguo. A: Nǐ shénme shíhou qù? B: Xià zhōu rì, jīpiào yǐjīng mǎihǎo le. A: Zěnme qù jīchǎng? B: Wǒ zhǔnbèi dǎchē qù, qī diǎn dào jīchǎng. A: Jiǔdiàn lí chēzhàn yuǎn ma? B: Bù yuǎn, zǒulù wǔ fēnzhōng jiù dào.','A hỏi đã từng đến Bắc Kinh, thời gian, cách đến sân bay và khoảng cách khách sạn. B chưa từng đến; đi chủ nhật tuần sau, vé đã mua; đi taxi, đến sân bay lúc 7:00; từ nhà ga đi bộ năm phút đến khách sạn.'],
 criteria:['Tách rõ chưa từng đi, đã mua vé và chuyến sắp tới.','Dùng 没去过 để phủ định trải nghiệm.','Giữ đúng chủ nhật tuần sau, taxi và giờ đến sân bay 7:00.','Đoạn đi bộ năm phút nối nhà ga với khách sạn; ít nhất sáu lượt có hỏi tiếp.']
},{
 id:leisure,focus:'Chọn hoạt động phù hợp cả sở thích lẫn khả năng',
 scene:'Hai bạn đang bàn hoạt động chiều thứ bảy. A thích bơi nhưng B chưa biết bơi. B thích bóng đá hơn bóng rổ; cả hai biết đá bóng. Cần chốt việc có thể làm cùng nhau, không chỉ kể sở thích.',
 support:'会 huì: biết làm (kỹ năng đã học) · 还不会 hái bú huì: vẫn chưa biết · 觉得 juéde: cảm thấy/cho rằng · 公园 gōngyuán: công viên · 拿 ná: cầm/lấy · 一边…一边… yìbiān…yìbiān…: vừa…vừa… (chỉ giới thiệu qua ví dụ).',
 rule:'喜欢 nói sở thích, 会 nói biết làm. 我喜欢游泳 không tự chứng minh 我会游泳. Có thể nói 我喜欢游泳，但是还不会 để phân biệt mong muốn với kỹ năng.\n踢足球 là đá bóng; 打篮球 là chơi bóng rổ; không hoán đổi 踢 và 打 trong các cụm cơ bản này. 跑步、游泳、跳舞 là các hoạt động. A比B有意思 diễn tả A thú vị hơn B theo đánh giá người nói, không có nghĩa B hoàn toàn chán.\n我拿着球等你: 拿着 mô tả trạng thái vẫn cầm bóng trong khi đợi. 着 ở đây đọc nhẹ zhe, không phải zháo trong 着急. 不会游泳 chỉ kỹ năng chưa biết; 不想游泳 chỉ không muốn bơi lúc này. 上网 là hoạt động lên mạng, 在网上 là ở/trên mạng.',
 pitfall:'Không chốt đi bơi chỉ vì một người thích bơi khi người kia nói chưa biết bơi. 喜欢/会/想 trả lời ba câu hỏi khác nhau: thích gì, biết làm gì, muốn làm gì.',
 dialogue:[
 ['周六下午一起去游泳吧？','Zhōu liù xiàwǔ yìqǐ qù yóuyǒng ba?','Chiều thứ bảy cùng đi bơi nhé?'],
 ['我喜欢游泳，但是还不会。你会踢足球吗？','Wǒ xǐhuan yóuyǒng, dànshì hái bú huì. Nǐ huì tī zúqiú ma?','Tôi thích bơi nhưng vẫn chưa biết bơi. Bạn biết đá bóng không?'],
 ['会。你喜欢足球还是篮球？','Huì. Nǐ xǐhuan zúqiú háishi lánqiú?','Có. Bạn thích bóng đá hay bóng rổ?'],
 ['我觉得足球比篮球有意思。','Wǒ juéde zúqiú bǐ lánqiú yǒuyìsi.','Tôi thấy bóng đá thú vị hơn bóng rổ.'],
 ['那我们先跑步，再踢足球，好吗？','Nà wǒmen xiān pǎobù, zài tī zúqiú, hǎo ma?','Vậy chúng ta chạy bộ trước rồi đá bóng, được không?'],
 ['好。几点在哪儿见？','Hǎo. Jǐ diǎn zài nǎr jiàn?','Được. Mấy giờ gặp ở đâu?'],
 ['下午三点在公园门口见。我拿着球等你。','Xiàwǔ sān diǎn zài gōngyuán ménkǒu jiàn. Wǒ názhe qiú děng nǐ.','Ba giờ chiều gặp ở cổng công viên. Tôi sẽ cầm bóng đợi bạn.'],
 ['好，三点见！','Hǎo, sān diǎn jiàn!','Được, ba giờ gặp nhé!'],
 ],
 question:'B thích bơi nhưng chưa biết bơi. Hai bạn cuối cùng đã đồng ý kế hoạch nào?',
 choices:[['下午三点见，先跑步，再踢足球。','Đúng: kế hoạch cuối cùng là chạy trước, đá bóng sau, gặp 15:00.'],['下午三点去游泳。','B chưa biết bơi và hai người đã đổi hoạt động.'],['先踢足球，再打篮球。','Đảo hoạt động và thêm bóng rổ không có trong kế hoạch đã chốt.']],answer:0,
 transfer:'Đổi vai: bạn biết chơi bóng rổ nhưng chưa biết đá bóng; bạn thấy bóng rổ thú vị hơn chạy bộ. Bạn kia đề nghị đá bóng. Viết ít nhất sáu lượt để giải thích, đề xuất bóng rổ, được đồng ý, rồi chốt 16:00 chủ nhật ở cổng trường (学校门口 xuéxiào ménkǒu). Nêu ai mang bóng. Không chép lại kế hoạch 15:00 công viên.',
 model:['A：周日一起踢足球吧？ B：我还不会踢足球，但是会打篮球。 A：你喜欢跑步吗？ B：喜欢，不过我觉得篮球比跑步有意思。我们打篮球吧？ A：好。几点在哪儿见？ B：下午四点在学校门口见，我带球。 A：好，四点见！','A: Zhōu rì yìqǐ tī zúqiú ba? B: Wǒ hái bú huì tī zúqiú, dànshì huì dǎ lánqiú. A: Nǐ xǐhuan pǎobù ma? B: Xǐhuan, búguò wǒ juéde lánqiú bǐ pǎobù yǒuyìsi. Wǒmen dǎ lánqiú ba? A: Hǎo. Jǐ diǎn zài nǎr jiàn? B: Xiàwǔ sì diǎn zài xuéxiào ménkǒu jiàn, wǒ dài qiú. A: Hǎo, sì diǎn jiàn!','A đề nghị đá bóng chủ nhật. B chưa biết đá nhưng biết chơi bóng rổ, thích bóng rổ hơn chạy bộ. Hai bạn đồng ý chơi bóng rổ, 16:00 ở cổng trường, B mang bóng.'],
 criteria:['Phân biệt chưa biết đá bóng và biết chơi bóng rổ.','Dùng 打篮球/踢足球 đúng hoạt động.','So sánh bóng rổ với chạy bộ và có lời đồng ý cho đề nghị mới.','Giữ đúng chủ nhật 16:00 cổng trường, nói ai mang bóng, ít nhất sáu lượt.']
}];

// Replace isolated headwords and homographs with contextual examples of the target sense.
const examples:Record<string,[string,string,string]>={
 '过':['我没去过北京。','Wǒ méi qùguo Běijīng.','Tôi chưa từng đến Bắc Kinh.'],
 '旅游':['下周我们去杭州旅游。','Xià zhōu wǒmen qù Hángzhōu lǚyóu.','Tuần sau chúng tôi đi du lịch Hàng Châu.'],
 '打车':['我准备打车去机场。','Wǒ zhǔnbèi dǎchē qù jīchǎng.','Tôi định đi taxi đến sân bay.'],
 '篮球':['我会打篮球。','Wǒ huì dǎ lánqiú.','Tôi biết chơi bóng rổ.'],
 '跑':['他跑得很快。','Tā pǎo de hěn kuài.','Anh ấy chạy rất nhanh.'],
 '球':['球在椅子下面。','Qiú zài yǐzi xiàmian.','Quả bóng ở dưới ghế.'],
 '踢':['请不要在教室里踢球。','Qǐng bú yào zài jiàoshì lǐ tī qiú.','Xin đừng đá bóng trong lớp học.'],
 '游':['他在水里游。','Tā zài shuǐ lǐ yóu.','Anh ấy bơi trong nước.'],
 '着':['我拿着球等你。','Wǒ názhe qiú děng nǐ.','Tôi cầm bóng đợi bạn.'],
};
const items=buildAuthoredBatch({level:'hsk2',manuscripts,examples,practiceByLesson:{
 [travel]:{pattern:'没 + động từ + 过',example:['我没去过杭州。','Wǒ méi qùguo Hángzhōu.','Tôi chưa từng đến Hàng Châu.'],prompt:'Người nói chưa từng đến Bắc Kinh: 我___去过北京。 Điền 没 hoặc 不.',answers:['没'],explanation:'没去过 phủ định trải nghiệm đã từng. 不去 thường nói không đi theo thói quen hoặc ý định, không ghép 不去过 ở mẫu này.'},
 [leisure]:{pattern:'打篮球 / 踢足球',example:['我会打篮球，但是不会踢足球。','Wǒ huì dǎ lánqiú, dànshì bú huì tī zúqiú.','Tôi biết chơi bóng rổ nhưng không biết đá bóng.'],prompt:'Bạn đề nghị chơi bóng rổ: 我们一起___篮球吧。 Điền 打 hoặc 踢.',answers:['打'],explanation:'Cụm cơ bản là 打篮球, còn đá bóng là 踢足球. Việc thích một môn chưa chứng minh biết chơi môn đó.'},
},answerReadings:{
 [travel]:['Tā yǐjīng mǎihǎo jīpiào le, xià zhōu liù zuò dìtiě qù jīchǎng.','Anh ấy đã mua vé máy bay, thứ bảy tuần sau đi tàu điện ngầm đến sân bay.'],
 [leisure]:['Xiàwǔ sān diǎn jiàn, xiān pǎobù, zài tī zúqiú.','Gặp ba giờ chiều, chạy bộ trước rồi đá bóng.'],
}});
for(const item of items){
 const isTravel=item.lessonId===travel,rich=getRichLessonContent(item.lessonId)!;
 const facts=isTravel?[
 ['上次','shàng cì','Lần trước','Đã đến Hàng Châu; đi xe buýt đến khách sạn mất một giờ.'],
 ['已经买好','yǐjīng mǎihǎo','Đã mua xong','Vé cho chuyến tới đã mua; chuyến đi chưa diễn ra.'],
 ['下周六','xià zhōu liù','Thứ bảy tuần sau','Dự định đi tàu điện ngầm, 8:00 đến sân bay.'],
 ]:[
 ['喜欢游泳','xǐhuan yóuyǒng','Sở thích','B thích bơi, nhưng chưa biết bơi.'],
 ['会踢足球','huì tī zúqiú','Khả năng','Cả hai biết đá bóng; dùng 踢, không dùng 打.'],
 ['先跑步，再踢足球','xiān pǎobù, zài tī zúqiú','Kế hoạch đã chốt','Thứ bảy 15:00, cổng công viên.'],
 ];
 item.lessonPages.pages.splice(2,0,{id:`${item.lessonId}:v2:facts`,title:isTravel?'Ba thời điểm, ba loại thông tin':'Sở thích không đồng nghĩa kỹ năng',layout:'focus',stage:'understand',blocks:[{...emptyLessonBlock(`${item.lessonId}:v2:block:facts`),kind:'diagram',title:isTravel?'Trải nghiệm → chuẩn bị → kế hoạch':'Thích → biết làm → cùng quyết định',diagram:{type:isTravel?'timeline':'comparison',description:isTravel?'Mỗi mốc lấy thời điểm đang trò chuyện làm điểm tham chiếu.':'So sánh ba vai trò của thông tin, không phải thang điểm kỹ năng.',nodes:facts.map(([label,pinyin,meaningVi,note],i)=>({id:`fact-${i}`,label,pinyin,meaningVi,note,x:i,y:0}))}}]});
 for(const page of item.lessonPages.pages)for(const block of page.blocks)if(block.activity){
  const guided=block.id.endsWith(':guided'),produce=block.id.endsWith(':produce');
  block.activity.learningTarget={skill:'grammar',objective:guided?(isTravel?'Phủ định trải nghiệm bằng 没…过.':'Chọn đúng động từ trong 打篮球.'):(produce?manuscripts.find(m=>m.id===item.lessonId)!.transfer:(isTravel?'Phân biệt trải nghiệm, việc đã xong và kế hoạch.':'Xác nhận hoạt động cuối cùng sau khi trao đổi sở thích và khả năng.')),sources:[{kind:guided?'grammar':'task',id:guided?rich.grammar[0].id:rich.tasks[0].id}]};
 }
 const errors=[...validateLessonPages(item.lessonPages),...validateLessonActivitySources(item.lessonId,item.lessonPages)];
 if(errors.length)throw new Error(errors.join('\n'));
}
writeFileSync('content/drafts/thien-lo-hsk2-travel-leisure-v2.json',JSON.stringify({schemaVersion:1,humanReviewed:false,status:'draft-not-published',items},null,2)+'\n');
console.log(items.map(item=>({lesson:item.lessonId,pages:item.lessonPages.pages.length,published:false})));
