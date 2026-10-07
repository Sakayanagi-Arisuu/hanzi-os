import {readFileSync} from 'node:fs';
import type {PersonalNarrative} from './hsk3-personal-narratives';

type Sentence=[string,string,string];
type SourceLine={hanzi:string;pinyin:string;vietnamese:string};
type SourceLesson={lessonId:string;modelNarration:{lines:SourceLine[]}};
const source=JSON.parse(readFileSync('content/drafts/hsk3-reference-quantity-narration-grammar-2026.07.json','utf8')) as {lessons:SourceLesson[]};
const lines=new Map(source.lessons.map(lesson=>[lesson.lessonId,lesson.modelNarration.lines.map(line=>[line.hanzi,line.pinyin,line.vietnamese] as Sentence)]));
const prefix='hsk3-reference-quantity-phrase-building';
const changes:Record<string,Record<number,Sentence>>={
  'lesson-02':{
    1:['他先把通知读了两遍，然后叫其他同学一起来整理。','Tā xiān bǎ tōngzhī dú le liǎng biàn, ránhòu jiào qítā tóngxué yìqǐ lái zhěnglǐ.','Cậu đọc thông báo hai lượt rồi gọi các bạn khác cùng sắp xếp.'],
    5:['最后，小林把找到的材料按地点放好。','Zuìhòu, Xiǎo Lín bǎ zhǎodào de cáiliào àn dìdiǎn fànghǎo.','Cuối cùng Tiểu Lâm xếp gọn tài liệu tìm được theo địa điểm.'],
  },
  'lesson-03':{
    2:['出发的时间不早不晚，天气也不冷不热，大家都很轻松。','Chūfā de shíjiān bù zǎo bù wǎn, tiānqì yě bù lěng bù rè, dàjiā dōu hěn qīngsōng.','Giờ xuất phát không quá sớm hay quá muộn; thời tiết cũng không lạnh không nóng nên mọi người thoải mái.'],
    3:['每到一站，我们都检查一下路线，前面还有三四站。','Měi dào yí zhàn, wǒmen dōu jiǎnchá yíxià lùxiàn, qiánmiàn hái yǒu sān sì zhàn.','Cứ tới mỗi trạm, chúng tôi lại kiểm tra tuyến đường; phía trước còn khoảng ba bốn trạm.'],
    4:['每个人都按时到车站，让老师很放心；慢慢走也比较安全。','Měi ge rén dōu ànshí dào chēzhàn, ràng lǎoshī hěn fàngxīn; mànmàn zǒu yě bǐjiào ānquán.','Mọi người đều tới ga đúng giờ nên thầy yên tâm; đi chậm cũng tương đối an toàn.'],
  },
};
const data:Record<string,Omit<PersonalNarrative,'paragraphs'|'suffix'>>={
  'lesson-01':{
    goal:'Giữ đúng người, vị trí và phạm vi “ai cũng” trong lời kể chuyến tham quan',
    support:'老王 Lǎo Wáng — cách gọi bác Vương quen biết; 咱们 zánmen — chúng ta, thường gồm người nghe; 别人 biérén — người khác. Bảo tàng và đường đi là tình huống giả định.',
    core:['老','别人','咱们','中间','怎样','结束'],
    rule:'老王 là cách gọi có quan hệ, không tự gắn 老 vào mọi tên. 在银行和书店中间 lấy hai nơi làm mốc. 谁…都… mở phạm vi mọi người trong cảnh; 想…什么就…什么 nói lựa chọn bất kỳ, không phải câu hỏi tìm một đáp án. 咱们 gồm người nói và người được rủ; 别人 là người khác.',
    pitfall:'Không đặt bảo tàng bên trong ngân hàng. “Ai hỏi cũng được” không có nghĩa mọi người đã hỏi. Người nói muốn mua một món quà nhưng chưa chọn món nào.',
    question:'Chi tiết nào văn bản xác nhận, không suy thêm?',choices:[
      ['博物馆在银行和书店中间。','Đúng: hai nơi làm mốc cho vị trí bảo tàng.'],
      ['所有参观的人都问了问题。','Sai: ai hỏi cũng được không có nghĩa ai cũng đã hỏi.'],
      ['老王已经买了礼物。','Sai: người kể chỉ muốn mua gì đó; không nói đã mua.'],
    ],answer:0,
    cloze:{prompt:'Điền đại từ gồm cả người nói lẫn người được rủ: 时间不早了，___先回学校吧。',answer:'咱们',feedback:'咱们 nêu nhóm cùng về trường; 别人 chỉ những người khác.'},
    transfer:'Một nhóm giả định tới thư viện: cô Lý dẫn nhóm; thư viện ở giữa công viên và trường; ai có câu hỏi đều có thể hỏi; cuối buổi cả nhóm về lớp. Viết 4 câu, phân biệt quyền được hỏi với việc đã hỏi và dùng mốc vị trí chính xác.',
    model:['李老师带咱们去图书馆。图书馆在公园和学校中间。谁有问题都可以问老师，但不一定每个人都问了。参观结束后，咱们一起回教室。','Lǐ lǎoshī dài zánmen qù túshūguǎn. Túshūguǎn zài gōngyuán hé xuéxiào zhōngjiān. Shéi yǒu wèntí dōu kěyǐ wèn lǎoshī, dàn bù yídìng měi ge rén dōu wèn le. Cānguān jiéshù hòu, zánmen yìqǐ huí jiàoshì.','Thầy/cô Lý dẫn chúng tôi tới thư viện. Thư viện nằm giữa công viên và trường. Ai có câu hỏi đều có thể hỏi, nhưng không nhất thiết ai cũng đã hỏi. Hết buổi chúng tôi cùng về lớp.'],
    criteria:['Thư viện nằm giữa công viên và trường.','Phân biệt được phép hỏi với đã hỏi.','Dùng đại từ nhóm bao gồm người kể.'],
  },
  'lesson-02':{
    goal:'Đếm đúng vật, lượt hành động và phạm vi “từng” trong lúc sắp xếp tài liệu',
    support:'封 fēng — lượng từ cho thư; 张 zhāng — ảnh/tờ; 页 yè — trang; 遍 biàn — một lượt làm trọn; 个个/张张 phân phối từng người/từng tấm. Đây là số liệu của một nhóm giả định.',
    core:['收到','封','张','遍','一共','最后'],
    rule:'两封信, 三张照片, 一页计划 dùng lượng từ khác nhau. 读了两遍 là đọc trọn hai lượt, không phải hai trang. 张张照片都有日期 nói từng tấm đều có ngày; 一共只用了两个箱子 là tổng cộng hai thùng, không phải mỗi người hai thùng.',
    pitfall:'Không đổi hai lá thư thành hai thùng. “Từng tấm ảnh có ngày” không cho biết mọi ngày đều khác nhau; chỉ thư có địa chỉ khác.',
    question:'Nhóm đã dùng tổng cộng bao nhiêu thùng?',choices:[
      ['一共用了两个箱子。','Đúng: 一共 chỉ tổng cộng hai thùng.'],
      ['每个人用了两个箱子。','Sai: văn bản nói tổng nhóm, không phải mỗi người.'],
      ['用了三张箱子。','Sai: 三张 đi với ảnh, không phải thùng.'],
    ],answer:0,
    cloze:{prompt:'Điền lượng từ cho ảnh: 小林收到三___照片。',answer:'张',feedback:'张 đếm tấm ảnh; 封 đếm thư.'},
    transfer:'Một nhóm khác chuẩn bị trưng bày: nhận ba lá thư, hai tấm bản đồ và một trang hướng dẫn; Mai đọc hướng dẫn hai lượt; tổng cộng nhóm dùng một thùng. Viết 4 câu có lượng từ, lượt đọc và tổng số, không đổi thành số mỗi người.',
    model:['小梅和同学收到三封信、两张地图和一页说明。小梅把说明读了两遍。大家一起整理材料，一共只用了一个箱子。每张地图都放进了箱子里。','Xiǎo Méi hé tóngxué shōudào sān fēng xìn, liǎng zhāng dìtú hé yí yè shuōmíng. Xiǎo Méi bǎ shuōmíng dú le liǎng biàn. Dàjiā yìqǐ zhěnglǐ cáiliào, yígòng zhǐ yòng le yí ge xiāngzi. Měi zhāng dìtú dōu fàng jìn le xiāngzi lǐ.','Mai và các bạn nhận ba thư, hai bản đồ và một trang hướng dẫn. Mai đọc hướng dẫn hai lượt. Cả nhóm cùng sắp xếp và chỉ dùng tổng cộng một thùng. Mỗi bản đồ đều được bỏ vào thùng.'],
    criteria:['Dùng đúng 封, 张, 页.','两遍 là hai lượt đọc.','Một thùng là tổng số của cả nhóm.'],
  },
  'lesson-03':{
    goal:'Phân biệt số ước lượng, tiến trình lặp và điều đã xảy ra trong hành trình',
    support:'大概 dàgài — khoảng/chừng; 五六 wǔ liù — khoảng năm hoặc sáu; 三四 sān sì — khoảng ba hoặc bốn; 一站一站地 — từng trạm một. Tất cả mốc ở đây thuộc một chuyến đi giả định.',
    core:['出发','大概','辆','检查','安全','终于'],
    rule:'大概八点 là khoảng 8 giờ, không phải giờ chính xác. 五六辆车 và 三四站 là lượng gần đúng. 每到一站…都… nói hành động lặp ở từng trạm; 终于看见了 đánh dấu kết quả đã tới lúc trưa. “Đi chậm tương đối an toàn” không chứng minh không có bất cứ rủi ro nào.',
    pitfall:'Không nói nhóm khởi hành đúng 8:00 hay còn chính xác bốn trạm. Xe ở cửa có khoảng năm sáu chiếc, nhóm chỉ lên một chiếc thầy chọn.',
    question:'Tại cửa, nhóm đã lên bao nhiêu xe?',choices:[
      ['老师选的一辆小车。','Đúng: có nhiều xe ở cửa nhưng nhóm lên một xe nhỏ.'],
      ['门口所有五六辆车。','Sai: năm sáu là số xe đỗ ở cửa, không phải số xe cả nhóm lên.'],
      ['前面三四辆车。','Sai: ba bốn là số trạm còn lại, không phải xe.'],
    ],answer:0,
    cloze:{prompt:'Điền từ cho giờ chỉ ước lượng: 我们___早上八点离开学校。',answer:'大概',feedback:'大概 báo xấp xỉ, không chứng minh đúng 8:00.'},
    transfer:'Tuyến xe khác: nhóm rời trường khoảng 9 giờ; ở cửa có bốn năm xe, nhóm chọn một; mỗi tới trạm đều kiểm tra bản đồ; sau khoảng hai ba trạm thì tới vườn. Viết 4 câu giữ số ước lượng và trình tự.',
    model:['我们大概上午九点离开学校。门口有四五辆车，我们选了一辆。每到一站，我们都看一下地图。坐了两三站以后，我们到了花园。','Wǒmen dàgài shàngwǔ jiǔ diǎn líkāi xuéxiào. Ménkǒu yǒu sì wǔ liàng chē, wǒmen xuǎn le yí liàng. Měi dào yí zhàn, wǒmen dōu kàn yíxià dìtú. Zuò le liǎng sān zhàn yǐhòu, wǒmen dào le huāyuán.','Chúng tôi rời trường khoảng 9 giờ sáng. Ở cửa có khoảng bốn năm xe và nhóm chọn một xe. Tới trạm nào cũng xem bản đồ. Đi xe qua khoảng hai ba trạm, nhóm tới vườn.'],
    criteria:['Giờ và số xe/trạm vẫn là ước lượng.','Phân biệt xe có ở cửa với xe được chọn.','Nêu hành động kiểm tra lặp tại từng trạm.'],
  },
};

export const referenceNarratives:PersonalNarrative[]=Object.entries(data).map(([suffix,metadata])=>{
  const base=lines.get(`${prefix}-${suffix}`);
  if(!base||base.length!==6)throw Error(`Missing six-line source: ${suffix}`);
  const paragraphs=base.map((line,index)=>changes[suffix]?.[index]??line);
  if(suffix==='lesson-03'){
    const onTime=paragraphs.splice(4,1)[0];
    paragraphs.splice(1,0,onTime);
  }
  return {suffix,...metadata,paragraphs};
});
