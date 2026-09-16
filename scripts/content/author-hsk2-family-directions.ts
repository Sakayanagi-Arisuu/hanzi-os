import {writeFileSync} from 'node:fs';
import {buildAuthoredBatch} from './build-authored-batch';
import type {SurvivalManuscript} from './survival-batch-manuscripts';
import {getRichLessonContent} from '../../src/learning/richLessonContent';
import {emptyLessonBlock,validateLessonPages} from '../../src/learning/lessonPages';
import {validateLessonActivitySources} from '../../src/learning/lessonActivitySources';
const family='hsk2-daily-needs-family-lesson-05',route='hsk2-travel-leisure-lesson-01';
const manuscripts:SurvivalManuscript[]=[{
 id:family,focus:'Kể đúng ai làm gì và làm khi nào',scene:'Lan sống cùng chồng và con. Ông bà nội của Lan sống gần đó. Bạn hỏi gia đình thường làm gì cuối tuần rồi xác nhận kế hoạch hôm nay. Cần phân biệt sống cùng, đến thăm và hoạt động đôi khi mới làm.',support:'周末 zhōumò: cuối tuần · 附近 fùjìn: gần đây · 看 trong 看爷爷奶奶: thăm ông bà · 做饭 zuòfàn: nấu cơm · 丈夫 zhàngfu: chồng · 妻子 qīzi: vợ. 爷爷、奶奶 là ông bà nội của người được nói tới; phải xác định người kể.',rule:'跟/和 + người + 一起 + động từ nối những người cùng tham gia: 我跟丈夫和孩子一起住. Không suy ra ông bà sống cùng chỉ vì họ sống gần.\n有时…，有时… mô tả những dịp khác nhau, không có nghĩa luôn luôn hoặc cùng lúc. 我自己做饭 nhấn mạnh tự làm; không nhất thiết đang ở nhà một mình.\n她 chỉ người nữ vừa được nhắc trong ngữ cảnh, không tự động là 妻子. Khi có nhiều người nữ, nhắc lại 奶奶/妈妈 để rõ nghĩa. 今天 hỏi một dịp cụ thể, khác 周末一般 hoặc 有时.',pitfall:'有时 = đôi khi; 有时间 = có thời gian. Không cắt 有时间 thành ví dụ cho 有时. 奶奶 không phải mẹ hay bà ngoại. Khi kể lại từ góc nhìn Lan, 奶奶 vẫn là bà nội của Lan, không phải bà của chồng.',dialogue:[
 ['你跟谁一起住？','Nǐ gēn shéi yìqǐ zhù?','Bạn sống cùng ai?'],
 ['我跟丈夫和孩子一起住，爷爷奶奶住在附近。','Wǒ gēn zhàngfu hé háizi yìqǐ zhù, yéye nǎinai zhù zài fùjìn.','Tôi sống cùng chồng và con; ông bà nội tôi sống gần đó.'],
 ['周末你们常做什么？','Zhōumò nǐmen cháng zuò shénme?','Cuối tuần các bạn thường làm gì?'],
 ['我们常去看爷爷奶奶。','Wǒmen cháng qù kàn yéye nǎinai.','Chúng tôi thường đến thăm ông bà nội tôi.'],
 ['谁做饭呢？','Shéi zuòfàn ne?','Ai nấu cơm vậy?'],
 ['有时奶奶做，有时我自己做。丈夫跟孩子一起玩。','Yǒushí nǎinai zuò, yǒushí wǒ zìjǐ zuò. Zhàngfu gēn háizi yìqǐ wán.','Có khi bà nội nấu, có khi tôi tự nấu. Chồng tôi chơi cùng con.'],
 ['今天也是奶奶做饭吗？','Jīntiān yě shì nǎinai zuòfàn ma?','Hôm nay cũng bà nội nấu cơm à?'],
 ['不是，今天我做，让奶奶休息一下。','Bú shì, jīntiān wǒ zuò, ràng nǎinai xiūxi yíxià.','Không, hôm nay tôi nấu, để bà nội nghỉ một lát.'],
 ],question:'Lan kể 有时奶奶做，有时我自己做 rồi nói 今天我做. Câu nào giữ đúng cả thói quen lẫn hôm nay?',choices:[['奶奶每天做饭。','每天 là hằng ngày; Lan chỉ nói bà có khi nấu.'],['今天奶奶做饭。','Lan đã xác nhận hôm nay chính Lan nấu.'],['有时奶奶做饭，今天我自己做。','Đúng khi kể từ góc nhìn Lan: bà đôi khi nấu, còn hôm nay Lan tự nấu.']],answer:2,transfer:'Đóng vai Minh: sống cùng vợ và con; bố mẹ sống gần. Cuối tuần thường thăm bố mẹ. Có khi bố nấu, có khi bạn tự nấu; hôm nay bố nấu và bạn chơi cùng con. Viết ít nhất sáu lượt hỏi/đáp về người sống cùng, hoạt động cuối tuần, ai nấu và hôm nay. Giữ đúng góc nhìn của Minh.',model:['A：你跟谁一起住？ B：我跟妻子和孩子一起住，爸爸妈妈住在附近。 A：周末你们常做什么？ B：我们常去看爸爸妈妈。 A：谁做饭？ B：有时爸爸做，有时我自己做。 A：今天呢？ B：今天爸爸做饭，我跟孩子一起玩。','A: Nǐ gēn shéi yìqǐ zhù? B: Wǒ gēn qīzi hé háizi yìqǐ zhù, bàba māma zhù zài fùjìn. A: Zhōumò nǐmen cháng zuò shénme? B: Wǒmen cháng qù kàn bàba māma. A: Shéi zuòfàn? B: Yǒushí bàba zuò, yǒushí wǒ zìjǐ zuò. A: Jīntiān ne? B: Jīntiān bàba zuòfàn, wǒ gēn háizi yìqǐ wán.','A: Bạn sống cùng ai? B: Tôi sống cùng vợ và con, bố mẹ sống gần đó. A: Cuối tuần thường làm gì? B: Chúng tôi thường thăm bố mẹ. A: Ai nấu cơm? B: Có khi bố nấu, có khi tôi tự nấu. A: Hôm nay thì sao? B: Hôm nay bố nấu, tôi chơi cùng con.'],criteria:['Nêu vợ, con sống cùng; bố mẹ sống gần, không nhập hai thông tin thành một.','Nêu việc thường thăm bố mẹ và hai người có thể nấu vào những dịp khác nhau.','Hôm nay bố nấu, Minh chơi với con; không chép kế hoạch của Lan.','Ít nhất sáu lượt có hỏi tiếp và trả lời đúng câu hỏi.']
},{
 id:route,focus:'Nhắc lại tuyến đi trước khi lên đường',scene:'Bạn đang ở cửa trường, muốn tới thư viện. Cần đi thẳng đến ngã rẽ thứ hai rồi rẽ trái. Thư viện cạnh ngân hàng, đi bộ khoảng mười phút. Bạn nghe nhầm thứ nhất/thứ hai và cần xác nhận lại.',support:'图书馆 túshūguǎn: thư viện · 银行 yínháng: ngân hàng · 路口 lùkǒu: ngã rẽ/giao lộ · 第二个 dì èr ge: cái thứ hai · 拐 guǎi: rẽ · 大约 dàyuē: khoảng · 分钟 fēnzhōng: phút. Trái/phải được tính theo hướng người đang đi.',rule:'从 + điểm xuất phát: 从学校门口. 往 + hướng + động từ: 往前走, 往左拐. 到 + mốc nêu lúc đổi hướng: 到第二个路口往左拐.\n在…旁边 nói vị trí cạnh một mốc, không có nghĩa bên trong: 图书馆在银行旁边 khác 在银行里面. 离 + mốc + 近/远 diễn tả khoảng cách. 十分钟 ở đây là thời gian đi bộ, không phải số mét.\nNhắc lại để xác nhận thứ tự và hướng: 第二个路口，不是第一个，对吗？ Không thay đổi mốc chỉ vì nhớ được từ 左.',pitfall:'左 và 右 đối lập; 第一 và 第二 cũng vậy. Đúng hướng nhưng rẽ sai giao lộ vẫn sai tuyến. Không suy mặt đường thư viện nằm bên nào chỉ từ 旁边. 大约 không phải thời gian chính xác tuyệt đối.',dialogue:[
 ['请问，从学校门口到图书馆怎么走？','Qǐngwèn, cóng xuéxiào ménkǒu dào túshūguǎn zěnme zǒu?','Cho hỏi từ cửa trường đi đến thư viện thế nào?'],
 ['往前走，到第二个路口往左拐。','Wǎng qián zǒu, dào dì èr ge lùkǒu wǎng zuǒ guǎi.','Đi thẳng, đến giao lộ thứ hai thì rẽ trái.'],
 ['是第一个路口吗？','Shì dì yī ge lùkǒu ma?','Là giao lộ thứ nhất à?'],
 ['不是，是第二个。图书馆在银行旁边。','Bú shì, shì dì èr ge. Túshūguǎn zài yínháng pángbiān.','Không, là thứ hai. Thư viện ở cạnh ngân hàng.'],
 ['离这里远吗？','Lí zhèlǐ yuǎn ma?','Có xa đây không?'],
 ['不远，走路大约十分钟。','Bù yuǎn, zǒulù dàyuē shí fēnzhōng.','Không xa, đi bộ khoảng mười phút.'],
 ['第二个路口往左拐，银行旁边，对吗？','Dì èr ge lùkǒu wǎng zuǒ guǎi, yínháng pángbiān, duì ma?','Rẽ trái ở giao lộ thứ hai, cạnh ngân hàng, đúng không?'],
 ['对，就是那里。','Duì, jiù shì nàli.','Đúng, chính chỗ đó.'],
 ],question:'Sau khi được sửa lại, bạn cần đi tuyến nào?',choices:[['第二个路口往左拐，图书馆在银行旁边。','Đúng cả mốc rẽ thứ hai, hướng trái và vị trí cạnh ngân hàng.'],['第一个路口往左拐，图书馆在银行旁边。','Đúng hướng nhưng sai giao lộ: cần giao lộ thứ hai.'],['第二个路口往右拐，图书馆在银行里面。','Sai hướng và vị trí: rẽ trái, ở cạnh ngân hàng chứ không bên trong.']],answer:0,transfer:'Tuyến mới: từ cửa khách sạn đi thẳng, tới giao lộ thứ nhất rẽ phải. Hiệu thuốc cạnh nhà hàng; đi bộ khoảng năm phút. Viết ít nhất sáu lượt: hỏi đường, chỉ đường, hỏi lại giao lộ/hướng, xác nhận, hỏi xa gần, trả lời. Hỗ trợ: 酒店 jiǔdiàn: khách sạn · 药店 yàodiàn: hiệu thuốc · 饭馆 fànguǎn: nhà hàng.',model:['A：请问，从酒店门口到药店怎么走？ B：往前走，到第一个路口往右拐，药店在饭馆旁边。 A：第一个路口往右拐，对吗？ B：对。 A：离这里远吗？ B：不远，走路大约五分钟。','A: Qǐngwèn, cóng jiǔdiàn ménkǒu dào yàodiàn zěnme zǒu? B: Wǎng qián zǒu, dào dì yī ge lùkǒu wǎng yòu guǎi, yàodiàn zài fànguǎn pángbiān. A: Dì yī ge lùkǒu wǎng yòu guǎi, duì ma? B: Duì. A: Lí zhèlǐ yuǎn ma? B: Bù yuǎn, zǒulù dàyuē wǔ fēnzhōng.','A: Từ cửa khách sạn đi đến hiệu thuốc thế nào? B: Đi thẳng, đến giao lộ thứ nhất rẽ phải, hiệu thuốc cạnh nhà hàng. A: Giao lộ thứ nhất rẽ phải đúng không? B: Đúng. A: Có xa đây không? B: Không xa, đi bộ khoảng năm phút.'],criteria:['Xuất phát từ cửa khách sạn, đích là hiệu thuốc, không chép trường/thư viện.','Giao lộ thứ nhất và rẽ phải đều đúng; có câu nhắc lại để xác nhận.','Nêu cạnh nhà hàng, không đổi thành bên trong hoặc tự thêm phía đường.','Khoảng năm phút đi bộ; đủ sáu lượt hỏi/đáp liên kết.']
}];
const examples:Record<string,[string,string,string]>={
 '奶奶':['周末我去看奶奶。','Zhōumò wǒ qù kàn nǎinai.','Cuối tuần tôi đi thăm bà nội.'],
 '妻子':['他跟妻子一起做饭。','Tā gēn qīzi yìqǐ zuòfàn.','Anh ấy nấu cơm cùng vợ.'],
 '小孩儿':['小孩儿跟爷爷一起玩。','Xiǎoháir gēn yéye yìqǐ wán.','Đứa trẻ chơi cùng ông nội.'],
 '爷爷':['爷爷今天在家休息。','Yéye jīntiān zài jiā xiūxi.','Hôm nay ông nội nghỉ ở nhà.'],
 '有时':['有时我做饭，有时丈夫做。','Yǒushí wǒ zuòfàn, yǒushí zhàngfu zuò.','Có khi tôi nấu cơm, có khi chồng nấu.'],
 '丈夫':['我丈夫今天跟孩子一起玩。','Wǒ zhàngfu jīntiān gēn háizi yìqǐ wán.','Hôm nay chồng tôi chơi cùng con.'],
 '自己':['今天我自己做饭。','Jīntiān wǒ zìjǐ zuòfàn.','Hôm nay tôi tự nấu cơm.'],
 '从':['从学校门口往前走。','Cóng xuéxiào ménkǒu wǎng qián zǒu.','Từ cửa trường đi thẳng.'],
 '后面':['银行在学校后面。','Yínháng zài xuéxiào hòumian.','Ngân hàng ở phía sau trường.'],
 '近':['图书馆离学校很近。','Túshūguǎn lí xuéxiào hěn jìn.','Thư viện rất gần trường.'],
 '离':['药店离酒店远吗？','Yàodiàn lí jiǔdiàn yuǎn ma?','Hiệu thuốc có xa khách sạn không?'],
 '里面':['她在银行里面等你。','Tā zài yínháng lǐmiàn děng nǐ.','Cô ấy đợi bạn bên trong ngân hàng.'],
 '楼':['图书馆在二楼。','Túshūguǎn zài èr lóu.','Thư viện ở tầng hai.'],
 '路':['这条路到学校。','Zhè tiáo lù dào xuéxiào.','Con đường này dẫn đến trường.'],
 '门':['请打开这扇门。','Qǐng dǎkāi zhè shàn mén.','Hãy mở cánh cửa này.'],
 '门口':['我们在学校门口见。','Wǒmen zài xuéxiào ménkǒu jiàn.','Chúng ta gặp ở cửa trường.'],
 '旁边':['药店在饭馆旁边。','Yàodiàn zài fànguǎn pángbiān.','Hiệu thuốc ở cạnh nhà hàng.'],
 '前面':['学校前面有一家银行。','Xuéxiào qiánmiàn yǒu yì jiā yínháng.','Phía trước trường có một ngân hàng.'],
 '上面':['门上面有三个字。','Mén shàngmiàn yǒu sān ge zì.','Phía trên cửa có ba chữ.'],
 '条':['这条路很长。','Zhè tiáo lù hěn cháng.','Con đường này rất dài.'],
 '外面':['我在银行外面等你。','Wǒ zài yínháng wàimiàn děng nǐ.','Tôi đợi bạn bên ngoài ngân hàng.'],
 '往':['到路口往左拐。','Dào lùkǒu wǎng zuǒ guǎi.','Đến giao lộ thì rẽ trái.'],
 '下面':['地图下面有一行字。','Dìtú xiàmiàn yǒu yì háng zì.','Phía dưới bản đồ có một dòng chữ.'],
 '右':['到第一个路口往右拐。','Dào dì yī ge lùkǒu wǎng yòu guǎi.','Đến giao lộ thứ nhất thì rẽ phải.'],
 '右边':['银行在学校右边。','Yínháng zài xuéxiào yòubian.','Ngân hàng ở bên phải trường.'],
 '远':['医院离这里很远。','Yīyuàn lí zhèlǐ hěn yuǎn.','Bệnh viện rất xa đây.'],
 '左':['到第二个路口往左拐。','Dào dì èr ge lùkǒu wǎng zuǒ guǎi.','Đến giao lộ thứ hai thì rẽ trái.'],
 '左边':['学校左边有一家饭馆。','Xuéxiào zuǒbian yǒu yì jiā fànguǎn.','Bên trái trường có một nhà hàng.'],
};
const items=buildAuthoredBatch({level:'hsk2',manuscripts,examples,practiceByLesson:{
 [family]:{pattern:'有时…，有时…',example:['有时奶奶做饭，有时我自己做。','Yǒushí nǎinai zuòfàn, yǒushí wǒ zìjǐ zuò.','Có khi bà nội nấu cơm, có khi tôi tự nấu.'],prompt:'Điền từ mang nghĩa “đôi khi” theo mẫu: ___奶奶做饭，有时我自己做。',answers:['有时','有时候'],explanation:'有时/有时候 nói đôi khi. 每天 nói hằng ngày, 有时间 nói có thời gian nên không giữ nghĩa yêu cầu.'},
 [route]:{pattern:'到 + giao lộ + 往 + hướng + 拐',example:['到第二个路口往左拐。','Dào dì èr ge lùkǒu wǎng zuǒ guǎi.','Đến giao lộ thứ hai thì rẽ trái.'],prompt:'Dựa vào tuyến đến thư viện: 到第二个路口往___拐。 Điền hướng rẽ.',answers:['左'],explanation:'Tuyến đến thư viện rẽ trái ở giao lộ thứ hai. 右 đưa người đi sang hướng ngược lại.'},
},answerReadings:{[family]:['Yǒushí nǎinai zuòfàn, jīntiān wǒ zìjǐ zuò.','Có khi bà nội nấu, hôm nay tôi tự nấu.'],[route]:['Dì èr ge lùkǒu wǎng zuǒ guǎi, túshūguǎn zài yínháng pángbiān.','Giao lộ thứ hai rẽ trái, thư viện cạnh ngân hàng.']}});
for(const item of items){
 const isFamily=item.lessonId===family,rich=getRichLessonContent(item.lessonId)!;
 const labels=isFamily?[
  ['一起住','yìqǐ zhù','Sống cùng','Lan, chồng và con.'],['住在附近','zhù zài fùjìn','Sống gần','Ông bà nội của Lan.'],['今天做饭','jīntiān zuòfàn','Nấu hôm nay','Lan; có khi bà nội nấu vào dịp khác.'],
 ]:[['学校门口','xuéxiào ménkǒu','Cửa trường','Xuất phát, đi thẳng.'],['第一个路口','dì yī ge lùkǒu','Giao lộ thứ nhất','Tiếp tục đi thẳng.'],['第二个路口','dì èr ge lùkǒu','Giao lộ thứ hai','Rẽ trái; thư viện cạnh ngân hàng.']];
 item.lessonPages.pages.splice(2,0,{id:`${item.lessonId}:v2:facts`,title:isFamily?'Quan hệ, nơi ở và hôm nay':'Đọc tuyến theo thứ tự',layout:'focus',stage:'understand',blocks:[{...emptyLessonBlock(`${item.lessonId}:v2:block:facts`),kind:'diagram',title:isFamily?'Ba thông tin không được gộp':'Tuyến đến thư viện',diagram:{type:isFamily?'comparison':'sequence',description:isFamily?'Giữ góc nhìn Lan khi kể lại. Bảng mô tả gia đình trong bài, không phải khuôn mẫu cho mọi gia đình.':'Sơ đồ thứ tự chỉ đường, không phải bản đồ theo tỉ lệ. Hướng trái/phải theo người đi.',nodes:labels.map(([label,pinyin,meaningVi,note],i)=>({id:`fact-${i}`,label,pinyin,meaningVi,note,x:i,y:0}))}}]});
 for(const page of item.lessonPages.pages)for(const block of page.blocks)if(block.activity)block.activity.learningTarget={skill:'grammar',objective:block.id.endsWith(':guided')?(isFamily?'Dùng từ chỉ tần suất đôi khi theo mẫu.':'Dùng hướng rẽ đúng tuyến đã đọc.'):block.id.endsWith(':produce')?(isFamily?'Tự viết chuỗi trao đổi gia đình với quan hệ và tần suất đúng; tự đối chiếu.':'Tự viết chuỗi hỏi đường và xác nhận tuyến mới; tự đối chiếu.'):(isFamily?'Kể lại đúng người thực hiện và tần suất.':'Giữ đúng thứ tự giao lộ, hướng và vị trí khi xác nhận.'),sources:[{kind:block.id.endsWith(':guided')?'grammar':'task',id:block.id.endsWith(':guided')?rich.grammar[0].id:rich.tasks[0].id}]};
 const errors=[...validateLessonPages(item.lessonPages),...validateLessonActivitySources(item.lessonId,item.lessonPages)];if(errors.length)throw new Error(errors.join('\n'));
}
writeFileSync('content/drafts/thien-lo-hsk2-family-directions-v2.json',JSON.stringify({schemaVersion:1,humanReviewed:false,status:'draft-not-published',items},null,2)+'\n');
console.log(items.map(i=>({lesson:i.lessonId,pages:i.lessonPages.pages.length,published:false})));
