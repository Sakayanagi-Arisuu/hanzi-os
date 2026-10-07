// Original AI-assisted editorial material. Human review is still pending.
const triple=(hanzi,pinyin,meaningVi)=>({hanzi,pinyin,meaningVi});
export const contextDecisions=[
 {wordId:'hsk-vocab-00502',word:'矮',lessonId:'hsk3-cohesion-reconstruction-lesson-02',
  title:'Mô tả chiều cao, không suy tính cách',
  note:'矮 (ǎi) tả chiều cao thấp của người hoặc vật; đối chiếu 高 (gāo). 个子矮 nói về vóc người, không nói người đó sợ độ cao hay kém năng lực. Khi giới thiệu người, chỉ nêu chiều cao nếu cần nhận diện, tránh bình phẩm. Trong câu so sánh dùng A 比 B 矮, không thêm 很 ngay trước 矮.',
  examples:[triple('小周比哥哥矮，但是比弟弟高。','Xiǎo Zhōu bǐ gēge ǎi, dànshì bǐ dìdi gāo.','Tiểu Châu thấp hơn anh trai nhưng cao hơn em trai.'),triple('这张桌子太矮了，孩子坐在这里写字不舒服。','Zhè zhāng zhuōzi tài ǎi le, háizi zuò zài zhèlǐ xiě zì bù shūfu.','Bàn này thấp quá, trẻ ngồi đây viết không thoải mái.')],
  prompt:'Theo câu về Tiểu Châu, thứ tự nào đúng từ cao đến thấp?',
  options:['哥哥、小周、弟弟','小周、哥哥、弟弟','弟弟、小周、哥哥'],answer:0,
  explanation:'比哥哥矮 đặt Tiểu Châu dưới anh; 比弟弟高 đặt Tiểu Châu trên em. Không có thông tin về sợ độ cao.',
  transfer:'Ở buổi gặp khác, Lan cao 160 cm, Mai cao 170 cm. Viết hai câu dùng 矮 và 高 để so sánh. Không suy ra tuổi, khả năng hay tính cách từ chiều cao.',
  model:triple('小兰比小梅矮。小梅比小兰高。','Xiǎo Lán bǐ Xiǎo Méi ǎi. Xiǎo Méi bǐ Xiǎo Lán gāo.','Lan thấp hơn Mai. Mai cao hơn Lan.'),
  rubric:['Đặt đúng người cao/thấp theo số liệu.','Dùng 比 với 矮/高; không suy thêm tính cách.']},
 {wordId:'hsk-vocab-00503',word:'爱人',lessonId:'hsk3-culture-tradition-descriptions-festivals-customs',
  title:'Giới thiệu người bạn đời trong dịp gặp mặt',
  note:'Trong cách giới thiệu gia đình ở Mainland Mandarin, 爱人 (àiren, 人 thanh nhẹ) thường chỉ vợ hoặc chồng, không xác định giới tính. Không dùng mặc định để gọi bạn trai/bạn gái chưa kết hôn: có thể dùng 男朋友/女朋友. 丈夫/妻子 nêu rõ chồng/vợ; 老公/老婆 thân mật hơn. Cách gọi phụ thuộc người nói và hoàn cảnh, không phải mọi gia đình đều dùng 爱人.',
  examples:[triple('王老师和爱人结婚十年了。今年中秋节，他们一起回家看父母。','Wáng lǎoshī hé àiren jiéhūn shí nián le. Jīnnián Zhōngqiū Jié, tāmen yìqǐ huí jiā kàn fùmǔ.','Thầy Vương và người bạn đời đã kết hôn mười năm. Tết Trung thu năm nay, họ cùng về nhà thăm bố mẹ.'),triple('这是我爱人，她在附近的学校工作。','Zhè shì wǒ àiren, tā zài fùjìn de xuéxiào gōngzuò.','Đây là vợ tôi, cô ấy làm việc ở trường gần đây.')],
  prompt:'Trong câu về thầy Vương, 爱人 chỉ ai?',options:['Một người bạn cùng trường','Người vợ hoặc chồng đã kết hôn với thầy','Người đang hẹn hò, chắc chắn chưa kết hôn'],answer:1,
  explanation:'结婚十年了 xác nhận hai người đã kết hôn mười năm. Riêng từ 爱人 không cho biết giới tính người bạn đời.',
  transfer:'Trong buổi giới thiệu với hàng xóm mới, cô Trần muốn nói: đây là chồng tôi, anh ấy làm việc tại bệnh viện. Dùng 爱人 viết một câu. Nếu hai người chỉ đang hẹn hò thì cần đổi cách gọi thế nào?',
  model:triple('这是我爱人，他在医院工作。','Zhè shì wǒ àiren, tā zài yīyuàn gōngzuò.','Đây là chồng tôi, anh ấy làm việc ở bệnh viện.'),
  rubric:['Dùng 爱人 cho người phối ngẫu; 他 đúng dữ kiện chồng.','Nếu chỉ hẹn hò, dùng 男朋友 trong tình huống này.']},
 {wordId:'hsk-vocab-00522',word:'笔记本',lessonId:'hsk3-personal-life-narratives-travel-transport',
  title:'Mang sổ tay hay máy tính khi đi xa?',
  note:'笔记本 (bǐjìběn) có thể là sổ tay/vở ghi; trong ngữ cảnh thiết bị còn là cách nói tắt của 笔记本电脑, máy tính xách tay. 一本笔记本 thường là một quyển sổ; 一台笔记本电脑 là một máy tính. 写在…上, 页 và 笔 giúp nhận nghĩa sổ; 开机, 充电 và 电脑 giúp nhận nghĩa máy tính. Khi chưa rõ, hỏi lại thay vì chỉ dựa vào một từ.',
  examples:[triple('出发以前，我把车次和时间写在笔记本上。','Chūfā yǐqián, wǒ bǎ chēcì hé shíjiān xiě zài bǐjìběn shàng.','Trước khi xuất phát, tôi ghi số hiệu chuyến tàu và giờ vào sổ tay.'),triple('我的笔记本电脑没电了，到了酒店再充电。','Wǒ de bǐjìběn diànnǎo méi diàn le, dào le jiǔdiàn zài chōngdiàn.','Máy tính xách tay của tôi hết pin rồi, tới khách sạn sẽ sạc.')],
  prompt:'Bạn cần một quyển sổ giấy để ghi lịch tàu. Cách hỏi mua nào rõ nhất?',options:['我想买一台笔记本电脑。','我想买一本写字用的笔记本。','我的电脑没电了。'],answer:1,
  explanation:'一本 và 写字用的 làm rõ sổ để viết. 一台笔记本电脑 là máy tính; 没电了 chỉ tình trạng hết điện.',
  transfer:'Sang ngữ cảnh lớp học: bạn có sổ giấy để ghi từ mới, còn máy tính dùng làm bài tập. Viết hai câu, một câu dùng 笔记本 và một câu dùng đầy đủ 笔记本电脑 để tránh nhầm.',
  model:triple('我在笔记本上记生词，用笔记本电脑做作业。','Wǒ zài bǐjìběn shàng jì shēngcí, yòng bǐjìběn diànnǎo zuò zuòyè.','Tôi ghi từ mới vào sổ tay và dùng máy tính xách tay làm bài tập.'),
  rubric:['Ngữ cảnh viết vào sổ giấy rõ ràng.','Viết đủ 笔记本电脑 khi nói máy tính; diễn đạt khác đúng nghĩa vẫn phù hợp.']},
 {wordId:'hsk-vocab-00523',word:'比如',lessonId:'hsk3-study-work-accounts-courses-learning',
  title:'Nêu một ví dụ đúng với ý khái quát',
  note:'比如 (bǐrú) nghĩa là “ví dụ như/chẳng hạn”, dẫn một hoặc vài trường hợp minh họa cho ý vừa nêu. Ví dụ phải thuộc nhóm đó; không biến một ví dụ thành danh sách đầy đủ. 比 như trong 比我高 dùng so sánh; 比如 không có chức năng ấy. Có thể theo sau 比如 bằng danh từ hoặc cả mệnh đề.',
  examples:[triple('复习的方法很多，比如先读课文，再用自己的话说一遍。','Fùxí de fāngfǎ hěn duō, bǐrú xiān dú kèwén, zài yòng zìjǐ de huà shuō yí biàn.','Có nhiều cách ôn tập, chẳng hạn đọc bài trước rồi kể lại một lượt bằng lời của mình.'),triple('我喜欢球类运动，比如篮球和足球。','Wǒ xǐhuan qiúlèi yùndòng, bǐrú lánqiú hé zúqiú.','Tôi thích các môn thể thao với bóng, ví dụ bóng rổ và bóng đá.')],
  prompt:'Câu nào minh họa hợp lý cho “có nhiều cách ôn tập”?',options:['复习的方法很多，比如今天星期二。','复习的方法很多，比如她比我高。','复习的方法很多，比如用新词写句子。'],answer:2,
  explanation:'Dùng từ mới viết câu là một cách ôn. Thứ trong tuần và chiều cao không minh họa cho nhóm “cách ôn tập”.',
  transfer:'Gợi ý cho một người bạn về hoạt động cuối tuần: nêu một nhóm hoạt động và hai ví dụ phù hợp bằng 比如. Đổi khỏi ngữ cảnh học tập; đừng nói chỉ có hai lựa chọn ấy.',
  model:triple('周末可以做一些运动，比如游泳和打篮球。','Zhōumò kěyǐ zuò yìxiē yùndòng, bǐrú yóuyǒng hé dǎ lánqiú.','Cuối tuần có thể vận động, chẳng hạn bơi và chơi bóng rổ.'),
  rubric:['Có nhóm khái quát và ví dụ thật sự thuộc nhóm.','Dùng 比如 để minh họa, không để so sánh; không coi ví dụ là toàn bộ lựa chọn.']},
];
export function supplementVocabularyContext(source,decision,round='r1'){
 const d=decision??contextDecisions.find(d=>d.lessonId===source.targetLessonId);
 if(!d||d.lessonId!==source.targetLessonId||!(d.wordIds??[d.wordId]).every(id=>source.sourceVocabularyIds.includes(id)))throw Error('Unexpected lesson/word binding');
 const prefix=`${d.lessonId}:vocab-context-${round}`;
 if(source.lessonPages.pages.some(p=>p.id.startsWith(prefix)))throw Error('Already supplemented');
 const b=(suffix,kind,title,body='',value={})=>({id:`${prefix}:${suffix}`,kind,title,body,hanzi:'',pinyin:'',meaningVi:'',imageSrc:'',alt:'',provenance:'',...value});
 const target={objective:d.title,skill:'vocabulary',sources:(d.wordIds??[d.wordId]).map(id=>({kind:'vocabulary',id}))};
 const page=(suffix,stage,title,blocks)=>({id:`${prefix}:page:${suffix}`,stage,title,layout:stage==='understand'?'split':'workshop',blocks});
 const teach=page('teach','understand',d.title,[b('note','explanation',d.word,d.note),...d.examples.map((e,i)=>b(`example-${i}`,'dialogue',`Mẫu ${i+1}`,'',e))]);
 const practice=page('practice','practice',`Khảo Luyện · hiểu ${d.word}`,[b('choice','activity','Chọn theo ngữ cảnh',d.prompt,{activity:{type:'choice',options:d.options.map((text,i)=>({id:`o-${i}`,text,feedback:i===d.answer?d.explanation:'Đối chiếu lại nghĩa và dữ kiện trong câu.'})),answerIds:[`o-${d.answer}`],acceptedAnswers:[],rubric:[],hint:'',explanation:d.explanation,learningTarget:target}})]);
 const transfer=page('transfer','transfer',`Vận dụng ${d.word} trong tình huống mới`,[b('write','activity','Tự viết trước khi xem mẫu',d.transfer,{activity:{type:'rubric',options:[],answerIds:[],acceptedAnswers:[],hint:'',rubric:d.rubric.map((label,i)=>({id:`r-${i}`,label,guidance:label})),explanation:`Một cách diễn đạt:\n${d.model.hanzi}\n${d.model.pinyin}\n${d.model.meaningVi}\n${d.rubric.join('\n')}\nTự đối chiếu không phải điểm viết độc lập.`,learningTarget:{...target,skill:'writing'}}})]);
 const out=structuredClone(source); const idx=out.lessonPages.pages.findIndex(p=>p.stage==='practice');
 out.lessonPages.pages.splice(idx<0?out.lessonPages.pages.length:idx,0,teach,practice);
 out.lessonPages.pages.push(transfer); out.review={...out.review,humanReviewed:false}; return out;
}
