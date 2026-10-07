const t=(hanzi,pinyin,meaningVi)=>({hanzi,pinyin,meaningVi});
const q=(prompt,options,answer,explanation)=>({prompt,options,answer,explanation});
export const cohesionGroups44={
 '02':[
 {row:'hsk4-grammar-row-066',title:'不是……而是……: sửa một cách hiểu',
 note:'不是A，而是B bác cách hiểu A và xác định B. A/B cần cùng loại: hai người, hai tiêu chí hoặc hai hành động. Mẫu không chỉ thêm ý như 不但/不仅. Có thể sửa chủ thể: 不是我，而是他; hoặc hành động: 我不是来买东西，而是来取快递. Trong bài đọc, tiêu chí xếp hồ sơ là hình thức chứ không phải giá trị; điều đó không phủ nhận mọi vai trò của giá trị nghệ thuật.',
 examples:[t('分类依据不是作品的价值，而是主要表达形式。','Fēnlèi yījù bú shì zuòpǐn de jiàzhí, ér shì zhǔyào biǎodá xíngshì.','Tiêu chí phân loại không phải giá trị tác phẩm mà là hình thức biểu đạt chính.'),t('不是我通知的，而是小林通知的。','Bú shì wǒ tōngzhī de, ér shì Xiǎolín tōngzhī de.','Không phải tôi thông báo mà là Tiểu Lâm thông báo.')],
 questions:[q('Bạn đến nhận hàng, không đến mua. Chọn câu đúng ý.',['我不仅来买东西，而且来取快递。','我不是来买东西，而是来取快递。','我既买东西，又取快递。'],1,'不是…而是 sửa mục đích bị hiểu sai; hai câu kia giữ cả việc mua.'),q('“不是作品的价值，而是主要表达形式” có nghĩa giá trị nghệ thuật luôn vô ích không?',['Không; chỉ sửa tiêu chí phân loại ở đây','Có; phủ nhận giá trị ở mọi việc','Có; mọi tác phẩm như nhau'],0,'Phủ định nằm trong tiêu chí đang bàn, không mở rộng sang mọi mục đích.')],
 transfer:'Tình huống mới ở thư viện: bạn cần gia hạn sách, không phải trả sách hôm nay. Viết câu sửa hiểu lầm của nhân viên.',
 model:t('我今天不是来还书，而是来续借的。','Wǒ jīntiān bú shì lái huán shū, ér shì lái xùjiè de.','Hôm nay tôi đến để gia hạn mượn, không phải để trả sách.'),rubric:['Phủ định trả sách hôm nay, xác định gia hạn.','Hai vế đều là mục đích tới thư viện.','Không dùng mẫu vừa…vừa khiến cả hai mục đích thành thật.']},
 {row:'hsk4-grammar-row-067',title:'既……又/也……: hai mặt cùng tồn tại',
 note:'既…又… hoặc 既…也… nối hai tính chất, việc làm hay yêu cầu cùng tồn tại. Với cùng chủ thể, thường đặt chủ thể trước 既: 这间房既安静又明亮. Hai vế nên song song về cấu trúc. Không dùng để bắt chọn một như 或者…或者…; hai tính chất cũng không nhất thiết trái ngược. Phân biệt 既然…就… nêu tiền đề và kết luận.',
 examples:[t('这间房既安静又明亮。','Zhè jiān fáng jì ānjìng yòu míngliàng.','Phòng này vừa yên tĩnh vừa sáng.'),t('演出既需要艺术安排，也需要安全保障。','Yǎnchū jì xūyào yìshù ānpái, yě xūyào ānquán bǎozhàng.','Buổi diễn vừa cần sắp xếp nghệ thuật vừa cần bảo đảm an toàn.')],
 questions:[q('既安静又明亮 nói gì?',['Chỉ được chọn yên tĩnh hoặc sáng','Yên tĩnh gây ra sáng','Cùng có hai đặc điểm'],2,'既…又… xác nhận cả hai mặt.'),q('Chọn cấu trúc nêu hai yêu cầu đồng thời.',['既需要准备，也需要合作。','既然准备，又合作。','或者准备，既合作。'],0,'既…也… nối hai cụm 需要 song song; 既然 dùng cho tiền đề.')],
 transfer:'Một ứng dụng mới vừa giúp tra từ vừa ghi lại ghi chú. Viết một câu 既…又/也… với chủ thể rõ.',
 model:t('这个应用既能查词，也能保存笔记。','Zhè ge yìngyòng jì néng chá cí, yě néng bǎocún bǐjì.','Ứng dụng này vừa tra từ được vừa lưu ghi chú được.'),rubric:['Cùng chủ thể ứng dụng trước 既.','Hai vế 能 + động từ song song.','Không biến hai tính năng thành lựa chọn loại trừ nhau.']},
 {row:'hsk4-grammar-row-068',title:'一方面……另一方面……: cân nhắc hai mặt',
 note:'Dùng để triển khai hai mặt liên quan của một vấn đề: hai lợi ích, hai lý do, hoặc thuận lợi và hạn chế. Không tự nói việc trước/sau theo thời gian; cũng không bắt hai mặt có trọng số bằng nhau. Có thể đặt ở đầu hai vế và lặp chủ thể khi cần. Trong lập luận, nêu hai mặt rồi đưa kết luận của mình, tránh dùng một mặt xóa mặt kia.',
 examples:[t('一方面，网上开会节省路上的时间；另一方面，讨论有时不够方便。','Yì fāngmiàn, wǎngshàng kāi huì jiéshěng lùshang de shíjiān; lìng yì fāngmiàn, tǎolùn yǒushí bú gòu fāngbiàn.','Một mặt, họp mạng tiết kiệm thời gian đi lại; mặt khác, đôi lúc thảo luận chưa thuận tiện.'),t('我们一方面整理旧资料，另一方面收集新意见。','Wǒmen yì fāngmiàn zhěnglǐ jiù zīliào, lìng yì fāngmiàn shōují xīn yìjiàn.','Chúng tôi một mặt sắp tài liệu cũ, mặt khác thu ý kiến mới.')],
 questions:[q('“一方面整理资料，另一方面收集意见” có bắt buộc thu ý kiến sau khi xếp xong không?',['Có, nhất định sau','Không; nêu hai mặt công việc','Có, sau đúng một ngày'],1,'Hai mặt công việc không tự tạo thứ tự thời gian.'),q('Muốn cân nhắc nhà mới gần chỗ làm nhưng tiền thuê cao, mẫu nào thích hợp?',['一方面…另一方面…','先…才终于…','不是近，而是不近'],0,'Mẫu hai mặt giữ cả lợi ích vị trí và hạn chế chi phí.')],
 transfer:'Bạn cân nhắc khóa học: giờ học hợp lịch nhưng học phí khá cao. Viết hai mặt và một bước quyết định hợp lý; đây là tình huống mới.',
 model:t('一方面，上课时间合适；另一方面，学费比较高。我想先了解课程内容，再决定。','Yì fāngmiàn, shàng kè shíjiān héshì; lìng yì fāngmiàn, xuéfèi bǐjiào gāo. Wǒ xiǎng xiān liǎojiě kèchéng nèiróng, zài juédìng.','Một mặt, giờ học phù hợp; mặt khác học phí khá cao. Tôi muốn tìm hiểu nội dung rồi quyết định.'),rubric:['Giữ cả giờ phù hợp và phí cao.','Hai mặt không tự thành quan hệ nhân quả.','Bước tìm hiểu là đề nghị, chưa phải kết quả.']}
 ],
 '03':[
 {row:'hsk4-grammar-row-069',title:'首先……其次……: sắp các ý cần xét',
 note:'首先 là trước hết; 其次 là thứ hai/tiếp đến khi trình bày các lý do, tiêu chí hoặc việc cần làm. Có thể kết bằng 最后. Thứ tự diễn đạt không mặc định là mức quan trọng hay nguyên nhân mạnh hơn. Nếu muốn nói hai hành động nối tiếp thực tế, 然后 thường thể hiện quan hệ thời gian rõ hơn. Giữ các ý ở cùng cấp, như chi phí rồi giao thông khi chọn chỗ ở.',
 examples:[t('选房子，首先要看费用，其次要看交通。','Xuǎn fángzi, shǒuxiān yào kàn fèiyong, qícì yào kàn jiāotōng.','Chọn nhà, trước hết cần xem chi phí, tiếp đến xem giao thông.'),t('首先，说明问题；其次，提出方案；最后，回答大家的问题。','Shǒuxiān, shuōmíng wèntí; qícì, tíchū fāng’àn; zuìhòu, huídá dàjiā de wèntí.','Trước hết nêu vấn đề, tiếp đến đề xuất phương án, cuối cùng trả lời câu hỏi.')],
 questions:[q('Trong dàn ý 首先费用，其次交通, chi phí có chắc quan trọng gấp đôi không?',['Có','Không; chưa có trọng số','Có, vì đứng trước'],1,'Thứ tự liệt kê không định lượng tầm quan trọng.'),q('Muốn thêm mục kết thúc sau 首先、其次, chọn từ.',['忽然','从来','最后'],2,'最后 đánh dấu phần cuối của dàn ý hoặc chuỗi.')],
 transfer:'Lập dàn ý chọn điện thoại: xét giá, thời lượng pin, cuối cùng thử thao tác. Viết ba bước với 首先、其次、最后.',
 model:t('首先比较价格，其次了解电池能用多久，最后试一试操作。','Shǒuxiān bǐjiào jiàgé, qícì liǎojiě diànchí néng yòng duō jiǔ, zuìhòu shì yi shì cāozuò.','Trước hết so giá, tiếp đến tìm hiểu pin dùng được bao lâu, cuối cùng thử thao tác.'),rubric:['Ba ý theo thứ tự đã yêu cầu.','Không suy giá là nguyên nhân duy nhất quyết định chất lượng.','Dùng 最后 cho mục kết.']},
 {row:'hsk4-grammar-row-070',title:'首先……然后……: trình tự thực hiện',
 note:'首先/先 đánh dấu bước đầu, 然后 là sau đó. Dùng khi thứ tự hành động có ý nghĩa: đọc hướng dẫn rồi thao tác. 然后 không tự nói hành động trước gây ra kết quả sau; cũng không biến kế hoạch thành việc đã làm. Thêm 打算/准备/将 khi cần giữ kế hoạch tương lai. Có thể thêm 最后 cho bước cuối.',
 examples:[t('请先看说明，然后再打开机器。','Qǐng xiān kàn shuōmíng, ránhòu zài dǎ kāi jīqì.','Hãy đọc hướng dẫn trước rồi mới bật máy.'),t('我们打算首先问清费用，然后报名。','Wǒmen dǎsuàn shǒuxiān wèn qīng fèiyong, ránhòu bàomíng.','Chúng tôi định hỏi rõ chi phí trước rồi đăng ký.')],
 questions:[q('“打算先问清费用，然后报名” nói việc đã đăng ký chưa?',['Chưa; đang nêu kế hoạch','Đã đăng ký','Đã đóng đủ tiền'],0,'打算 giữ cả chuỗi là dự định.'),q('Chọn từ nối nhấn sau khi đọc hướng dẫn mới bật máy.',['既然','然后','偶尔'],1,'然后 nối bước sau với bước trước trong trình tự.')],
 transfer:'Bạn dự định nộp hồ sơ: đọc yêu cầu, chuẩn bị giấy tờ, sau cùng gửi. Viết kế hoạch ba bước, không kể như đã gửi.',
 model:t('我打算先读申请要求，然后准备材料，最后提交申请。','Wǒ dǎsuàn xiān dú shēnqǐng yāoqiú, ránhòu zhǔnbèi cáiliào, zuìhòu tíjiāo shēnqǐng.','Tôi định đọc yêu cầu trước, rồi chuẩn bị giấy tờ, cuối cùng nộp hồ sơ.'),rubric:['Có 打算 hoặc cách đánh dấu kế hoạch tương đương.','Giữ đúng ba bước theo thứ tự.','Không viết đã hoàn tất nếu đề chỉ cho dự định.']},
 {row:'hsk4-grammar-row-071',title:'于是: tình huống dẫn tới hành động tiếp',
 note:'于是 nối tình huống đã xảy ra với phản ứng hoặc diễn biến tiếp theo: trời mưa, thế là đổi kế hoạch. So với 然后 chỉ nối thứ tự, 于是 gợi bước sau nảy sinh từ tình huống trước. Không dùng tùy tiện cho mọi quy luật hay suy luận trừu tượng; 因为…所以… phù hợp nhiều quan hệ nguyên nhân chung hơn. Khi tóm tắt, chỉ thêm 于是 nếu nguồn hỗ trợ mối liên hệ ấy.',
 examples:[t('外面下雨了，于是我们改在室内见面。','Wàimian xià yǔ le, yúshì wǒmen gǎi zài shìnèi jiàn miàn.','Ngoài trời mưa rồi, thế là chúng tôi đổi sang gặp trong nhà.'),t('他没带钥匙，于是给家人打了电话。','Tā méi dài yàoshi, yúshì gěi jiārén dǎ le diànhuà.','Anh không mang chìa khóa, thế là gọi cho người nhà.')],
 questions:[q('Ở mẫu quên chìa khóa, 于是 nhấn gì?',['Gọi điện xảy ra trước khi quên','Cuộc gọi là phản ứng tiếp theo với tình huống','Gọi điện mỗi ngày'],1,'Tình huống không có chìa khóa dẫn tới hành động gọi.'),q('Chỉ biết A xảy ra trước B, chưa biết liên hệ. Có nên tự thay 然后 bằng 于是 không?',['Không; 于是 thêm quan hệ dẫn tới phản ứng','Có, hai từ luôn giống nhau','Có, để câu dài hơn'],0,'Phải có căn cứ cho sự dẫn tới, không chỉ trật tự.')],
 transfer:'Bạn tới cửa hàng thì thấy đã đóng cửa, nên gọi cho bạn và đổi nơi hẹn. Viết hai câu hoặc một câu dài với 于是.',
 model:t('我到商店时发现已经关门了，于是给朋友打电话，换了见面的地方。','Wǒ dào shāngdiàn shí fāxiàn yǐjīng guān mén le, yúshì gěi péngyou dǎ diànhuà, huàn le jiàn miàn de dìfang.','Tới cửa hàng tôi thấy đã đóng cửa, thế là gọi bạn và đổi nơi gặp.'),rubric:['Đóng cửa là tình huống dẫn tới thay đổi.','Gọi/đổi chỗ sau khi phát hiện.','Không thêm nguyên nhân cửa hàng đóng nếu đề không cho.']}
 ],
 '04':[
 {row:'hsk4-grammar-row-072',title:'甚至: thêm trường hợp vượt kỳ vọng',
 note:'甚至 = thậm chí, đưa thêm mức độ hoặc trường hợp nổi bật hơn điều vừa nói. Cần có quan hệ tăng tiến hợp lý, không chỉ liệt kê hai việc bất kỳ. Có thể dùng 甚至连…都… để nhấn. Trường hợp “thậm chí” vẫn cần đúng sự thật trong bài đọc; từ này không tự cho phép phóng đại hoặc bịa số liệu.',
 examples:[t('他忙得没时间休息，甚至连午饭都没吃。','Tā máng de méi shíjiān xiūxi, shènzhì lián wǔfàn dōu méi chī.','Anh bận đến không có giờ nghỉ, thậm chí chưa ăn trưa.'),t('这次活动吸引了附近居民，甚至有人从外地赶来。','Zhè cì huódòng xīyǐn le fùjìn jūmín, shènzhì yǒu rén cóng wàidì gǎn lái.','Hoạt động thu hút cư dân gần đó, thậm chí có người từ nơi khác đến.')],
 questions:[q('Trong mẫu người gần/nơi khác đến, 甚至 đánh dấu gì?',['Một trường hợp vượt kỳ vọng thông thường','Mọi người đều ở xa','Người ở xa chắc chắn hài lòng'],0,'Nêu có cả người từ xa, không nói mọi người hoặc mức hài lòng.'),q('Nguồn chỉ nói có cư dân gần đến. Có thêm “甚至有外国游客” được không?',['Được, vì câu hay hơn','Không, khách nước ngoài là dữ kiện chưa có','Được nếu không cho số người'],1,'甚至 vẫn phải có căn cứ cho trường hợp được thêm.')],
 transfer:'Trong tình huống mới đã xác nhận: mưa lớn khiến xe buýt chậm, một số tuyến còn ngừng chạy. Viết tăng tiến với 甚至.',
 model:t('雨太大了，公交车晚点了，甚至有些线路停运了。','Yǔ tài dà le, gōngjiāochē wǎndiǎn le, shènzhì yǒuxiē xiànlù tíngyùn le.','Mưa lớn quá, xe buýt trễ, thậm chí một số tuyến ngừng chạy.'),rubric:['Từ chậm đến ngừng chạy là mức nghiêm trọng hơn.','Giữ “một số tuyến”, không đổi thành toàn bộ.','Chỉ dùng các dữ kiện đã cho.']},
 {row:'hsk4-grammar-row-073',title:'不仅/不光……还/而且……: thêm một mặt nữa',
 note:'不仅 trang trọng hơn 不光; cả hai thường có nghĩa không chỉ. Vế sau 还/而且 bổ sung điều nữa, thường nổi bật hơn. Cùng chủ thể: 他不仅会说，还会写. Khác chủ thể: 不仅他参加了，而且他的同事也参加了; đặt 不仅 trước chủ thể đầu để rõ phạm vi. Không nhầm với 不是…而是…: 不仅 giữ cả A và B, 不是…而是… bác A.',
 examples:[t('她不仅会说汉语，还会写汉字。','Tā bùjǐn huì shuō Hànyǔ, hái huì xiě Hànzì.','Cô ấy không chỉ nói tiếng Trung được mà còn viết chữ Hán được.'),t('不仅小王参加了，而且他的同事也参加了。','Bùjǐn Xiǎowáng cānjiā le, érqiě tā de tóngshì yě cānjiā le.','Không chỉ Tiểu Vương tham gia mà đồng nghiệp anh cũng tham gia.'),t('这里不光卖书，还卖文具。','Zhèlǐ bùguāng mài shū, hái mài wénjù.','Ở đây không chỉ bán sách mà còn bán văn phòng phẩm.')],
 questions:[q('“不光卖书，还卖文具” có bán sách không?',['Không','Có, bán cả hai loại','Chỉ bán văn phòng phẩm'],1,'Không chỉ vẫn giữ việc bán sách.'),q('Hai chủ thể Tiểu Vương và đồng nghiệp cùng tham gia. Câu nào rõ nhất?',['小王不仅参加了，而且参加他的同事。','不是小王，而是没有同事。','不仅小王参加了，而且他的同事也参加了。'],2,'不仅 đứng trước chủ thể đầu khi mở rộng sang chủ thể thứ hai.')],
 transfer:'Thư viện mới cho mượn sách và tổ chức lớp miễn phí. Dùng 不仅/不光…还/而且… để giới thiệu hai dịch vụ.',
 model:t('这家图书馆不仅提供借书服务，还开设免费课程。','Zhè jiā túshūguǎn bùjǐn tígōng jiè shū fúwù, hái kāishè miǎnfèi kèchéng.','Thư viện này không chỉ cho mượn sách mà còn mở lớp miễn phí.'),rubric:['Giữ cả hai dịch vụ.','Chủ thể thư viện đặt trước 不仅 khi dùng chung.','Không đổi miễn phí thành kết quả học đã bảo đảm.']},
 {row:'hsk4-grammar-row-074',title:'并且: nối ý bổ sung, không phải luôn đồng thời',
 note:'并且 = và/và còn, nối các hành động, tính chất hoặc mệnh đề bổ sung. Không bắt buộc diễn ra cùng lúc; 他完成了报告，并且发给了同事 là hoàn thành rồi gửi. Không bắt buộc cùng chủ thể nếu mỗi vế nêu rõ. 和 thường nối danh từ, không thay máy móc 并且 giữa hai mệnh đề. Muốn nhấn trình tự thì dùng 然后; muốn nhấn đồng thời mới dùng 同时 hoặc 一边…一边….',
 examples:[t('他写好了报告，并且发给了同事。','Tā xiě hǎo le bàogào, bìngqiě fā gěi le tóngshì.','Anh viết xong báo cáo và đã gửi cho đồng nghiệp.'),t('这间房很安静，并且离地铁站很近。','Zhè jiān fáng hěn ānjìng, bìngqiě lí dìtiězhàn hěn jìn.','Phòng này yên tĩnh và còn gần ga tàu điện.')],
 questions:[q('并且 trong “写好报告，并且发给同事” có nghĩa viết và gửi đúng cùng một lúc không?',['Có, bắt buộc','Không, chỉ nối thêm hành động','Có, không thể gửi sau'],1,'并且 không tự mã hóa sự đồng thời.'),q('Muốn nói hai đặc điểm phòng yên tĩnh và gần ga, chọn từ nối.',['并且','于是','直到'],0,'并且 nối thêm tính chất; không có diễn tiến dẫn tới kết quả để dùng 于是.')],
 transfer:'Bạn đã đặt vé và gửi thông tin chuyến đi cho gia đình. Viết một câu với 并且, không biến hai việc thành hành động buộc cùng lúc.',
 model:t('我订好了票，并且把行程发给了家人。','Wǒ dìng hǎo le piào, bìngqiě bǎ xíngchéng fā gěi le jiārén.','Tôi đặt vé xong và gửi lịch trình cho người nhà.'),rubric:['并且 nối hai hành động có cùng người thực hiện trong tình huống này.','Không dịch thành bắt buộc đồng thời.','Giữ sự kiện đã làm theo dữ kiện đề.']}
 ]
};
export function deepenCohesion44(source){
 const suffix=source.targetLessonId?.match(/^hsk4-information-order-cohesion-lesson-(02|03|04)$/)?.[1];
 const groups=cohesionGroups44[suffix];if(!groups)return {content:structuredClone(source),changes:[]};
 const out=structuredClone(source),lessonId=out.targetLessonId;
 if(out.lessonPages.pages.some(p=>p.id.includes(':cohesion-r44:')))throw Error('Do not replay');
 const block=(id,kind,title,body='',value={})=>({id,kind,title,body,hanzi:'',pinyin:'',meaningVi:'',imageSrc:'',alt:'',provenance:'',...value});
 for(const [i,g] of groups.entries()){
  const pageId=`${lessonId}:v2:grammar:${i}`,idx=out.lessonPages.pages.findIndex(p=>p.id===pageId);
  if(idx<0||!out.sourceGrammarIds.includes(g.row))throw Error('Missing original grammar page/source');
  const original=out.lessonPages.pages[idx],rule=original.blocks[0],example=original.blocks[1],write=original.blocks[2];
  if(!rule.id.endsWith(`grammar-rule:${i}`)||!write.activity)throw Error('Unexpected original page');
  const prefix=`${lessonId}:cohesion-r44:${i}`;
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

