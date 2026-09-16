import {writeFileSync} from 'node:fs';
import {buildAuthoredBatch} from './build-authored-batch';
import {everydayManuscripts} from './everyday-batch-manuscripts';
import {emptyLessonBlock,validateLessonPages} from '../../src/learning/lessonPages';
import type {LessonDiagram} from '../../src/learning/lessonDiagram';

const examples:Record<string,[string,string,string]>={
 '口':['你家有几口人？','Nǐ jiā yǒu jǐ kǒu rén?','Gia đình bạn có mấy người?'],
 '一半':['这是一个苹果的一半。','Zhè shì yí ge píngguǒ de yíbàn.','Đây là một nửa của một quả táo.'],
 '元':['两个苹果六元。','Liǎng ge píngguǒ liù yuán.','Hai quả táo giá sáu tệ.'],
 '找':['找你十块。','Zhǎo nǐ shí kuài.','Trả lại bạn mười tệ.'],
 '件':['我买一件衣服。','Wǒ mǎi yí jiàn yīfu.','Tôi mua một chiếc áo.'],
 '便宜':['这件衣服很便宜。','Zhè jiàn yīfu hěn piányi.','Chiếc áo này rẻ.'],
 '衣服':['这件衣服很好看。','Zhè jiàn yīfu hěn hǎokàn.','Chiếc áo này đẹp.'],
 '贵':['这件衣服太贵了。','Zhè jiàn yīfu tài guì le.','Chiếc áo này đắt quá.'],
 '菜':['这个菜很好吃。','Zhège cài hěn hǎochī.','Món này ngon.'],
 '杯子':['这是我的杯子。','Zhè shì wǒ de bēizi.','Đây là cốc của tôi.'],
 '两':['我有两本书。','Wǒ yǒu liǎng běn shū.','Tôi có hai quyển sách.'],
 '二':['二十本书。','Èrshí běn shū.','Hai mươi quyển sách.'],
 '第':['这是第一课。','Zhè shì dì yī kè.','Đây là bài thứ nhất.'],
 '点':['现在八点。','Xiànzài bā diǎn.','Bây giờ tám giờ.'],
 '小时':['学习一个小时。','Xuéxí yí ge xiǎoshí.','Học một giờ.'],
 '分':['现在八点十分。','Xiànzài bā diǎn shí fēn.','Bây giờ tám giờ mười.'],
 '分钟':['学习十分钟。','Xuéxí shí fēnzhōng.','Học mười phút.'],
 '上':['书在桌子上。','Shū zài zhuōzi shàng.','Sách ở trên bàn.'],
 '下':['猫在桌子下。','Māo zài zhuōzi xià.','Mèo ở dưới bàn.'],
 '前':['请八点前来。','Qǐng bā diǎn qián lái.','Hãy đến trước tám giờ.'],
 '后':['我九点后有时间。','Wǒ jiǔ diǎn hòu yǒu shíjiān.','Sau chín giờ tôi có thời gian.'],
 '晚':['现在太晚了。','Xiànzài tài wǎn le.','Bây giờ muộn quá rồi.'],
 '早':['现在还早。','Xiànzài hái zǎo.','Bây giờ vẫn còn sớm.'],
 '雪':['下雪了。','Xiàxuě le.','Tuyết rơi rồi.'],
 '正在':['正在下雨。','Zhèngzài xiàyǔ.','Đang mưa.'],
 '住':['我住在北京。','Wǒ zhù zài Běijīng.','Tôi sống ở Bắc Kinh.'],
};
type Scene={type:LessonDiagram['type'];description:string;rows:[string,string,string][]};
const scenes:Scene[]=[
 {type:'comparison',description:'Hai mức giá giả định của cùng quầy: một quả ba tệ, hai quả sáu tệ.',rows:[['一个苹果，三块钱','Yí ge píngguǒ, sān kuài qián','Một quả táo: ba tệ'],['两个苹果，六块钱','Liǎng ge píngguǒ, liù kuài qián','Hai quả táo: sáu tệ']]},
 {type:'comparison',description:'Phân biệt món ăn và đồ uống trên thực đơn luyện tập. Không có giá hoặc thông tin thành phần trong bảng này.',rows:[['吃包子','Chī bāozi','Ăn bánh bao'],['吃鸡蛋','Chī jīdàn','Ăn trứng'],['喝水','Hē shuǐ','Uống nước'],['喝牛奶','Hē niúnǎi','Uống sữa']]},
 {type:'sequence',description:'Giá áo hai mươi; khách đưa ba mươi; người bán trả mười. Đọc từng bước theo vai.',rows:[['二十块','Èrshí kuài','Giá áo: 20 tệ'],['给你三十块','Gěi nǐ sānshí kuài','Khách đưa 30 tệ'],['找你十块','Zhǎo nǐ shí kuài','Người bán trả 10 tệ']]},
 {type:'comparison',description:'Bác sĩ là người; bệnh viện là nơi; bàn và ghế là đồ vật trong phòng chờ.',rows:[['医生','Yīshēng','Bác sĩ · người'],['医院','Yīyuàn','Bệnh viện · nơi'],['桌子和椅子','Zhuōzi hé yǐzi','Bàn và ghế · đồ vật']]},
 {type:'comparison',description:'Cùng chữ số nhưng nhiệm vụ khác: đếm hai quyển, đếm hai mươi quyển và đọc mã phòng từng chữ số.',rows:[['两本书','Liǎng běn shū','2 quyển sách'],['二十本书','Èrshí běn shū','20 quyển sách'],['二零三','Èr líng sān','Mã 203 · đọc từng chữ số']]},
 {type:'timeline',description:'Lịch giả định tháng 5: hôm qua ngày 7, hôm nay ngày 8, hẹn ngày mai ngày 9. Không dùng ngày thật.',rows:[['昨天：五月七号','Zuótiān: wǔ yuè qī hào','Hôm qua: 7/5'],['今天：五月八号','Jīntiān: wǔ yuè bā hào','Hôm nay: 8/5'],['明天：五月九号','Míngtiān: wǔ yuè jiǔ hào','Ngày hẹn: 9/5']]},
 {type:'timeline',description:'Các mốc lịch riêng trong bài: sáng thứ hai học, chiều thứ hai nghỉ, chủ nhật gặp bạn.',rows:[['星期一上午上课','Xīngqīyī shàngwǔ shàngkè','Sáng thứ hai: có lớp'],['星期一下午休息','Xīngqīyī xiàwǔ xiūxi','Chiều thứ hai: nghỉ'],['星期天见','Xīngqītiān jiàn','Chủ nhật: gặp']]},
 {type:'timeline',description:'Lớp bắt đầu 8:00, kết thúc 9:00; thời lượng 60 phút hay một giờ. Hai mốc không phải hai giờ học.',rows:[['八点','Bā diǎn','8:00 · bắt đầu'],['九点','Jiǔ diǎn','9:00 · kết thúc'],['一个小时','Yí ge xiǎoshí','Thời lượng: một giờ']]},
 {type:'map',description:'Sơ đồ theo chiều dọc: sách ở trên bàn, bàn làm mốc giữa, mèo ở dưới bàn. Mỗi mục có nghĩa bằng chữ.',rows:[['书','Shū','Sách · trên bàn'],['桌子','Zhuōzi','Bàn · vật làm mốc'],['猫','Māo','Mèo · dưới bàn']]},
 {type:'comparison',description:'Hai thông tin đồng thời đúng: người nói sống ở Bắc Kinh và hiện đang ở nhà. Không nhầm nơi cư trú với vị trí hiện tại.',rows:[['住在北京','Zhù zài Běijīng','Nơi sống: Bắc Kinh'],['现在在家','Xiànzài zài jiā','Hiện tại: ở nhà']]},
];
const items=buildAuthoredBatch({manuscripts:everydayManuscripts,practiceByLesson:Object.fromEntries(everydayManuscripts.map(m=>[m.id,m.practice])),answerReadings:Object.fromEntries(everydayManuscripts.map(m=>[m.id,m.answerReading])),examples});
items.forEach((item,index)=>{
 const scene=scenes[index];
 const diagram:LessonDiagram={type:scene.type,description:scene.description,nodes:scene.rows.map(([label,pinyin,meaningVi],i)=>({id:`node-${i}`,label,pinyin,meaningVi,note:'',x:scene.type==='map'?1:i%4,y:scene.type==='map'?i:0}))};
 const page={id:`${item.lessonId}:v2:visual`,title:'Đọc thông tin trong tình huống',layout:'scene' as const,stage:'understand' as const,blocks:[{...emptyLessonBlock(`${item.lessonId}:v2:block:visual`),kind:'diagram' as const,title:'Sơ đồ để hiểu và đối chiếu',diagram}]};
 // Location/calendar start from the visual; other lessons explain their spoken example first.
 item.lessonPages.pages.splice(scene.type==='map'||index===5?1:3,0,page);
 item.lessonPages.art='city';
 const errors=validateLessonPages(item.lessonPages);if(errors.length)throw new Error(`${item.lessonId}: ${errors.join('; ')}`);
});
writeFileSync('content/drafts/thien-lo-everyday-batch-v2.json',JSON.stringify({schemaVersion:1,humanReviewed:false,status:'draft-not-published',items},null,2)+'\n');
console.log({lessons:items.length,pages:items.reduce((n,i)=>n+i.lessonPages.pages.length,0),wordLinks:items.reduce((n,i)=>n+i.studioContent.vocabulary.length,0)});
