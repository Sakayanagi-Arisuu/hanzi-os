import type {SurvivalManuscript} from './survival-batch-manuscripts';
export const studyWorkManuscripts:SurvivalManuscript[]=[{
 id:'hsk2-study-work-culture-lesson-01',focus:'Kể quá trình học và chỉ đúng phần chưa hiểu',
 scene:'Tiểu An bắt đầu học tiếng Trung hai năm trước, hiện học ba buổi mỗi tuần. Bài tập hôm qua đã làm hết nhưng còn hai câu chưa hiểu. Em cần hỏi giáo viên về hai câu ấy; làm xong không đồng nghĩa làm đúng hoặc hiểu hết.',
 support:'以前 yǐqián: trước đây · 每周 měi zhōu: mỗi tuần · 道 dào: lượng từ câu bài tập · 再 zài: lại lần tới · 把题记在本子上 bǎ tí jì zài běnzi shàng: ghi câu hỏi vào vở, dùng cả cụm hỗ trợ trong bài này.',
 rule:'从…开始学 nêu điểm bắt đầu. 学了两年 nêu thời lượng; 每周三次 nêu tần suất, không phải đã học ba năm.\n做完了 nói hoàn tất hành động; 看懂了 nói đã hiểu khi đọc. 我做完了，但是有两道题没看懂 giữ được hai sự thật cùng lúc. Không suy 已经 làm người nói đúng hết.\n教 đọc jiāo khi là động từ dạy trong 老师教我们汉语. 问题 thường là vấn đề/câu hỏi; 两道题 đếm câu bài tập. Nói cụ thể 哪两道题 chưa hiểu giúp người nghe hỗ trợ đúng chỗ.',
 pitfall:'Thời lượng học không chứng minh trình độ; làm đủ câu không chứng minh hiểu. 没看懂 không giữ 了 ngay sau 懂 trong mẫu phủ định này.',
 dialogue:[
 ['你什么时候开始学汉语的？','Nǐ shénme shíhou kāishǐ xué Hànyǔ de?','Bạn bắt đầu học tiếng Trung khi nào?'],
 ['两年前开始的，现在每周上三次课。','Liǎng nián qián kāishǐ de, xiànzài měi zhōu shàng sān cì kè.','Bắt đầu hai năm trước, hiện học ba buổi mỗi tuần.'],
 ['昨天的练习做完了吗？','Zuótiān de liànxí zuòwán le ma?','Bạn làm xong bài luyện hôm qua chưa?'],
 ['做完了，但是有两道题没看懂。','Zuòwán le, dànshì yǒu liǎng dào tí méi kàndǒng.','Làm xong rồi, nhưng có hai câu tôi chưa hiểu.'],
 ['你准备怎么办？','Nǐ zhǔnbèi zěnme bàn?','Bạn định làm gì?'],
 ['我把题记在本子上，下次上课问老师。','Wǒ bǎ tí jì zài běnzi shàng, xià cì shàngkè wèn lǎoshī.','Tôi ghi câu hỏi vào vở, buổi sau hỏi giáo viên.']],
 question:'Điều nào đúng với Tiểu An?',choices:[['他每周上两次课，已经全懂了。','Đã đổi ba thành hai và suy hiểu hết từ việc làm xong.'],['他做完了练习，但还有两道题没看懂。','Đúng: hoàn thành bài và hiểu bài là hai điều khác nhau.'],['他还没做完练习。','Đề nói đã làm hết; chưa hiểu không đồng nghĩa chưa làm xong.']],answer:1,
 transfer:'Vai mới bắt đầu sáu tháng trước, học hai buổi mỗi tuần; đã làm hết bài nhưng câu số ba chưa hiểu. Viết sáu lượt hỏi/đáp về lịch sử, tần suất, khó khăn và việc sẽ làm. Không dùng dữ kiện hai năm/ba buổi của mẫu.',
 model:['A：你什么时候开始学汉语的？ B：六个月前开始的。 A：每周上几次课？ B：两次。 A：练习做完了吗？ B：做完了，但是第三题没看懂。我准备问老师。','A: Nǐ shénme shíhou kāishǐ xué Hànyǔ de? B: Liù ge yuè qián kāishǐ de. A: Měi zhōu shàng jǐ cì kè? B: Liǎng cì. A: Liànxí zuòwán le ma? B: Zuòwán le, dànshì dì sān tí méi kàndǒng. Wǒ zhǔnbèi wèn lǎoshī.','Bắt đầu sáu tháng trước, học hai buổi mỗi tuần, làm xong nhưng chưa hiểu câu ba và định hỏi giáo viên.'],
 criteria:['Phân biệt sáu tháng với hai buổi mỗi tuần.','Giữ trạng thái đã làm xong.','Nói rõ câu ba chưa hiểu, không khẳng định hiểu hết.','Có bước hỏi giáo viên và ít nhất sáu lượt.']
},{
 id:'hsk2-study-work-culture-lesson-02',focus:'Đọc lịch trường và sắp xếp việc sau giờ học',
 scene:'Trường khai giảng thứ hai tuần sau. Ngày đầu, lớp ở tầng hai: bắt đầu 8:30, kết thúc 10:00. Vẽ ở phòng đó từ 10:15. Người học phân biệt ngày khai giảng với giờ bắt đầu một tiết và có 15 phút chuyển hoạt động.',
 support:'楼 lóu: tầng · 结束 jiéshù: kết thúc · 带 dài: mang theo · 以后 yǐhòu: sau khi · 先…再… xiān…zài…: trước…rồi…',
 rule:'开学 nói bắt đầu học kỳ/năm học. 开始上课 nói bắt đầu buổi/tiết học; không dùng một giờ để thay một ngày trong câu trả lời.\n下课以后 là sau khi kết thúc giờ học. 先拿本子，再画画 sắp thứ tự; không khẳng định hai hành động đã xảy ra. 从书包里拿出本子 diễn đạt lấy vở từ trong cặp ra.\nĐọc lịch cần gắn từng giờ với đúng hoạt động: 8:30 học, 10:00 tan, 10:15 vẽ. 教室 đọc jiàoshì; 教 dạy trong bài trước đọc jiāo, không ép một cách đọc cho mọi từ.',
 pitfall:'Khai giảng không có nghĩa lúc nào cũng bắt đầu học vào 8:30; đây là lịch của ngày đầu đã cho.',
 dialogue:[
 ['你们什么时候开学？','Nǐmen shénme shíhou kāixué?','Trường bạn khi nào khai giảng?'],
 ['下周一。第一天八点半开始上课。','Xià zhōu yī. Dì yī tiān bā diǎn bàn kāishǐ shàngkè.','Thứ hai tuần sau. Ngày đầu bắt đầu học lúc 8:30.'],
 ['教室在哪儿？几点下课？','Jiàoshì zài nǎr? Jǐ diǎn xiàkè?','Lớp ở đâu? Mấy giờ tan học?'],
 ['在二楼，十点下课。十点一刻在教室画画。','Zài èr lóu, shí diǎn xiàkè. Shí diǎn yí kè zài jiàoshì huàhuà.','Ở tầng hai, 10 giờ tan học. 10:15 vẽ tại lớp.'],
 ['我需要带什么？','Wǒ xūyào dài shénme?','Tôi cần mang gì?'],
 ['带本子和笔。下课以后，先休息，再画画。','Dài běnzi hé bǐ. Xiàkè yǐhòu, xiān xiūxi, zài huàhuà.','Mang vở và bút. Sau giờ học, nghỉ trước rồi vẽ.']],
 question:'Lịch nào đúng cho ngày đầu?',choices:[['八点半上课，十点下课，十点一刻画画。','Đúng: giữ thứ tự và khoảng nghỉ 15 phút.'],['十点一刻开始上课。','10:15 là giờ vẽ, không phải bắt đầu lớp.'],['下周二开学。','Đã đổi thứ hai thành thứ ba.']],answer:0,
 transfer:'Lịch mới: thứ ba tuần sau khai giảng; lớp tầng ba, 9:00–10:30; đọc sách ở thư viện lúc 11:00. Mang sách và bút. Viết sáu lượt để xác nhận ngày, phòng, giờ và việc sau lớp.',
 model:['A：什么时候开学？ B：下周二，九点开始上课。 A：教室在哪儿？ B：在三楼，十点半下课。 A：下课以后做什么？需要带什么？ B：十一点去图书馆看书，带书和笔。','A: Shénme shíhou kāixué? B: Xià zhōu èr, jiǔ diǎn kāishǐ shàngkè. A: Jiàoshì zài nǎr? B: Zài sān lóu, shí diǎn bàn xiàkè. A: Xiàkè yǐhòu zuò shénme? Xūyào dài shénme? B: Shíyī diǎn qù túshūguǎn kàn shū, dài shū hé bǐ.','Thứ ba khai giảng, lớp tầng ba học 9:00–10:30; 11 giờ đọc sách ở thư viện, mang sách và bút.'],
 criteria:['Đúng thứ ba và tầng ba.','Giữ giờ học 9:00–10:30.','Đọc ở thư viện 11:00, không giữ hoạt động vẽ.','Nêu đồ cần mang và đủ sáu lượt.']
},{
 id:'hsk2-study-work-culture-lesson-03',focus:'Tách nghề nghiệp, việc đang làm và việc đã xong',
 scene:'Nhân vật giả định là giáo viên ở trường có 120 giáo viên và 10.000 học sinh. Hiện người đó đang chuẩn bị tiết chiều, chưa bắt đầu dạy tiết ấy. Con số học sinh không phải số giáo viên.',
 support:'准备 zhǔnbèi: chuẩn bị · 学生 xuésheng: học sinh · 一万 yí wàn: mười nghìn · 名 míng: lượng từ người trong ngữ cảnh trang trọng · 当老师 dāng lǎoshī: làm giáo viên · 文章 wénzhāng: bài viết · 这份工作 zhè fèn gōngzuò: công việc này.',
 rule:'在学校工作 nêu nơi làm việc, không tự cho biết đang làm gì lúc này. 正/正在 + động từ nói đang diễn ra: 正准备下午的课 không phải 已经上完课.\n一百二十 là 120; 一万 là 10.000. Danh từ sau số rất quan trọng: 一百二十名老师 khác 一万名学生. 名 ở đây đếm người, không phải 名字 tên.\n我觉得… nêu cảm nhận cá nhân. Công việc 忙 bận không tự bằng 不快乐 không vui. Khi hỏi người khác, hỏi tiếp nhiệm vụ cụ thể thay vì suy từ nghề nghiệp.',
 pitfall:'Chuẩn bị tiết học chưa phải đang dạy hoặc đã dạy xong. Không đổi nhóm được đếm chỉ vì nhớ đúng con số.',
 dialogue:[
 ['你在哪儿工作？','Nǐ zài nǎr gōngzuò?','Bạn làm việc ở đâu?'],
 ['我在一所学校当老师。','Wǒ zài yì suǒ xuéxiào dāng lǎoshī.','Tôi làm giáo viên ở một trường.'],
 ['学校有多少名老师和学生？','Xuéxiào yǒu duōshao míng lǎoshī hé xuésheng?','Trường có bao nhiêu giáo viên và học sinh?'],
 ['有一百二十名老师，一万名学生。','Yǒu yì bǎi èrshí míng lǎoshī, yí wàn míng xuésheng.','Có 120 giáo viên và 10.000 học sinh.'],
 ['你现在忙什么事情？','Nǐ xiànzài máng shénme shìqing?','Bây giờ bạn bận việc gì?'],
 ['我正准备下午的课。工作很忙，但是我很快乐。','Wǒ zhèng zhǔnbèi xiàwǔ de kè. Gōngzuò hěn máng, dànshì wǒ hěn kuàilè.','Tôi đang chuẩn bị tiết chiều. Công việc bận nhưng tôi vui.']],
 question:'Câu nào đúng về công việc hiện tại và quy mô trường?',choices:[['学校有一万名老师。','10.000 là số học sinh, không phải giáo viên.'],['他已经上完下午的课了。','Đang chuẩn bị chưa phải đã dạy xong.'],['他正准备下午的课，学校有一百二十名老师。','Đúng: giữ trạng thái đang chuẩn bị và đúng nhóm được đếm.']],answer:2,
 transfer:'Vai mới là giáo viên ở trường có 80 giáo viên và 2.000 học sinh. Đang đọc bài viết của học sinh để chuẩn bị cho ngày mai. Bận nhưng thích công việc. Viết sáu lượt, giữ đúng số và trạng thái.',
 model:['A：你在哪儿工作？ B：我在一所学校当老师。 A：学校有多少名老师和学生？ B：八十名老师，两千名学生。 A：你现在忙什么？ B：我正在看学生写的文章，准备明天的课。我很忙，但是很喜欢这份工作。','A: Nǐ zài nǎr gōngzuò? B: Wǒ zài yì suǒ xuéxiào dāng lǎoshī. A: Xuéxiào yǒu duōshao míng lǎoshī hé xuésheng? B: Bāshí míng lǎoshī, liǎng qiān míng xuésheng. A: Nǐ xiànzài máng shénme? B: Wǒ zhèngzài kàn xuésheng xiě de wénzhāng, zhǔnbèi míngtiān de kè. Wǒ hěn máng, dànshì hěn xǐhuan zhè fèn gōngzuò.','Giáo viên ở trường 80 giáo viên/2.000 học sinh, đang đọc bài và chuẩn bị tiết ngày mai; bận nhưng thích công việc.'],
 criteria:['Giữ đúng 80 giáo viên/2.000 học sinh.','正在 nói đang đọc, không phải đã đọc xong.','Nêu chuẩn bị cho ngày mai.','Tách bận với cảm nhận thích công việc.']
},{
 id:'hsk2-study-work-culture-lesson-04',focus:'Kể trải nghiệm Tết, tránh khái quát phong tục',
 scene:'Lý Minh kể một lần đón Tết tại nhà bạn ở Bắc Kinh, cùng gia đình ấy ăn sủi cảo. Đây là trải nghiệm một gia đình, không phải quy tắc mọi người Trung Quốc đều làm giống nhau. Người nghe chưa đón Tết tại Trung Quốc và dự định đi năm sau.',
 support:'春节 Chūnjié: Tết Nguyên đán · 饺子 jiǎozi: sủi cảo · 每家 měi jiā: mỗi gia đình · 不一定 bù yídìng: không nhất thiết · 打算 dǎsuàn: dự định.',
 rule:'过年 là đón năm mới/Tết theo ngữ cảnh này. 过过年 có 过 thứ nhất là động từ guò, thứ hai là trợ từ trải nghiệm nhẹ guo. 没过过 phủ định chưa từng có trải nghiệm.\n打算明年去 chỉ dự định, chưa thành đã đi. 生日快乐 chúc sinh nhật; 新年快乐 chúc năm mới. Không hoán đổi lời chúc khi ngày lễ đã rõ.\nKể phong tục nên giữ phạm vi 我朋友家… và thừa nhận 每家的习惯不一定一样. Một bữa sủi cảo không chứng minh mọi nhà, mọi vùng đều ăn sủi cảo.',
 pitfall:'Trải nghiệm cá nhân không đại diện cả quốc gia; câu “định đi” không phải “đã từng đi”.',
 dialogue:[
 ['你在中国过过年吗？','Nǐ zài Zhōngguó guòguo nián ma?','Bạn từng đón Tết ở Trung Quốc chưa?'],
 ['过过。去年我在北京的朋友家过年。','Guòguo. Qùnián wǒ zài Běijīng de péngyou jiā guònián.','Rồi. Năm ngoái tôi đón Tết ở nhà bạn tại Bắc Kinh.'],
 ['你们吃了什么？','Nǐmen chī le shénme?','Các bạn đã ăn gì?'],
 ['我们一起吃了饺子，很快乐。','Wǒmen yìqǐ chī le jiǎozi, hěn kuàilè.','Chúng tôi cùng ăn sủi cảo, rất vui.'],
 ['每家都吃饺子吗？','Měi jiā dōu chī jiǎozi ma?','Nhà nào cũng ăn sủi cảo à?'],
 ['不一定，每家的习惯不一定一样。你呢？','Bù yídìng, měi jiā de xíguàn bù yídìng yíyàng. Nǐ ne?','Không nhất thiết, thói quen mỗi nhà không nhất thiết giống nhau. Còn bạn?'],
 ['我没在中国过过年，打算明年去。','Wǒ méi zài Zhōngguó guòguo nián, dǎsuàn míngnián qù.','Tôi chưa từng đón Tết ở Trung Quốc, định năm sau đi.']],
 question:'Kết luận nào giữ đúng phạm vi trải nghiệm?',choices:[['他在朋友家吃了饺子，不是说每家都一样。','Đúng: giữ trải nghiệm nhà bạn, không khái quát cả nước.'],['中国每家过年都只吃饺子。','Tự thêm mọi nhà và chỉ ăn; hội thoại không nói vậy.'],['他的朋友已经去过中国过年。','Người nghe nói chưa từng và chỉ dự định đi.']],answer:0,
 transfer:'Vai mới chưa đón Tết ở Trung Quốc, dự định năm sau đến nhà bạn ở Thượng Hải. Bạn kể nhà mình thường ăn cơm cùng nhau ngày Tết, nhưng không biết nhà người bạn ăn gì. Viết sáu lượt, hỏi thay vì đoán phong tục nhà bạn.',
 model:['A：你在中国过过年吗？ B：没过过，打算明年去上海的朋友家。 A：你家过年做什么？ B：我们一起吃饭。 A：你朋友家吃什么？ B：我还不知道，准备问问他。每家的习惯不一定一样。','A: Nǐ zài Zhōngguó guòguo nián ma? B: Méi guòguo, dǎsuàn míngnián qù Shànghǎi de péngyou jiā. A: Nǐ jiā guònián zuò shénme? B: Wǒmen yìqǐ chīfàn. A: Nǐ péngyou jiā chī shénme? B: Wǒ hái bù zhīdào, zhǔnbèi wènwen tā. Měi jiā de xíguàn bù yídìng yíyàng.','Chưa từng đón Tết ở Trung Quốc; dự định đến nhà bạn ở Thượng Hải. Nhà mình cùng ăn cơm, còn nhà bạn thì chưa biết nên sẽ hỏi.'],
 criteria:['Giữ chưa từng và dự định năm sau.','Đúng Thượng Hải, không giữ Bắc Kinh.','Không tự gán món sủi cảo cho nhà bạn.','Hỏi về điều chưa biết, không khái quát mọi gia đình.']
},{
 id:'hsk2-study-work-culture-lesson-05',focus:'Hỏi họ và xác nhận cách xưng hô phù hợp',
 scene:'Tại buổi gặp giáo viên mới, một người giới thiệu họ Trần, tên đầy đủ Trần Vũ. Người học hỏi có thể gọi là thầy/cô Trần không. Chức danh dựa trên vai trò đã biết và sự đồng ý, không tự gán mọi người là giáo viên.',
 support:'贵姓 guìxìng: cách lịch sự hỏi họ · 称呼 chēnghu: gọi/xưng hô · 陈雨 Chén Yǔ: Trần Vũ, tên giả định · 医生 yīshēng: bác sĩ.',
 rule:'您贵姓？ hỏi họ, không phải toàn bộ họ tên. Tôi trả lời 我姓陈, không tự nói 我贵姓陈. 姓名 là họ tên đầy đủ, thường gặp trên biểu mẫu; 我叫陈雨 tự nhiên khi giới thiệu miệng.\nHọ + chức danh: 陈老师 nếu người đó là giáo viên; 王医生 nếu là bác sĩ. Hỏi 我可以这样称呼您吗？ để xác nhận, và tôn trọng cách người đó muốn được gọi.\n这样 chỉ cách đang nói đến. 这么 trong 这么称呼 chỉ gọi như thế này. Không dịch chúng thành mọi nghĩa của nhau ngoài ngữ cảnh.',
 pitfall:'Không dùng 贵 để tự tôn xưng họ mình. Không coi 贵姓 là câu bắt người khác khai toàn bộ danh tính thật; bài dùng nhân vật giả định.',
 dialogue:[
 ['您好，请问您贵姓？','Nín hǎo, qǐngwèn nín guìxìng?','Xin chào, xin hỏi thầy/cô họ gì?'],
 ['我姓陈，叫陈雨。','Wǒ xìng Chén, jiào Chén Yǔ.','Tôi họ Trần, tên đầy đủ là Trần Vũ.'],
 ['我可以叫您陈老师吗？','Wǒ kěyǐ jiào nín Chén lǎoshī ma?','Tôi có thể gọi thầy/cô là thầy/cô Trần không?'],
 ['可以，这么称呼就好。','Kěyǐ, zhème chēnghu jiù hǎo.','Được, gọi như vậy là được.'],
 ['“贵姓”是什么意思？','“Guìxìng” shì shénme yìsi?','“Guìxìng” nghĩa là gì?'],
 ['是问别人的姓。说自己的姓时，用“我姓陈”就可以。','Shì wèn biéren de xìng. Shuō zìjǐ de xìng shí, yòng “wǒ xìng Chén” jiù kěyǐ.','Là hỏi họ người khác. Khi nói họ mình, dùng “Tôi họ Trần” là được.']],
 question:'Người mới là bác sĩ họ Vương, chưa cho biết tên đầy đủ. Câu nào hỏi cách gọi mà không tự bịa danh tính?',choices:[['您叫王小明，我叫您王老师。','Tự thêm tên Tiểu Minh và nghề giáo viên, trái dữ kiện.'],['我可以叫您王医生吗？','Đúng: dùng họ và nghề đã biết, hỏi để xác nhận.'],['我贵姓王。','Đây là tự nói họ mình với kính ngữ không phù hợp, không hỏi cách gọi người kia.']],answer:1,
 transfer:'Gặp bác sĩ giả định họ Lý, tên đầy đủ Lý Lan. Viết sáu lượt hỏi họ, tên, xác nhận cách gọi 李医生 và nhận lời đồng ý. Không giữ họ Trần/chức danh giáo viên của mẫu.',
 model:['A：您好，请问您贵姓？ B：我姓李。 A：请问您怎么称呼？ B：我叫李兰。 A：我可以叫您李医生吗？ B：可以，这样称呼就好。','A: Nín hǎo, qǐngwèn nín guìxìng? B: Wǒ xìng Lǐ. A: Qǐngwèn nín zěnme chēnghu? B: Wǒ jiào Lǐ Lán. A: Wǒ kěyǐ jiào nín Lǐ yīshēng ma? B: Kěyǐ, zhèyàng chēnghu jiù hǎo.','Hỏi họ Lý, tên Lý Lan, xin gọi là bác sĩ Lý và được đồng ý.'],
 criteria:['贵姓 hỏi họ, trả lời 我姓李.','Tên đầy đủ Lý Lan, không tự thêm tên khác.','Dùng 李医生 theo nghề đã cho.','Có xin phép cách gọi và lượt đồng ý.']
}];
